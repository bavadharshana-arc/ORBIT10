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
});
