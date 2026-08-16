import { apiGet, apiPatch } from "./api";

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
