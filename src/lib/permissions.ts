import type { AuthRole } from "../types/auth";

/* ============================================================
   ROLES

   Workspace-wide role hierarchy for the signed-in identity
   (AuthContext's `role`). teamData.ts's per-member MemberRole is an
   alias of this same AuthRole (its resource checks — canManageWorkspaceMembers()
   and friends — defer to hasRole() below), so the roster and
   AuthContext share one 5-value vocabulary and one rank order; only
   the *identity* each resolves against still differs (AuthContext's
   signed-in user vs. teamData's roster lookup). workspaceData.ts's
   per-project ProjectPermission (Owner/Editor/Commenter/Viewer,
   gates a single project's content) remains a separate, decoupled
   vocabulary. This module governs which broad categories of action
   a signed-in user may take anywhere in the app, on top of — not
   instead of — those finer-grained project-level checks.

   Roles rank from least to most privileged:

     Viewer < Member < Project Manager < Admin < Owner

   Each resource below has a minimum required role; a role passes
   a resource check once its rank is at least that minimum, so
   every higher role inherits everything the roles below it can
   do:

     Owner            -> workspace, users, projects, assignments, tasks, comments, status
     Admin            -> users, projects, assignments, tasks, comments, status
     Project Manager  -> projects, assignments, tasks, comments, status
     Member           -> tasks, comments, status
     Viewer           -> (none of the above — view only)
============================================================ */

export type Role = AuthRole;

export const ROLES: Role[] = ["Owner", "Admin", "Project Manager", "Member", "Viewer"];

const ROLE_RANK: Record<Role, number> = {
  Viewer: 0,
  Member: 1,
  "Project Manager": 2,
  Admin: 3,
  Owner: 4,
};

/** True when `role` grants at least as much access as `required`. */
export function hasRole(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/* ============================================================
   RESOURCES
============================================================ */

export type Resource =
  | "workspace" // workspace-wide settings, billing, deleting/resetting workspace data — Owner only.
  | "users" // invite, edit, remove members, change their roles — Admin and above.
  | "projects" // create, edit, archive, delete projects — Project Manager and above.
  | "assignments" // assign or reassign tasks to team members — Project Manager and above.
  | "tasks" // create, edit, delete tasks — Member and above.
  | "comments" // post, edit, delete comments — Member and above.
  | "status"; // change a task's status — Member and above.

/** Minimum role rank required to act on each resource. Viewer satisfies none of these — view only. */
const RESOURCE_MIN_RANK: Record<Resource, number> = {
  status: ROLE_RANK.Member,
  comments: ROLE_RANK.Member,
  tasks: ROLE_RANK.Member,
  assignments: ROLE_RANK["Project Manager"],
  projects: ROLE_RANK["Project Manager"],
  users: ROLE_RANK.Admin,
  workspace: ROLE_RANK.Owner,
};

/** True when `role` may act on `resource`. Prefer the named helpers below at call sites — they read better and match this module's vocabulary to the feature being gated. */
export function can(role: Role, resource: Resource): boolean {
  return ROLE_RANK[role] >= RESOURCE_MIN_RANK[resource];
}

/** Owner only — workspace-wide settings, resetting/deleting workspace data. */
export function canManageWorkspace(role: Role): boolean {
  return can(role, "workspace");
}

/** Admin and above — invite, edit, remove members, and change their roles. */
export function canManageUsers(role: Role): boolean {
  return can(role, "users");
}

/** Project Manager and above — create, edit, archive, and delete projects. */
export function canManageProjects(role: Role): boolean {
  return can(role, "projects");
}

/** Project Manager and above — assign or reassign tasks to team members. */
export function canManageAssignments(role: Role): boolean {
  return can(role, "assignments");
}

/** Member and above — create, edit, and delete tasks. */
export function canManageTasks(role: Role): boolean {
  return can(role, "tasks");
}

/** Member and above — post, edit, and delete comments. */
export function canComment(role: Role): boolean {
  return can(role, "comments");
}

/** Member and above — change a task's status. */
export function canUpdateStatus(role: Role): boolean {
  return can(role, "status");
}

/** True for Viewer, the one role with no write access anywhere — callers can use this to render a read-only state instead of checking each resource individually. */
export function isViewOnly(role: Role): boolean {
  return role === "Viewer";
}

/* ============================================================
   EFFECTIVE ROLE

   AuthContext's `role` is null until a mock login/register happens,
   and none of the app's routes are actually gated behind sign-in —
   "/" (Dashboard) is reachable straight away. So a signed-out
   visitor must resolve to the same access level today's demo
   already grants everywhere (full access), not to least privilege —
   otherwise every action in the app would appear locked before
   anyone has touched the login form, which isn't how the app
   behaves today.

   register() is the one flow that actually narrows access: a
   freshly created account gets AuthRole "Member" (tasks, comments,
   and status only), same as any other Member.
============================================================ */

/** Resolves AuthContext's `role` (nullable pre-login) to the Role this module checks against, defaulting a signed-out visitor to full ("Owner"-level) access so unauthenticated pages keep behaving exactly as they did before this module existed. */
export function resolveEffectiveRole(role: Role | null | undefined): Role {
  return role ?? "Owner";
}
