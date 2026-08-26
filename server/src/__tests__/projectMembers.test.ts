import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface ProjectMemberResponse {
  id: string;
  userId: string;
  role: string;
}

// projects.test.ts already covers the happy path (valid add, list, and
// remove persisting for real) — this file focuses on the gaps: add
// validation, role updates, last-Owner protection, and the
// project-role/workspace-membership authorization matrix.
describe("project members", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
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

  /** Creates a workspace/project owned by a fresh user (auto-Owner of both), returning the ids plus the owner. */
  async function createProjectFixture(
    ownerLabel: string,
    workspaceName: string,
    projectName: string,
  ): Promise<{ owner: RegisteredUser; workspaceId: string; projectId: string }> {
    const owner = await registerAndLogin(ownerLabel);

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: workspaceName }),
    });
    const workspaceId = workspace.body.id;

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: projectName }),
    });

    return { owner, workspaceId, projectId: project.body.id };
  }

  test("add validation: a non-workspace-member userId, missing userId, and an invalid role are rejected; a duplicate add 409s", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "pm-add-validation-owner",
      "PM Add Validation Workspace",
      "PM Add Validation Project",
    );
    const outsider = await registerAndLogin("pm-add-validation-outsider");
    const workspaceMember = await registerAndLogin("pm-add-validation-workspace-member");
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: workspaceMember.email, role: "MEMBER" }),
    });

    // Project membership is a subset of workspace membership — outsider
    // has never joined this workspace at all.
    const notWorkspaceMember = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: outsider.id, role: "Viewer" }) },
    );
    assert.equal(notWorkspaceMember.status, 400);

    const missingUserId = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ role: "Viewer" }) },
    );
    assert.equal(missingUserId.status, 400);

    const invalidRole = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: workspaceMember.id, role: "SuperUser" }) },
    );
    assert.equal(invalidRole.status, 400);

    const validAdd = await fetchJson<ProjectMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: workspaceMember.id, role: "Viewer" }) },
    );
    assert.equal(validAdd.status, 201);

    const duplicate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: workspaceMember.id, role: "Viewer" }) },
    );
    assert.equal(duplicate.status, 409);
  });

  test("update member role persists for real; nonexistent member 404s; demoting the sole Owner is forbidden", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "pm-role-owner",
      "PM Role Workspace",
      "PM Role Project",
    );
    const viewer = await registerAndLogin("pm-role-viewer");
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: viewer.email, role: "MEMBER" }),
    });
    const added = await fetchJson<ProjectMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: viewer.id, role: "Viewer" }) },
    );
    const viewerMemberId = added.body.id;

    const promoted = await fetchJson<ProjectMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${viewerMemberId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "Editor" }) },
    );
    assert.equal(promoted.status, 200);
    assert.equal(promoted.body.role, "Editor");

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<ProjectMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: owner.token },
    );
    assert.ok(listed.body.some((member) => member.id === viewerMemberId && member.role === "Editor"));

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/not-a-real-member-id`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "Viewer" }) },
    );
    assert.equal(nonexistent.status, 404);

    const ownerMembers = await fetchJson<ProjectMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: owner.token },
    );
    const ownerMemberId = ownerMembers.body.find((member) => member.role === "Owner")!.id;

    const demoteSoleOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${ownerMemberId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ role: "Editor" }) },
    );
    assert.equal(demoteSoleOwner.status, 409);
  });

  test("remove: nonexistent member 404s; the sole Owner cannot be removed", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "pm-remove-owner",
      "PM Remove Workspace",
      "PM Remove Project",
    );

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/not-a-real-member-id`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(nonexistent.status, 404);

    const ownerMembers = await fetchJson<ProjectMemberResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: owner.token },
    );
    const ownerMemberId = ownerMembers.body.find((member) => member.role === "Owner")!.id;

    const removeSoleOwner = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${ownerMemberId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(removeSoleOwner.status, 409);
  });

  test("authorization: a project Editor (non-Owner) cannot add/update/remove; a workspace MEMBER who isn't a project member can still list but not write", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "pm-authz-owner",
      "PM Authz Workspace",
      "PM Authz Project",
    );
    const editor = await registerAndLogin("pm-authz-editor");
    const workspaceOnlyMember = await registerAndLogin("pm-authz-workspace-only-member");
    const targetUser = await registerAndLogin("pm-authz-target");

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: editor.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: workspaceOnlyMember.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: targetUser.email, role: "MEMBER" }),
    });

    const addedEditor = await fetchJson<ProjectMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: editor.id, role: "Editor" }) },
    );
    const editorMemberId = addedEditor.body.id;

    // workspaceOnlyMember has never joined the *project* — a workspace
    // member who isn't a project member at all can still read the
    // roster (route comment: "any workspace member can see who's on a
    // project").
    const workspaceMemberList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: workspaceOnlyMember.token },
    );
    assert.equal(workspaceMemberList.status, 200);

    // The Editor (a real project member, but not an Owner) cannot add,
    // update, or remove — requireProjectRole("Owner") is strict, with no
    // "Owner or Editor" fallback the way Workspace's OWNER/ADMIN is.
    const editorAddAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: editor.token, body: JSON.stringify({ userId: targetUser.id, role: "Viewer" }) },
    );
    assert.equal(editorAddAttempt.status, 403);

    const editorUpdateAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${editorMemberId}`,
      { method: "PATCH", token: editor.token, body: JSON.stringify({ role: "Owner" }) },
    );
    assert.equal(editorUpdateAttempt.status, 403);

    const editorRemoveAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${editorMemberId}`,
      { method: "DELETE", token: editor.token },
    );
    assert.equal(editorRemoveAttempt.status, 403);

    // A workspace member who isn't a project member at all is also
    // forbidden from writing (requireProjectMembership rejects them
    // before requireProjectRole even runs).
    const nonProjectMemberAddAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      {
        method: "POST",
        token: workspaceOnlyMember.token,
        body: JSON.stringify({ userId: targetUser.id, role: "Viewer" }),
      },
    );
    assert.equal(nonProjectMemberAddAttempt.status, 403);
  });

  test("notification (Step 8): adding a project member creates exactly one 'team' notification for the added member", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "pm-notify-owner",
      "PM Notify Workspace",
      "PM Notify Project",
    );
    const addedMember = await registerAndLogin("pm-notify-added-member");
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: addedMember.email, role: "MEMBER" }),
    });

    const beforeAdd = await fetchJson<Array<{ id: string; type: string }>>(
      `${baseUrl}/api/users/me/notifications`,
      { token: addedMember.token },
    );
    assert.equal(beforeAdd.status, 200);

    const added = await fetchJson<ProjectMemberResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: addedMember.id, role: "Viewer" }) },
    );
    assert.equal(added.status, 201);

    const afterAdd = await fetchJson<Array<{ id: string; type: string }>>(
      `${baseUrl}/api/users/me/notifications`,
      { token: addedMember.token },
    );
    assert.equal(afterAdd.status, 200);
    const newTeamNotifications = afterAdd.body.filter(
      (notification) =>
        notification.type === "team" && !beforeAdd.body.some((existing) => existing.id === notification.id),
    );
    assert.equal(newTeamNotifications.length, 1);
  });
});
