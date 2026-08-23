import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface ActivityEventResponse {
  id: string;
  type?: string;
  text: string;
  actorId?: string | null;
  memberId?: string | null;
  createdAt: string;
}

describe("activity", () => {
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

  describe("project activity (/workspaces/:id/projects/:projectId/activity)", () => {
    test("create persists a real event; list returns events newest-first", async () => {
      const { owner, workspaceId, projectId } = await createProjectFixture(
        "activity-create-owner",
        "Project Activity Create Workspace",
        "Project Activity Create Project",
      );

      const first = await fetchJson<ActivityEventResponse>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: owner.token, body: JSON.stringify({ type: "project_created", text: "Project created" }) },
      );
      assert.equal(first.status, 201);
      assert.equal(first.body.text, "Project created");

      const second = await fetchJson<ActivityEventResponse>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: owner.token, body: JSON.stringify({ type: "task_created", text: "Task created" }) },
      );
      assert.equal(second.status, 201);

      const listed = await fetchJson<ActivityEventResponse[]>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { token: owner.token },
      );
      assert.equal(listed.status, 200);
      const ids = listed.body.map((event) => event.id);
      assert.ok(ids.includes(first.body.id));
      assert.ok(ids.includes(second.body.id));
      // Newest first: the second event must sort before the first.
      assert.ok(ids.indexOf(second.body.id) < ids.indexOf(first.body.id));
    });

    test("create validation rejects an invalid type, missing text, and a non-member actorId", async () => {
      const { owner, workspaceId, projectId } = await createProjectFixture(
        "activity-validation-owner",
        "Project Activity Validation Workspace",
        "Project Activity Validation Project",
      );
      const outsider = await registerAndLogin("activity-validation-outsider");

      const invalidType = await fetchJson<{ error: string }>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: owner.token, body: JSON.stringify({ type: "not-a-real-type", text: "..." }) },
      );
      assert.equal(invalidType.status, 400);

      const missingText = await fetchJson<{ error: string }>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: owner.token, body: JSON.stringify({ type: "project_created" }) },
      );
      assert.equal(missingText.status, 400);

      const invalidActor = await fetchJson<{ error: string }>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        {
          method: "POST",
          token: owner.token,
          body: JSON.stringify({ type: "project_created", text: "...", actorId: outsider.id }),
        },
      );
      assert.equal(invalidActor.status, 400);
    });

    test("authorization: any project role (even Viewer) can post, but a non-project workspace member cannot; any workspace member can list", async () => {
      const { owner, workspaceId, projectId } = await createProjectFixture(
        "activity-authz-owner",
        "Project Activity Authz Workspace",
        "Project Activity Authz Project",
      );
      const viewer = await registerAndLogin("activity-authz-viewer");
      const workspaceOnlyMember = await registerAndLogin("activity-authz-workspace-only-member");

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

      // Deliberately no role gate on POST — even a project Viewer can log an event.
      const viewerCreate = await fetchJson<ActivityEventResponse>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: viewer.token, body: JSON.stringify({ type: "comment_added", text: "Viewer logged this" }) },
      );
      assert.equal(viewerCreate.status, 201);

      // A workspace member who isn't a project member at all is still forbidden.
      const workspaceOnlyCreate = await fetchJson<{ error: string }>(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { method: "POST", token: workspaceOnlyMember.token, body: JSON.stringify({ type: "comment_added", text: "..." }) },
      );
      assert.equal(workspaceOnlyCreate.status, 403);

      // Any workspace member (even a non-project-member) can list.
      const workspaceOnlyList = await fetchJson(
        `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/activity`,
        { token: workspaceOnlyMember.token },
      );
      assert.equal(workspaceOnlyList.status, 200);
    });

    test("workspace isolation — a legitimate member of a different workspace/project gets 404 posting, a total outsider gets 403 listing", async () => {
      const { owner: ownerA, workspaceId: workspaceIdA, projectId: projectIdA } = await createProjectFixture(
        "activity-isolation-owner-a",
        "Project Activity Isolation Workspace A",
        "Project Activity Isolation Project A",
      );
      const { owner: ownerB, workspaceId: workspaceIdB } = await createProjectFixture(
        "activity-isolation-owner-b",
        "Project Activity Isolation Workspace B",
        "Project Activity Isolation Project B",
      );

      // ownerB is a legitimate member of their own Workspace B/Project B —
      // but Workspace A's project id doesn't belong there.
      const crossCreate = await fetchJson<{ error: string }>(
        `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdA}/activity`,
        { method: "POST", token: ownerB.token, body: JSON.stringify({ type: "project_created", text: "Hijack attempt" }) },
      );
      assert.equal(crossCreate.status, 404);

      const outsider = await registerAndLogin("activity-isolation-outsider");
      const outsiderList = await fetchJson(
        `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/activity`,
        { token: outsider.token },
      );
      assert.equal(outsiderList.status, 403);
    });
  });

  describe("workspace activity (/workspaces/:id/activity)", () => {
    test("create persists a real event; list returns events newest-first", async () => {
      const owner = await registerAndLogin("workspace-activity-create-owner");
      const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Workspace Activity Create Workspace" }),
      });
      const workspaceId = workspace.body.id;

      const first = await fetchJson<ActivityEventResponse>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ text: "First event" }),
      });
      assert.equal(first.status, 201);

      const second = await fetchJson<ActivityEventResponse>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ text: "Second event" }),
      });
      assert.equal(second.status, 201);

      const listed = await fetchJson<ActivityEventResponse[]>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        token: owner.token,
      });
      assert.equal(listed.status, 200);
      const ids = listed.body.map((event) => event.id);
      assert.ok(ids.indexOf(second.body.id) < ids.indexOf(first.body.id));
    });

    test("create validation rejects missing text and a non-member memberId", async () => {
      const owner = await registerAndLogin("workspace-activity-validation-owner");
      const outsider = await registerAndLogin("workspace-activity-validation-outsider");
      const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Workspace Activity Validation Workspace" }),
      });
      const workspaceId = workspace.body.id;

      const missingText = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({}),
      });
      assert.equal(missingText.status, 400);

      const invalidMember = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ text: "...", memberId: outsider.id }),
      });
      assert.equal(invalidMember.status, 400);
    });

    test("authorization: OWNER/ADMIN can post, a plain MEMBER cannot; any workspace member can list", async () => {
      const owner = await registerAndLogin("workspace-activity-authz-owner");
      const member = await registerAndLogin("workspace-activity-authz-member");
      const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Workspace Activity Authz Workspace" }),
      });
      const workspaceId = workspace.body.id;

      await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ email: member.email, role: "MEMBER" }),
      });

      const memberCreate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: member.token,
        body: JSON.stringify({ text: "Should not be created" }),
      });
      assert.equal(memberCreate.status, 403);

      const ownerCreate = await fetchJson<ActivityEventResponse>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ text: "Owner-created event" }),
      });
      assert.equal(ownerCreate.status, 201);

      const memberList = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/activity`, { token: member.token });
      assert.equal(memberList.status, 200);
    });

    test("isolation — a total outsider with no workspace membership gets 403 on both list and create", async () => {
      const owner = await registerAndLogin("workspace-activity-isolation-owner");
      const outsider = await registerAndLogin("workspace-activity-isolation-outsider");
      const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ name: "Workspace Activity Isolation Workspace" }),
      });
      const workspaceId = workspace.body.id;

      const outsiderList = await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        token: outsider.token,
      });
      assert.equal(outsiderList.status, 403);

      const outsiderCreate = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces/${workspaceId}/activity`, {
        method: "POST",
        token: outsider.token,
        body: JSON.stringify({ text: "Should not be created" }),
      });
      assert.equal(outsiderCreate.status, 403);
    });
  });
});
