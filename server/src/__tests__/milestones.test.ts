import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface MilestoneResponse {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  projectId: string;
}

describe("milestones", () => {
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

  /** Creates a workspace/project owned by a fresh user (auto project Owner), returning every id plus the owner. */
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

  test("create persists title/dueDate for real; list returns it after a fresh fetch", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "milestone-create-owner",
      "Milestone Create Workspace",
      "Milestone Create Project",
    );

    const created = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Beta launch", dueDate: "2026-10-01" }) },
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.title, "Beta launch");
    assert.equal(created.body.done, false);
    assert.equal(created.body.dueDate?.slice(0, 10), "2026-10-01");

    const listed = await fetchJson<MilestoneResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((m) => m.id === created.body.id && m.title === "Beta launch"));
  });

  test("create validation rejects a missing title and an invalid calendar date", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "milestone-validation-owner",
      "Milestone Validation Workspace",
      "Milestone Validation Project",
    );

    const missingTitle = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({}) },
    );
    assert.equal(missingTitle.status, 400);

    // 2026-02-30 doesn't exist — JS Date would silently roll it into
    // March, which parseDueDate rejects instead.
    const invalidDate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Bad date", dueDate: "2026-02-30" }) },
    );
    assert.equal(invalidDate.status, 400);
  });

  test("update persists title/done/dueDate for real; validates done/dueDate; nonexistent milestone 404s", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "milestone-update-owner",
      "Milestone Update Workspace",
      "Milestone Update Project",
    );

    const created = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Draft milestone" }) },
    );
    const milestoneId = created.body.id;

    const updated = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      {
        method: "PATCH",
        token: owner.token,
        body: JSON.stringify({ title: "Final milestone", done: true, dueDate: "2026-11-15" }),
      },
    );
    assert.equal(updated.status, 200);

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<MilestoneResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { token: owner.token },
    );
    const refetched = listed.body.find((m) => m.id === milestoneId)!;
    assert.equal(refetched.title, "Final milestone");
    assert.equal(refetched.done, true);
    assert.equal(refetched.dueDate?.slice(0, 10), "2026-11-15");

    const invalidDone = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ done: "yes" }) },
    );
    assert.equal(invalidDone.status, 400);

    const invalidDate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ dueDate: "2026-02-30" }) },
    );
    assert.equal(invalidDate.status, 400);

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/not-a-real-milestone-id`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ title: "New title" }) },
    );
    assert.equal(nonexistent.status, 404);
  });

  test("delete removes the milestone for real — it no longer appears in a fresh list; deleting again 404s", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "milestone-delete-owner",
      "Milestone Delete Workspace",
      "Milestone Delete Project",
    );

    const created = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Temporary milestone" }) },
    );
    const milestoneId = created.body.id;

    const deleted = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(deleted.status, 204);

    const listed = await fetchJson<MilestoneResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { token: owner.token },
    );
    assert.equal(listed.body.some((m) => m.id === milestoneId), false);

    const deleteAgain = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(deleteAgain.status, 404);
  });

  test("authorization: any workspace member can list, but only a project Owner/Editor can create/update/delete — a project Viewer and a non-project workspace MEMBER are both forbidden", async () => {
    const { owner, workspaceId, projectId } = await createProjectFixture(
      "milestone-authz-owner",
      "Milestone Authz Workspace",
      "Milestone Authz Project",
    );
    const viewer = await registerAndLogin("milestone-authz-viewer");
    const workspaceOnlyMember = await registerAndLogin("milestone-authz-workspace-only-member");

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: viewer.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: workspaceOnlyMember.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ userId: viewer.id, role: "Viewer" }),
    });

    const created = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Owner-created milestone" }) },
    );
    const milestoneId = created.body.id;

    // Any workspace member can read the list — even one who isn't even a
    // project member (workspaceOnlyMember).
    const viewerList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { token: viewer.token },
    );
    assert.equal(viewerList.status, 200);

    const workspaceOnlyList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { token: workspaceOnlyMember.token },
    );
    assert.equal(workspaceOnlyList.status, 200);

    // A project Viewer (a real project member, but not Owner/Editor) cannot write.
    const viewerCreate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: viewer.token, body: JSON.stringify({ title: "Should not be created" }) },
    );
    assert.equal(viewerCreate.status, 403);

    const viewerUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "PATCH", token: viewer.token, body: JSON.stringify({ done: true }) },
    );
    assert.equal(viewerUpdate.status, 403);

    const viewerDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: "DELETE", token: viewer.token },
    );
    assert.equal(viewerDelete.status, 403);

    // A workspace member who isn't even a project member is also forbidden
    // (requireProjectMembership rejects them before requireProjectRole runs).
    const workspaceOnlyCreate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/milestones`,
      { method: "POST", token: workspaceOnlyMember.token, body: JSON.stringify({ title: "Should not be created" }) },
    );
    assert.equal(workspaceOnlyCreate.status, 403);
  });

  test("workspace isolation — a legitimate member of a different workspace/project gets 404, a total outsider gets 403", async () => {
    const { owner: ownerA, workspaceId: workspaceIdA, projectId: projectIdA } = await createProjectFixture(
      "milestone-isolation-owner-a",
      "Milestone Isolation Workspace A",
      "Milestone Isolation Project A",
    );

    const created = await fetchJson<MilestoneResponse>(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/milestones`,
      { method: "POST", token: ownerA.token, body: JSON.stringify({ title: "Workspace A's private milestone" }) },
    );
    const milestoneId = created.body.id;

    const { owner: ownerB, workspaceId: workspaceIdB, projectId: projectIdB } = await createProjectFixture(
      "milestone-isolation-owner-b",
      "Milestone Isolation Workspace B",
      "Milestone Isolation Project B",
    );

    const crossUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdB}/milestones/${milestoneId}`,
      { method: "PATCH", token: ownerB.token, body: JSON.stringify({ done: true }) },
    );
    assert.equal(crossUpdate.status, 404);

    const outsider = await registerAndLogin("milestone-isolation-outsider");
    const outsiderList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/milestones`,
      { token: outsider.token },
    );
    assert.equal(outsiderList.status, 403);
  });
});
