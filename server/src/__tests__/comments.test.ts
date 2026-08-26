import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface CommentResponse {
  id: string;
  text: string;
  authorId: string;
  taskId: string;
}

describe("comments", () => {
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

  /** Creates a workspace/project/task chain owned by a fresh user, returning every id plus the owner. */
  async function createTaskFixture(
    ownerLabel: string,
    workspaceName: string,
    projectName: string,
    taskTitle: string,
  ): Promise<{ owner: RegisteredUser; workspaceId: string; projectId: string; taskId: string }> {
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
    const projectId = project.body.id;

    const task = await fetchJson<{ id: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      { method: "POST", token: owner.token, body: JSON.stringify({ title: taskTitle }) },
    );

    return { owner, workspaceId, projectId, taskId: task.body.id };
  }

  test("create persists a real comment; list returns it after a fresh fetch", async () => {
    const { owner, workspaceId, projectId, taskId } = await createTaskFixture(
      "comment-create-owner",
      "Comment Create Workspace",
      "Comment Create Project",
      "Comment Create Task",
    );

    const created = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: owner.token, body: JSON.stringify({ text: "First comment" }) },
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.text, "First comment");
    assert.equal(created.body.authorId, owner.id);

    const listed = await fetchJson<CommentResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { token: owner.token },
    );
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((comment) => comment.id === created.body.id && comment.text === "First comment"));
  });

  test("create validation rejects empty/missing text; a nonexistent task 404s", async () => {
    const { owner, workspaceId, projectId, taskId } = await createTaskFixture(
      "comment-validation-owner",
      "Comment Validation Workspace",
      "Comment Validation Project",
      "Comment Validation Task",
    );

    const emptyText = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: owner.token, body: JSON.stringify({ text: "   " }) },
    );
    assert.equal(emptyText.status, 400);

    const missingText = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: owner.token, body: JSON.stringify({}) },
    );
    assert.equal(missingText.status, 400);

    const wrongTask = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/not-a-real-task-id/comments`,
      { method: "POST", token: owner.token, body: JSON.stringify({ text: "Should not be created" }) },
    );
    assert.equal(wrongTask.status, 404);
  });

  test("update: only the comment's author can edit it — even a workspace OWNER cannot edit someone else's comment", async () => {
    const { owner, workspaceId, projectId, taskId } = await createTaskFixture(
      "comment-update-owner",
      "Comment Update Workspace",
      "Comment Update Project",
      "Comment Update Task",
    );
    const member = await registerAndLogin("comment-update-member");
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: member.email, role: "MEMBER" }),
    });

    const created = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: member.token, body: JSON.stringify({ text: "Member's original comment" }) },
    );
    const commentId = created.body.id;

    // The workspace OWNER is not the author — edit is author-only, not
    // role-gated, so even an OWNER is forbidden here.
    const ownerEditAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      { method: "PATCH", token: owner.token, body: JSON.stringify({ text: "Hijacked by owner" }) },
    );
    assert.equal(ownerEditAttempt.status, 403);

    const authorEdit = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      { method: "PATCH", token: member.token, body: JSON.stringify({ text: "Edited by the real author" }) },
    );
    assert.equal(authorEdit.status, 200);

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<CommentResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { token: owner.token },
    );
    assert.ok(listed.body.some((comment) => comment.id === commentId && comment.text === "Edited by the real author"));

    const emptyText = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      { method: "PATCH", token: member.token, body: JSON.stringify({ text: "" }) },
    );
    assert.equal(emptyText.status, 400);

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/not-a-real-comment-id`,
      { method: "PATCH", token: member.token, body: JSON.stringify({ text: "New text" }) },
    );
    assert.equal(nonexistent.status, 404);
  });

  test("delete: the author can delete their own comment; a workspace OWNER can delete someone else's; a plain MEMBER cannot", async () => {
    const { owner, workspaceId, projectId, taskId } = await createTaskFixture(
      "comment-delete-owner",
      "Comment Delete Workspace",
      "Comment Delete Project",
      "Comment Delete Task",
    );
    const author = await registerAndLogin("comment-delete-author");
    const otherMember = await registerAndLogin("comment-delete-other-member");

    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: author.email, role: "MEMBER" }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      token: owner.token,
      body: JSON.stringify({ email: otherMember.email, role: "MEMBER" }),
    });

    const commentA = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: author.token, body: JSON.stringify({ text: "Comment A" }) },
    );
    const commentAId = commentA.body.id;

    // A plain MEMBER who is neither the author nor OWNER/ADMIN cannot delete it.
    const memberDeleteAttempt = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentAId}`,
      { method: "DELETE", token: otherMember.token },
    );
    assert.equal(memberDeleteAttempt.status, 403);

    // The author can delete their own comment.
    const authorDelete = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentAId}`,
      { method: "DELETE", token: author.token },
    );
    assert.equal(authorDelete.status, 204);

    // A workspace OWNER can delete someone else's comment (moderation).
    const commentB = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { method: "POST", token: author.token, body: JSON.stringify({ text: "Comment B" }) },
    );
    const commentBId = commentB.body.id;

    const ownerDelete = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/${commentBId}`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(ownerDelete.status, 204);

    const listed = await fetchJson<CommentResponse[]>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
      { token: owner.token },
    );
    assert.equal(
      listed.body.some((comment) => comment.id === commentAId || comment.id === commentBId),
      false,
    );

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments/not-a-real-comment-id`,
      { method: "DELETE", token: owner.token },
    );
    assert.equal(nonexistent.status, 404);
  });

  test("isolation — a legitimate member of a different workspace/task gets 404, a total outsider gets 403", async () => {
    const { owner: ownerA, workspaceId: workspaceIdA, projectId: projectIdA, taskId: taskIdA } =
      await createTaskFixture(
        "comment-isolation-owner-a",
        "Comment Isolation Workspace A",
        "Comment Isolation Project A",
        "Comment Isolation Task A",
      );

    const created = await fetchJson<CommentResponse>(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/tasks/${taskIdA}/comments`,
      { method: "POST", token: ownerA.token, body: JSON.stringify({ text: "Workspace A's private comment" }) },
    );
    const commentId = created.body.id;

    // ownerB is a real, legitimate member of their own Workspace B — with
    // its own real task — and tries to reach Workspace A's comment
    // through that legitimate task's own URL combined with Workspace A's
    // real comment id (the comment-level equivalent of tasks.test.ts's
    // cross-project isolation check).
    const { owner: ownerB, workspaceId: workspaceIdB, projectId: projectIdB, taskId: taskIdB } =
      await createTaskFixture(
        "comment-isolation-owner-b",
        "Comment Isolation Workspace B",
        "Comment Isolation Project B",
        "Comment Isolation Task B",
      );

    const crossUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/workspaces/${workspaceIdB}/projects/${projectIdB}/tasks/${taskIdB}/comments/${commentId}`,
      { method: "PATCH", token: ownerB.token, body: JSON.stringify({ text: "Hijack attempt" }) },
    );
    assert.equal(crossUpdate.status, 404);

    const outsider = await registerAndLogin("comment-isolation-outsider");
    const outsiderList = await fetchJson(
      `${baseUrl}/api/workspaces/${workspaceIdA}/projects/${projectIdA}/tasks/${taskIdA}/comments`,
      { token: outsider.token },
    );
    assert.equal(outsiderList.status, 403);
  });
});
