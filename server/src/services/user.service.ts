import { prisma } from "../lib/prisma";
import { comparePassword, hashPassword } from "../utils/password";

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
