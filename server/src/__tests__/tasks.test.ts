import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  projectId: string;
}

describe("tasks", () => {
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

  /** Creates a workspace (owned by `owner`) and one project inside it, returning both ids. */
  async function createWorkspaceWithProject(
    owner: RegisteredUser,
    workspaceName: string,
    projectName: string,
  ): Promise<{ workspaceId: string; projectId: string }> {
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

    return { workspaceId, projectId: project.body.id };
  }

  test("create persists title/description/status/priority/dueDate/assigneeId for real (not just in the response)", async () => {
    const owner = await registerAndLogin("task-owner");
    const { workspaceId, projectId } = await createWorkspaceWithProject(owner, "Task Workspace", "Task Project");

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({
          title: "Ship the launch banner",
          description: "Design and ship the homepage banner",
          status: "In Progress",
          priority: "High",
          dueDate: "2026-09-15",
          assigneeId: owner.id,
        }),
      },
    );
    assert.equal(created.status, 201);
    const taskId = created.body.id;

    // Fresh fetch — not the create response — proves real persistence.
    const refetched = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { token: owner.token },
    );
    assert.equal(refetched.status, 200);
    assert.equal(refetched.body.title, "Ship the launch banner");
    assert.equal(refetched.body.description, "Design and ship the homepage banner");
    assert.equal(refetched.body.status, "In Progress");
    assert.equal(refetched.body.priority, "High");
    assert.equal(refetched.body.dueDate?.slice(0, 10), "2026-09-15");
    assert.equal(refetched.body.assigneeId, owner.id);
  });

  test("list returns the project's real tasks, after a fresh fetch", async () => {
    const owner = await registerAndLogin("task-list-owner");
    const { workspaceId, projectId } = await createWorkspaceWithProject(owner, "List Workspace", "List Project");

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "A real task" }) },
    );
    assert.equal(created.status, 201);

    const listed = await fetchJson<TaskResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((task) => task.id === created.body.id && task.title === "A real task"));
  });

  test("update persists title/status/priority for real (not just in the response)", async () => {
    const owner = await registerAndLogin("task-update-owner");
    const { workspaceId, projectId } = await createWorkspaceWithProject(owner, "Update Workspace", "Update Project");

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ title: "Draft title", status: "To Do", priority: "Low" }),
      },
    );
    const taskId = created.body.id;

    const updated = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",
        token: owner.token,
        body: JSON.stringify({ title: "Final title", status: "Completed", priority: "Urgent" }),
      },
    );
    assert.equal(updated.status, 200);

    // Simulates a refresh — a completely fresh GET, not the mutation
    // response, must reflect the update.
    const refetched = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { token: owner.token },
    );
    assert.equal(refetched.status, 200);
    assert.equal(refetched.body.title, "Final title");
    assert.equal(refetched.body.status, "Completed");
    assert.equal(refetched.body.priority, "Urgent");
  });

  test("delete removes the task for real — a subsequent GET 404s", async () => {
    const owner = await registerAndLogin("task-delete-owner");
    const { workspaceId, projectId } = await createWorkspaceWithProject(owner, "Delete Workspace", "Delete Project");

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Temporary task" }) },
    );
    const taskId = created.body.id;

    const deleted = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(deleted.status, 204);

    const afterDelete = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { token: owner.token },
    );
    assert.equal(afterDelete.status, 404);
  });

  test("validation rejects an invalid status, an invalid priority, an invalid calendar date, and a non-member assignee", async () => {
    const owner = await registerAndLogin("task-validation-owner");
    const { workspaceId, projectId } = await createWorkspaceWithProject(
      owner,
      "Validation Workspace",
      "Validation Project",
    );
    const outsider = await registerAndLogin("task-validation-outsider");

    const invalidStatus = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Bad status", status: "Not A Status" }) },
    );
    assert.equal(invalidStatus.status, 400);

    const invalidPriority = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Bad priority", priority: "Extreme" }) },
    );
    assert.equal(invalidPriority.status, 400);

    // 2026-02-30 doesn't exist — JS Date would silently roll it into
    // March, which parseTaskWrite/parseDueDate rejects instead.
    const invalidDate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Bad date", dueDate: "2026-02-30" }) },
    );
    assert.equal(invalidDate.status, 400);

    // `outsider` has never joined this workspace, so isn't a valid assignee.
    const invalidAssignee = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      {
        method: "POST",
        token: owner.token,
        body: JSON.stringify({ title: "Bad assignee", assigneeId: outsider.id }),
      },
    );
    assert.equal(invalidAssignee.status, 400);
  });

  test("a plain MEMBER can list/get tasks but cannot create, update, or delete them", async () => {
    const owner = await registerAndLogin("task-authz-owner");
    const member = await registerAndLogin("task-authz-member");
    const { workspaceId, projectId } = await createWorkspaceWithProject(owner, "Authz Workspace", "Authz Project");

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Owner-created task" }) },
    );
    const taskId = created.body.id;

    const memberList = await fetchJson<TaskResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { token: member.token },
    );
    assert.equal(memberList.status, 200);

    const memberGet = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { token: member.token },
    );
    assert.equal(memberGet.status, 200);

    const memberCreate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: member.token, body: JSON.stringify({ title: "Should not be created" }) },
    );
    assert.equal(memberCreate.status, 403);

    const memberUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "PATCH", token: member.token, body: JSON.stringify({ title: "Should not update" }) },
    );
    assert.equal(memberUpdate.status, 403);

    const memberDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "DELETE", token: member.token },
    );
    assert.equal(memberDelete.status, 403);
  });

  test("workspace isolation — a legitimate member of a different workspace gets 404, a total outsider gets 403, no task data leaks either way", async () => {
    const ownerA = await registerAndLogin("task-isolation-owner-a");
    const { workspaceId: workspaceIdA, projectId: projectIdA } = await createWorkspaceWithProject(
      ownerA,
      "Workspace A",
      "Project A",
    );

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/tasks`,
      { method: "POST", token: ownerA.token, body: JSON.stringify({ title: "Workspace A's private task" }) },
    );
    const taskId = created.body.id;

    const ownerB = await registerAndLogin("task-isolation-owner-b");
    const { workspaceId: workspaceIdB, projectId: projectIdB } = await createWorkspaceWithProject(
      ownerB,
      "Workspace B",
      "Project B",
    );

    // ownerB is a real, legitimate member of Workspace B — just not of
    // Workspace A — and tries to reach Workspace A's task through
    // Workspace B's own project URL combined with Workspace A's real
    // task id.
    const crossWorkspaceGet = await fetchJson<{ error: string } | TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdB}/tasks/${taskId}`,
      { token: ownerB.token },
    );
    assert.equal(crossWorkspaceGet.status, 404);
    assert.equal("title" in crossWorkspaceGet.body, false, "no task data should leak into the response");

    const outsider = await registerAndLogin("task-isolation-outsider");
    const outsiderGet = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/tasks/${taskId}`,
      { token: outsider.token },
    );
    assert.equal(outsiderGet.status, 403);
  });

  test("cross-project isolation — a task created in one project 404s when fetched through a different project's URL in the same workspace", async () => {
    const owner = await registerAndLogin("task-cross-project-owner");
    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Cross-Project Workspace" }),
    });
    const workspaceId = workspace.body.id;

    const project1 = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Project One" }),
    });
    const project2 = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ name: "Project Two" }),
    });

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${project1.body.id}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Project One's task" }) },
    );
    const taskId = created.body.id;

    const throughProject2 = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${project2.body.id}/tasks/${taskId}`,
      { token: owner.token },
    );
    assert.equal(throughProject2.status, 404);
  });

  test("assignment notification (Step 8): reassignment notifies the new assignee exactly once; an unchanged assigneeId, unassigning, and self-assignment all create none", async () => {
    const owner = await registerAndLogin("task-assign-notify-owner");
    const member = await registerAndLogin("task-assign-notify-member");
    const { workspaceId, projectId } = await createWorkspaceWithProject(
      owner,
      "Assign Notify Workspace",
      "Assign Notify Project",
    );

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const created = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: "Assign Notify Task" }) },
    );
    const taskId = created.body.id;

    async function notificationsFor(token: string): Promise<Array<{ id: string; type: string }>> {
      const response = await fetchJson<Array<{ id: string; type: string }>>(
        `${baseUrl}/api/users/me/notifications`,
        { token },
      );
      assert.equal(response.status, 200);
      return response.body;
    }

    // (a) Reassigning the (currently unassigned) task to `member` creates
    // exactly one new "assignment" notification for them.
    const beforeAssign = await notificationsFor(member.token);
    const assigned = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ assigneeId: member.id }) },
    );
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.assigneeId, member.id);
    const afterAssign = await notificationsFor(member.token);
    const newAssignmentNotifications = afterAssign.filter(
      (notification) =>
        notification.type === "assignment" &&
        !beforeAssign.some((existing) => existing.id === notification.id),
    );
    assert.equal(newAssignmentNotifications.length, 1);

    // (b) Saving the task again with the SAME assigneeId (only another
    // field changes) creates no new notification — unlike the existing
    // frontend trigger, this must be gated on the assignee actually
    // changing.
    const unchanged = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",
        token: owner.token,
        body: JSON.stringify({ assigneeId: member.id, title: "Assign Notify Task (edited)" }),
      },
    );
    assert.equal(unchanged.status, 200);
    const afterUnchanged = await notificationsFor(member.token);
    assert.equal(afterUnchanged.length, afterAssign.length);

    // (d) Unassigning (assigneeId -> null) creates no notification for the
    // now-former assignee.
    const unassigned = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ assigneeId: null }) },
    );
    assert.equal(unassigned.status, 200);
    assert.equal(unassigned.body.assigneeId, null);
    const afterUnassigned = await notificationsFor(member.token);
    assert.equal(afterUnassigned.length, afterUnchanged.length);

    // (c) Self-assignment (the actor assigns the task to themselves)
    // creates no notification.
    const beforeSelfAssign = await notificationsFor(owner.token);
    const selfAssigned = await fetchJson<TaskResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ assigneeId: owner.id }) },
    );
    assert.equal(selfAssigned.status, 200);
    assert.equal(selfAssigned.body.assigneeId, owner.id);
    const afterSelfAssign = await notificationsFor(owner.token);
    assert.equal(afterSelfAssign.length, beforeSelfAssign.length);
  });
});
