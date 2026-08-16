import { prisma } from "../lib/prisma";
import { comparePassword, hashPassword } from "../utils/password";
import { generateResetToken, hashResetToken } from "../utils/token";

// Phase 19 Frontend Integration audit fix (Priority 3): the permanent
// Demo Workspace (and the separate RBAC demo-role accounts — see
// prisma/seed.ts's DEMO_USERS/RBAC_DEMO_USERS) must survive a real
// visitor clicking "Delete account" while poking around the demo.
// Duplicated here rather than imported (server code can't import from
// prisma/seed.ts, a script, without pulling its `main()` side effects
// in) — kept in sync by hand, same as AVATAR_COLOR_OPTIONS above.
const PROTECTED_DEMO_EMAILS = new Set([
  "demo.owner@orbitdemo.local",
  "demo.pm@orbitdemo.local",
  "demo.dev@orbitdemo.local",
  "demo.designer@orbitdemo.local",
  "owner@orbit.dev",
  "admin@orbit.dev",
  "pm@orbit.dev",
  "member@orbit.dev",
  "viewer@orbit.dev",
]);

export const isProtectedDemoEmail = (email: string): boolean =>
  PROTECTED_DEMO_EMAILS.has(email.trim().toLowerCase());

// How long a password-reset token stays valid.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Phase 18 (self-service profile, approved scope): the same 5-swatch
// palette client/src/data/settingsData.ts's AVATAR_COLOR_OPTIONS defines,
// duplicated here (not imported — client and server are separate
// packages) so avatarBg/avatarFg can be validated as a real pair rather
// than two independently-typeable hex strings. Keep this in sync with
// the frontend palette by hand; there is no shared source of truth.
export const AVATAR_COLOR_OPTIONS = [
  { bg: "#AFC5DA", fg: "#20242B" },
  { bg: "#EEF2F6", fg: "#20242B" },
  { bg: "#20242B", fg: "#F7F8FA" },
  { bg: "#E4E8ED", fg: "#20242B" },
  { bg: "#8EA7BF", fg: "#20242B" },
] as const;

export const isValidAvatarPair = (bg: string, fg: string): boolean =>
  AVATAR_COLOR_OPTIONS.some((option) => option.bg === bg && option.fg === fg);

// The fields returned to the client — every User column except `password`.
// Both getMe and updateMe select exactly this shape so the two endpoints
// stay symmetric and password can never leak through either one.
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  jobTitle: true,
  phone: true,
  location: true,
  bio: true,
  avatarBg: true,
  avatarFg: true,
  createdAt: true,
} as const;

export type PublicUser = {
  id: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarBg: string | null;
  avatarFg: string | null;
  createdAt: Date;
};

export const createUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  return user;
};

export const findPublicUserById = async (userId: string): Promise<PublicUser | null> => {
  return prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT });
};

export type ProfileUpdateInput = Partial<{
  name: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarBg: string | null;
  avatarFg: string | null;
}>;

/**
 * Self-service profile update. `userId` always comes from the
 * authenticated caller's JWT (req.userId) — there is no way to target
 * another user's row through this function, mirroring how Notification's
 * create() only ever writes recipientId = the caller. Partial: only the
 * keys present in `input` are written; omitted keys are left untouched
 * (Prisma simply doesn't include them in `data`).
 */
export const updateProfile = async (userId: string, input: ProfileUpdateInput): Promise<PublicUser> => {
  if (input.email !== undefined) {
    const existing = await findUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new Error("Email already registered");
    }
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: input,
      select: PUBLIC_USER_SELECT,
    });
  } catch (error) {
    // A findUnique+update race (email taken between the check above and
    // this write) surfaces as Prisma's unique-constraint error — collapse
    // it to the same message the pre-check throws so the controller only
    // has one string to branch on.
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new Error("Email already registered");
    }
    throw error;
  }
};

/* ============================================================
   PASSWORD RESET / CHANGE (Phase 19 Frontend Integration audit fix,
   Priority 2)
============================================================ */

/**
 * Starts a password reset for `email`. Always succeeds from the
 * caller's point of view whether or not the email is registered — the
 * controller never reveals which (standard practice, avoids leaking
 * which emails have accounts). Returns the raw token only when a user
 * actually exists; the controller decides whether it's safe to hand
 * that token back in the response (see its doc comment — this project
 * has no email infrastructure to deliver it through instead).
 */
export const requestPasswordReset = async (email: string): Promise<string | null> => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const token = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return token;
};

/**
 * Completes a password reset. Looks the user up by the token's hash
 * (never the raw token) and rejects an expired or unknown one with the
 * same generic error either way, so a caller can't distinguish "no such
 * token" from "expired" (nothing useful to enumerate from that anyway).
 * The token is single-use: a successful reset clears it immediately.
 */
export const resetPasswordWithToken = async (token: string, newPassword: string): Promise<void> => {
  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: tokenHash } });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
};

/**
 * Settings -> Security's "Update password" — requires the caller's
 * current password (unlike a token-based reset, this always runs as an
 * already-authenticated user) so a hijacked, still-open session can't
 * silently lock the real owner out.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const isCurrentValid = await comparePassword(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
};

/* ============================================================
   ACCOUNT DELETION (Phase 19 Frontend Integration audit fix, Priority 3)
============================================================ */

/**
 * Settings -> Danger Zone's "Delete account" — self-service only
 * (`userId` always comes from the caller's own JWT, same guarantee as
 * updateProfile above). Refuses to delete any of the permanent demo
 * accounts (see PROTECTED_DEMO_EMAILS) so the seeded Demo Workspace
 * stays available no matter who clicks the button while exploring it.
 * Every other relation cascades per schema.prisma's own onDelete rules
 * (e.g. WorkspaceMember/ProjectMember/TaskComment/Discussion rows this
 * user owns; assigned tasks/activity events are set to null instead).
 */
export const deleteOwnAccount = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  if (isProtectedDemoEmail(user.email)) {
    throw new Error("Demo accounts can't be deleted");
  }

  await prisma.user.delete({ where: { id: userId } });
};
