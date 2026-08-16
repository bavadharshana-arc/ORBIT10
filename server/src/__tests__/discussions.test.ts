import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

describe("discussions / comments count", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  test("the real discussion count reflects what was actually created, after a fresh fetch", async () => {
    const email = uniqueEmail("discussions-owner");
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Discussions Owner", email, password: "TestPass123!" }),
    });
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "TestPass123!" }),
    });
    const token = login.body.token;

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token,
      body: JSON.stringify({ name: "Discussions Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const project = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token,
      body: JSON.stringify({ name: "Discussions Project" }),
    });
    const projectId = project.body.id;

    const empty = await fetchJson<unknown[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/discussions`,
      { token },
    );
    assert.equal(empty.status, 200);
    assert.equal(empty.body.length, 0);

    for (const body of ["First update", "Second update", "Third update"]) {
      const created = await fetchJson(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/discussions`,
        { method: "POST", token, body: JSON.stringify({ type: "update", body }) },
      );
      assert.equal(created.status, 201);
    }

    // Fresh fetch, same shape ProjectOverviewTab.tsx's discussionsCount
    // stat now uses (Phase 19 Frontend Integration follow-up — Fix
    // Discussions Count) — a real count of what's actually persisted,
    // not a stale local echo.
    const afterCreate = await fetchJson<unknown[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/discussions`,
      { token },
    );
    assert.equal(afterCreate.status, 200);
    assert.equal(afterCreate.body.length, 3);
  });
});
