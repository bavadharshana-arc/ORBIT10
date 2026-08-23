import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface WorkspaceMemberResponse {
  id: string;
  userId: string;
  role: string;
}

describe("workspaces", () => {
  let baseUrl: string;
  let close: () => Promise<void>;
  let originalLoginMax: string | undefined;

  before(async () => {
    // This file's fixtures alone call registerAndLogin (and therefore
    // /auth/login) about two dozen times across its tests — comfortably
    // above the default AUTH_LOGIN_RATE_LIMIT_MAX (20/15min, see
    // rateLimit.middleware.ts). Raise the effective limit for this
    // process only so real login attempts here aren't themselves
    // rate-limited; rateLimit.middleware.ts reads this per-request, so
    // the override takes effect immediately with no import-order
    // dependency (same mechanism authRateLimit.test.ts exercises the
    // other direction).
    originalLoginMax = process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "1000";

    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();

    if (originalLoginMax === undefined) {
      delete process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    } else {
      process.env.AUTH_LOGIN_RATE_LIMIT_MAX = originalLoginMax;
    }
  });

  async function registerAndLogin(label: string): Promise<RegisteredUser> {
    const email = uniqueEmail(label);
    const registered = await fetchJson<{ id: string }>(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: label, email, password: "TestPass123!" }),
    });
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "TestPass123!" }),
    });
    return { id: registered.body.id, email, token: login.body.token };
  }

  test("create validation rejects a missing/empty name; a successful create makes the creator an OWNER", async () => {
    const owner = await registerAndLogin("workspace-create-owner");

    const missingName = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({}),
    });
    assert.equal(missingName.status, 400);

    const emptyName = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "   " }),
    });
    assert.equal(emptyName.status, 400);

    const created = await fetchJson<{ id: string; name: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Create Test Workspace" }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, "Create Test Workspace");

    const members = await fetchJson<WorkspaceMemberResponse[]>(
      `${baseUrl}/api/workspaces/${created.body.id}/members`,
      { token: owner.token },
    );
    assert.equal(members.status, 200);
    assert.ok(members.body.some((member) => member.userId === owner.id && member.role === "OWNER"));
  });

  test("get returns the real workspace; a nonexistent workspace 404s", async () => {
    const owner = await registerAndLogin("workspace-get-owner");
    const created = await fetchJson<{ id: string; name: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Get Test Workspace" }),
    });

    const fetched = await fetchJson<{ id: string; name: string }>(
      `${baseUrl}/api/workspaces/${created.body.id}`,
      { token: owner.token },
    );
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.id, created.body.id);
    assert.equal(fetched.body.name, "Get Test Workspace");

    const notFound = await fetchJson(`${baseUrl}/api/workspaces/not-a-real-workspace-id`, { token: owner.token });
    assert.equal(notFound.status, 404);
  });

  test("list returns only the workspaces each user actually belongs to", async () => {
    const userA = await registerAndLogin("workspace-list-user-a");
    const userB = await registerAndLogin("workspace-list-user-b");

    const a1 = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ name: "A First Workspace" }),
    });
    const a2 = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ name: "A Second Workspace" }),
    });
    const b1 = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ name: "B First Workspace" }),
    });

    const listA = await fetchJson<{ id: string }[]>(`${baseUrl}/api/workspaces`, { token: userA.token });
    assert.equal(listA.status, 200);
    const idsA = listA.body.map((workspace) => workspace.id);
    assert.ok(idsA.includes(a1.body.id));
    assert.ok(idsA.includes(a2.body.id));
    assert.equal(idsA.includes(b1.body.id), false);

    const listB = await fetchJson<{ id: string }[]>(`${baseUrl}/api/workspaces`, { token: userB.token });
    assert.equal(listB.status, 200);
    const idsB = listB.body.map((workspace) => workspace.id);
    assert.ok(idsB.includes(b1.body.id));
    assert.equal(idsB.includes(a1.body.id), false);
    assert.equal(idsB.includes(a2.body.id), false);
  });

  test("update persists all five settings fields for real, validates required fields, and forbids a plain MEMBER", async () => {
    const owner = await registerAndLogin("workspace-update-owner");
    const member = await registerAndLogin("workspace-update-member");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Update Test Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const validSettings = {
      name: "Renamed Workspace",
      slug: "renamed-workspace",
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      weekStart: "monday",
    };

    const updated = await fetchJson<typeof validSettings>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify(validSettings),
    });
    assert.equal(updated.status, 200);

    // Simulates a refresh — a completely fresh GET, not the mutation
    // response, must reflect the update.
    const refetched = await fetchJson<typeof validSettings>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      token: owner.token,
    });
    assert.equal(refetched.status, 200);
    assert.equal(refetched.body.name, "Renamed Workspace");
    assert.equal(refetched.body.slug, "renamed-workspace");
    assert.equal(refetched.body.timezone, "America/New_York");
    assert.equal(refetched.body.dateFormat, "MM/DD/YYYY");
    assert.equal(refetched.body.weekStart, "monday");

    const missingName = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ ...validSettings, name: "" }),
    });
    assert.equal(missingName.status, 400);

    const badSlug = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ ...validSettings, slug: "Not A Slug!" }),
    });
    assert.equal(badSlug.status, 400);

    const badTimezone = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ ...validSettings, timezone: "Nowhere/Fake" }),
    });
    assert.equal(badTimezone.status, 400);

    const badDateFormat = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ ...validSettings, dateFormat: "not-a-format" }),
    });
    assert.equal(badDateFormat.status, 400);

    const badWeekStart = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ ...validSettings, weekStart: "tuesday" }),
    });
    assert.equal(badWeekStart.status, 400);

    const memberUpdate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      token: member.token,
      body: JSON.stringify(validSettings),
    });
    assert.equal(memberUpdate.status, 403);
  });

  test("delete removes the workspace for real (OWNER-only) — MEMBER and ADMIN are both forbidden", async () => {
    const owner = await registerAndLogin("workspace-delete-owner");
    const admin = await registerAndLogin("workspace-delete-admin");
    const member = await registerAndLogin("workspace-delete-member");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Delete Test Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: admin.email, role: "ADMIN" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const memberDelete = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      token: member.token,
    });
    assert.equal(memberDelete.status, 403);

    // Update only requires OWNER/ADMIN, but delete requires OWNER alone —
    // an ADMIN is forbidden here even though they could PATCH this same
    // workspace.
    const adminDelete = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      token: admin.token,
    });
    assert.equal(adminDelete.status, 403);

    const ownerDelete = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      token: owner.token,
    });
    assert.equal(ownerDelete.status, 204);

    const afterDelete = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}`, { token: owner.token });
    assert.equal(afterDelete.status, 404);
  });

  test("add member: valid add, duplicate, unknown email, missing identifier, invalid role, and non-OWNER granting OWNER are all rejected correctly", async () => {
    const owner = await registerAndLogin("workspace-addmember-owner");
    const admin = await registerAndLogin("workspace-addmember-admin");
    const newMember = await registerAndLogin("workspace-addmember-new");
    const badRoleUser = await registerAndLogin("workspace-addmember-bad-role");
    const wouldBeOwner = await registerAndLogin("workspace-addmember-would-be-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Add Member Test Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: admin.email, role: "ADMIN" }),
    });

    const validAdd = await fetchJson<WorkspaceMemberResponse>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: newMember.email, role: "MEMBER" }),
    });
    assert.equal(validAdd.status, 201);
    assert.equal(validAdd.body.userId, newMember.id);

    const duplicate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: newMember.email, role: "MEMBER" }),
    });
    assert.equal(duplicate.status, 409);

    const unknownEmail = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: uniqueEmail("never-registered") }),
    });
    assert.equal(unknownEmail.status, 404);

    const missingIdentifier = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ role: "MEMBER" }),
    });
    assert.equal(missingIdentifier.status, 400);

    const invalidRole = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: badRoleUser.email, role: "SUPERUSER" }),
    });
    assert.equal(invalidRole.status, 400);

    // Granting OWNER at add-time would otherwise let an ADMIN mint a new
    // OWNER, bypassing the "only an OWNER can change OWNER roles" rule.
    const adminGrantingOwner = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: admin.token,
      body: JSON.stringify({ email: wouldBeOwner.email, role: "OWNER" }),
    });
    assert.equal(adminGrantingOwner.status, 403);
  });

  test("update member role: OWNER changes a role and it persists; nonexistent member 404s; ADMIN cannot touch OWNER roles; the sole OWNER cannot be demoted", async () => {
    const owner = await registerAndLogin("workspace-rolechange-owner");
    const admin = await registerAndLogin("workspace-rolechange-admin");
    const member = await registerAndLogin("workspace-rolechange-member");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Role Change Test Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: admin.email, role: "ADMIN" }),
    });

    const addedMember = await fetchJson<WorkspaceMemberResponse>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });
    const memberMemberId = addedMember.body.id;

    const promote = await fetchJson<WorkspaceMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${memberMemberId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "ADMIN" }) },
    );
    assert.equal(promote.status, 200);
    assert.equal(promote.body.role, "ADMIN");

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<WorkspaceMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/members`,
      { token: owner.token },
    );
    assert.ok(listed.body.some((m) => m.id === memberMemberId && m.role === "ADMIN"));

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/not-a-real-member-id`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "ADMIN" }) },
    );
    assert.equal(nonexistent.status, 404);

    // admin (a non-OWNER) tries to promote the same member to OWNER.
    const adminPromotingToOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${memberMemberId}`,
      { method: "PATCH", token: admin.token, body: JSON.stringify({ role: "OWNER" }) },
    );
    assert.equal(adminPromotingToOwner.status, 403);

    const ownerMembers = await fetchJson<WorkspaceMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/members`,
      { token: owner.token },
    );
    const ownerMemberId = ownerMembers.body.find((m) => m.role === "OWNER")!.id;

    // admin (a non-OWNER) tries to demote the workspace's sole OWNER.
    const adminDemotingOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${ownerMemberId}`,
      { method: "PATCH", token: admin.token, body: JSON.stringify({ role: "MEMBER" }) },
    );
    assert.equal(adminDemotingOwner.status, 403);

    // Even the OWNER itself cannot demote the sole remaining OWNER.
    const demoteSoleOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${ownerMemberId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "MEMBER" }) },
    );
    assert.equal(demoteSoleOwner.status, 409);
  });

  test("remove member: OWNER removes a MEMBER; nonexistent member 404s; ADMIN cannot remove OWNER; the sole OWNER cannot be removed; a plain MEMBER can read but not write; a non-member is forbidden entirely", async () => {
    const owner = await registerAndLogin("workspace-removemember-owner");
    const admin = await registerAndLogin("workspace-removemember-admin");
    const member = await registerAndLogin("workspace-removemember-member");
    const outsider = await registerAndLogin("workspace-removemember-outsider");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Remove Member Test Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const addedAdmin = await fetchJson<WorkspaceMemberResponse>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: admin.email, role: "ADMIN" }),
    });
    const adminMemberId = addedAdmin.body.id;

    const addedMember = await fetchJson<WorkspaceMemberResponse>(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });
    const memberMemberId = addedMember.body.id;

    // A plain MEMBER can read the roster but cannot add/update/remove.
    const memberList = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, { token: member.token });
    assert.equal(memberList.status, 200);

    const memberRemoveAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${adminMemberId}`,
      { method: "DELETE", token: member.token },
    );
    assert.equal(memberRemoveAttempt.status, 403);

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/not-a-real-member-id`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(nonexistent.status, 404);

    const ownerMembers = await fetchJson<WorkspaceMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/members`,
      { token: owner.token },
    );
    const ownerMemberId = ownerMembers.body.find((m) => m.role === "OWNER")!.id;

    // ADMIN (a non-OWNER) cannot remove the OWNER.
    const adminRemovingOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${ownerMemberId}`,
      { method: "DELETE", token: admin.token },
    );
    assert.equal(adminRemovingOwner.status, 403);

    // Even the OWNER cannot remove itself as the sole remaining OWNER.
    const removeSoleOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/members/${ownerMemberId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(removeSoleOwner.status, 409);

    // OWNER can remove a plain MEMBER.
    const removeMember = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members/${memberMemberId}`, {
      method: "DELETE",
      token: owner.token,
    });
    assert.equal(removeMember.status, 204);

    const listedAfterRemove = await fetchJson<WorkspaceMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/members`,
      { token: owner.token },
    );
    assert.equal(
      listedAfterRemove.body.some((m) => m.id === memberMemberId),
      false,
    );

    // A total outsider (never joined this workspace) is forbidden on the
    // workspace itself and its members endpoint alike.
    const outsiderGetWorkspace = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}`, {
      token: outsider.token,
    });
    assert.equal(outsiderGetWorkspace.status, 403);

    const outsiderGetMembers = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      token: outsider.token,
    });
    assert.equal(outsiderGetMembers.status, 403);
  });
});
