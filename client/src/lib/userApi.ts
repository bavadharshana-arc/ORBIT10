import { apiDelete, apiGet, apiPatch } from "./api";

/* ============================================================
   USER PROFILE API

   Mirrors the shape server/src/services/user.service.ts's
   PUBLIC_USER_SELECT returns from both GET and PATCH /api/users/me —
   every User column except password.
============================================================ */

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarBg: string | null;
  avatarFg: string | null;
  createdAt: string;
}

export type ProfileUpdate = Partial<
  Pick<UserProfile, "name" | "email" | "jobTitle" | "phone" | "location" | "bio" | "avatarBg" | "avatarFg">
>;

export function getMyProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/users/me");
}

/** Partial update — only send the keys that actually changed. */
export function updateMyProfile(patch: ProfileUpdate): Promise<UserProfile> {
  return apiPatch<UserProfile>("/users/me", patch);
}

/* ============================================================
   PASSWORD / ACCOUNT (Phase 19 Frontend Integration audit fix)
   Mirrors user.controller.ts's changeMyPassword/deleteMe.
============================================================ */

export function changeMyPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiPatch<{ message: string }>("/users/me/password", { currentPassword, newPassword });
}

/** Self-deletes the signed-in account. The backend refuses this for the permanent demo accounts. */
export function deleteMyAccount(): Promise<void> {
  return apiDelete("/users/me");
}
