import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

describe("projects", () => {
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

  test("create and update a project persists tag/color/startDate/dueDate for real (not just in the response)", async () => {
    const owner = await registerAndLogin("project-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Test Workspace" }),
    });
    assert.equal(workspace.status, 201);
    const workspaceId = workspace.body.id;

    const created = await fetchJson<{
      id: string;
      tag: string | null;
      color: string | null;
      startDate: string | null;
      dueDate: string | null;
    }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({
        name: "Launch Plan",
        tag: "Product",
        color: "#8EA7BF",
        startDate: "2026-09-01",
        dueDate: "2026-10-01",
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.tag, "Product");
    assert.equal(created.body.color, "#8EA7BF");
    assert.equal(created.body.startDate?.slice(0, 10), "2026-09-01");
    assert.equal(created.body.dueDate?.slice(0, 10), "2026-10-01");

    const projectId = created.body.id;

    const updated = await fetchJson<{ tag: string | null; color: string | null }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ tag: "Engineering", color: "#7FB8B0" }) },
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.tag, "Engineering");
    assert.equal(updated.body.color, "#7FB8B0");

    // Simulates a refresh — a completely fresh GET, not the mutation
    // response, must reflect the update: this is what makes it real
    // persistence rather than an echoed request body.
    const refetched = await fetchJson<{ tag: string | null; color: string | null }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { token: owner.token },
    );
    assert.equal(refetched.status, 200);
    assert.equal(refetched.body.tag, "Engineering");
    assert.equal(refetched.body.color, "#7FB8B0");
  });

  test("project members persist for real — added, listed after a fresh fetch, and removable", async () => {
    const owner = await registerAndLogin("member-owner");
    const other = await registerAndLogin("member-other");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Member Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const addedToWorkspace = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: other.email, role: "MEMBER" }),
    });
    assert.equal(addedToWorkspace.status, 201);

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Team Project" }),
    });
    const projectId = project.body.id;

    const addedToProject = await fetchJson<{ id: string; userId: string; role: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { method: "POST", token: owner.token, body: JSON.stringify({ userId: other.id, role: "Viewer" }) },
    );
    assert.equal(addedToProject.status, 201);
    assert.equal(addedToProject.body.userId, other.id);

    // Fresh fetch — real persistence, not an echoed create response.
    const listed = await fetchJson<{ userId: string }[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((member) => member.userId === other.id));

    const removed = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members/${addedToProject.body.id}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(removed.status, 204);

    const listedAfterRemove = await fetchJson<{ userId: string }[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/members`,
      { token: owner.token },
    );
    assert.equal(listedAfterRemove.body.some((member) => member.userId === other.id), false);
  });

  test("a plain MEMBER cannot create a project (requireWorkspaceRole OWNER/ADMIN)", async () => {
    const owner = await registerAndLogin("authz-owner");
    const member = await registerAndLogin("authz-member");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Authz Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: member.token,
      body: JSON.stringify({ name: "Should Not Be Created" }),
    });
    assert.equal(res.status, 403);
  });

  test("someone outside the workspace entirely cannot even list its projects", async () => {
    const owner = await registerAndLogin("isolation-owner");
    const outsider = await registerAndLogin("isolation-outsider");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Isolated Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const res = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects`, { token: outsider.token });
    assert.equal(res.status, 403);
  });

  test("create validation rejects a missing/empty name, non-string tag/color, and invalid calendar dates", async () => {
    const owner = await registerAndLogin("project-create-validation-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Create Validation Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const missingName = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({}),
    });
    assert.equal(missingName.status, 400);

    const emptyName = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "   " }),
    });
    assert.equal(emptyName.status, 400);

    const badTag = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Bad Tag Project", tag: 123 }),
    });
    assert.equal(badTag.status, 400);

    const badColor = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Bad Color Project", color: 123 }),
    });
    assert.equal(badColor.status, 400);

    // 2026-02-30 doesn't exist — JS Date would silently roll it into
    // March, which parseProjectWrite/parseProjectDate rejects instead.
    const badStartDate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Bad Start Date Project", startDate: "2026-02-30" }),
    });
    assert.equal(badStartDate.status, 400);

    const badDueDate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Bad Due Date Project", dueDate: "2026-02-30" }),
    });
    assert.equal(badDueDate.status, 400);
  });

  test("update validation rejects an empty body, empty-string name, invalid tag/color/date, and a nonexistent project", async () => {
    const owner = await registerAndLogin("project-update-validation-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Update Validation Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Update Validation Project" }),
    });
    const projectId = project.body.id;

    const emptyBody = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({}) },
    );
    assert.equal(emptyBody.status, 400);

    const emptyName = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ name: "   " }) },
    );
    assert.equal(emptyName.status, 400);

    const badTag = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ tag: 123 }) },
    );
    assert.equal(badTag.status, 400);

    const badColor = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ color: 123 }) },
    );
    assert.equal(badColor.status, 400);

    const badDate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ startDate: "2026-02-30" }) },
    );
    assert.equal(badDate.status, 400);

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/not-a-real-project-id`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ name: "New Name" }) },
    );
    assert.equal(nonexistent.status, 404);
  });

  test("list returns every real project in the workspace", async () => {
    const owner = await registerAndLogin("project-list-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "List Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const first = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "First Project" }),
    });
    const second = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Second Project" }),
    });

    const listed = await fetchJson<{ id: string; name: string }[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((project) => project.id === first.body.id && project.name === "First Project"));
    assert.ok(listed.body.some((project) => project.id === second.body.id && project.name === "Second Project"));
  });

  test("delete removes the project for real — a subsequent GET 404s", async () => {
    const owner = await registerAndLogin("project-delete-owner");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Delete Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Temporary Project" }),
    });
    const projectId = project.body.id;

    const deleted = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`, {
      method: "DELETE",
      token: owner.token,
    });
    assert.equal(deleted.status, 204);

    const afterDelete = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`, {
      token: owner.token,
    });
    assert.equal(afterDelete.status, 404);
  });

  test("a plain MEMBER can list/get projects but cannot create, update, or delete them", async () => {
    const owner = await registerAndLogin("project-authz-owner");
    const member = await registerAndLogin("project-authz-member");

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Project Authz Workspace" }),
    });
    const workspaceId = workspace.body.id;

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Owner-created Project" }),
    });
    const projectId = project.body.id;

    const memberList = await fetchJson<{ id: string }[]>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      token: member.token,
    });
    assert.equal(memberList.status, 200);

    const memberGet = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`, {
      token: member.token,
    });
    assert.equal(memberGet.status, 200);

    const memberCreate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: member.token,
      body: JSON.stringify({ name: "Should not be created" }),
    });
    assert.equal(memberCreate.status, 403);

    const memberUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "PATCH", token: member.token, body: JSON.stringify({ name: "Should not update" }) },
    );
    assert.equal(memberUpdate.status, 403);

    const memberDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}`,
      { method: "DELETE", token: member.token },
    );
    assert.equal(memberDelete.status, 403);
  });

  test("workspace isolation — a legitimate member of a different workspace gets 404 on get/update/delete, a total outsider gets 403 on list, no project data leaks", async () => {
    const ownerA = await registerAndLogin("project-isolation-owner-a");
    const workspaceA = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: ownerA.token,
      body: JSON.stringify({ name: "Workspace A" }),
    });
    const workspaceIdA = workspaceA.body.id;

    const projectA = await fetchJson<{ id: string; name: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects`,
      { method: "POST", token: ownerA.token, body: JSON.stringify({ name: "Workspace A's private project" }) },
    );
    const projectIdA = projectA.body.id;

    // memberB is a real, legitimate member of Workspace B (its own
    // creator/owner) — just not of Workspace A — and tries to reach
    // Workspace A's project through Workspace B's own URL combined with
    // Workspace A's real project id.
    const memberB = await registerAndLogin("project-isolation-member-b");
    const workspaceB = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: memberB.token,
      body: JSON.stringify({ name: "Workspace B" }),
    });
    const workspaceIdB = workspaceB.body.id;

    const crossGet = await fetchJson<{ error: string } | { id: string; name: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdA}`,
      { token: memberB.token },
    );
    assert.equal(crossGet.status, 404);
    assert.equal("name" in crossGet.body, false, "no project data should leak into the response");

    const crossUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdA}`,
      { method: "PATCH", token: memberB.token, body: JSON.stringify({ name: "Hijacked name" }) },
    );
    assert.equal(crossUpdate.status, 404);

    const crossDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdA}`,
      { method: "DELETE", token: memberB.token },
    );
    assert.equal(crossDelete.status, 404);

    const outsider = await registerAndLogin("project-isolation-outsider");
    const outsiderList = await fetchJson(`${baseUrl}/api/workspaces/${workspaceIdA}/projects`, {
      token: outsider.token,
    });
    assert.equal(outsiderList.status, 403);
  });
});
