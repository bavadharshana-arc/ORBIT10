import type { Request, Response } from "express";
import * as userService from "../services/user.service";

export const getMe = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await userService.findPublicUserById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PATCH /api/users/me — self-service profile update. Always writes to
 * req.userId (set by authMiddleware from the JWT) and never a
 * client-supplied id, so there is no way to edit another user's row.
 * `password`/`id`/`createdAt`/`updatedAt` are never read from the body
 * at all — only the 8 fields below are ever forwarded to the service.
 * Partial: any of these keys may be omitted; only the keys present are
 * validated and written.
 */
export const updateMe = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const body = req.body ?? {};
  const update: userService.ProfileUpdateInput = {};

  if ("name" in body) {
    const { name } = body;
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    update.name = name.trim();
  }

  if ("email" in body) {
    const { email } = body;
    if (typeof email !== "string" || !email.trim() || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ error: "email must be a valid email address" });
    }
    update.email = email.trim();
  }

  for (const field of ["jobTitle", "phone", "location", "bio"] as const) {
    if (field in body) {
      const value = body[field];
      if (value !== null && typeof value !== "string") {
        return res.status(400).json({ error: `${field} must be a string or null` });
      }
      update[field] = value === null ? null : value.trim();
    }
  }

  const hasBg = "avatarBg" in body;
  const hasFg = "avatarFg" in body;

  if (hasBg || hasFg) {
    const { avatarBg, avatarFg } = body;

    if (hasBg && typeof avatarBg !== "string") {
      return res.status(400).json({ error: "avatarBg must be a string" });
    }
    if (hasFg && typeof avatarFg !== "string") {
      return res.status(400).json({ error: "avatarFg must be a string" });
    }

    if (hasBg && !userService.AVATAR_COLOR_OPTIONS.some((option) => option.bg === avatarBg)) {
      return res.status(400).json({ error: "avatarBg must be one of the supported avatar colors" });
    }
    if (hasFg && !userService.AVATAR_COLOR_OPTIONS.some((option) => option.fg === avatarFg)) {
      return res.status(400).json({ error: "avatarFg must be one of the supported avatar colors" });
    }
    if (hasBg && hasFg && !userService.isValidAvatarPair(avatarBg, avatarFg)) {
      return res.status(400).json({ error: "avatarBg and avatarFg must be a matching pair from the palette" });
    }

    if (hasBg) update.avatarBg = avatarBg;
    if (hasFg) update.avatarFg = avatarFg;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "At least one field must be provided to update" });
  }

  try {
    const user = await userService.updateProfile(req.userId, update);
    return res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

const MIN_PASSWORD_LENGTH = 8;

/**
 * PATCH /api/users/me/password — Settings -> Security's "Update
 * password". Always writes to req.userId, same self-service guarantee
 * as updateMe above.
 */
export const changeMyPassword = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || typeof currentPassword !== "string") {
    return res.status(400).json({ error: "currentPassword is required" });
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  try {
    await userService.changePassword(req.userId, currentPassword, newPassword);
    return res.status(200).json({ message: "Password updated." });
  } catch (error) {
    if (error instanceof Error && error.message === "Current password is incorrect") {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/users/me — Settings -> Danger Zone's "Delete account".
 * Self-service only (req.userId), and refused for the permanent demo
 * accounts (see user.service.ts's isProtectedDemoEmail) so the seeded
 * Demo Workspace can't be deleted out from under every other visitor.
 */
export const deleteMe = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    await userService.deleteOwnAccount(req.userId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Demo accounts can't be deleted") {
      return res.status(403).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
