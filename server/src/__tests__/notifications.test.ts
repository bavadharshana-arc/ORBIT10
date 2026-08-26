import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

interface NotificationResponse {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: string;
  title: string;
  message: string;
  actionHref: string | null;
  read: boolean;
}

describe("notifications", () => {
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

  /** Two real users who genuinely share a workspace (userA is the OWNER, userB a real MEMBER). */
  async function createSharedWorkspacePair(
    labelA: string,
    labelB: string,
    workspaceName: string,
  ): Promise<{ userA: RegisteredUser; userB: RegisteredUser }> {
    const userA = await registerAndLogin(labelA);
    const userB = await registerAndLogin(labelB);

    const workspace = await fetchJson<{ id: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ name: workspaceName }),
    });
    await fetchJson(`${baseUrl}/api/workspaces/${workspace.body.id}/members`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ email: userB.email, role: "MEMBER" }),
    });

    return { userA, userB };
  }

  test("create validation rejects invalid type/missing title/missing message/invalid actionHref; a valid self-notification persists unread", async () => {
    const user = await registerAndLogin("notif-create-user");

    const invalidType = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: user.token,
      body: JSON.stringify({ type: "not-a-type", title: "Title", message: "Message" }),
    });
    assert.equal(invalidType.status, 400);

    const missingTitle = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: user.token,
      body: JSON.stringify({ type: "project", message: "Message" }),
    });
    assert.equal(missingTitle.status, 400);

    const missingMessage = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: user.token,
      body: JSON.stringify({ type: "project", title: "Title" }),
    });
    assert.equal(missingMessage.status, 400);

    const invalidActionHref = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: user.token,
      body: JSON.stringify({ type: "project", title: "Title", message: "Message", actionHref: 123 }),
    });
    assert.equal(invalidActionHref.status, 400);

    const created = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: user.token,
      body: JSON.stringify({ type: "project", title: "Real notification", message: "Something happened" }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.recipientId, user.id);
    assert.equal(created.body.read, false);

    const listed = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: user.token,
    });
    assert.equal(listed.status, 200);
    assert.ok(listed.body.some((n) => n.id === created.body.id && n.title === "Real notification"));
  });

  test("a caller can notify a real user who shares a workspace; cannot notify a user who doesn't", async () => {
    const { userA, userB } = await createSharedWorkspacePair(
      "notif-cross-user-a",
      "notif-cross-user-b",
      "Notification Cross-User Workspace",
    );
    const stranger = await registerAndLogin("notif-cross-user-stranger");

    const created = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({
        type: "team",
        title: "You were mentioned",
        message: "userA mentioned you",
        recipientId: userB.id,
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.recipientId, userB.id);
    assert.equal(created.body.actorId, userA.id);

    // It lands in userB's list, not userA's own.
    const userBList = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userB.token,
    });
    assert.ok(userBList.body.some((n) => n.id === created.body.id));

    const userAList = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userA.token,
    });
    assert.equal(userAList.body.some((n) => n.id === created.body.id), false);

    // stranger shares no workspace with userA — forbidden.
    const forbidden = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({
        type: "team",
        title: "Should not be delivered",
        message: "no shared workspace",
        recipientId: stranger.id,
      }),
    });
    assert.equal(forbidden.status, 403);
  });

  test("list is recipient-scoped — one user's notifications never appear in another user's list", async () => {
    const { userA, userB } = await createSharedWorkspacePair(
      "notif-list-isolation-a",
      "notif-list-isolation-b",
      "Notification List Isolation Workspace",
    );

    const ownA = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "A's own notification", message: "..." }),
    });
    const ownB = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ type: "project", title: "B's own notification", message: "..." }),
    });

    const listA = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userA.token,
    });
    assert.ok(listA.body.some((n) => n.id === ownA.body.id));
    assert.equal(listA.body.some((n) => n.id === ownB.body.id), false);

    const listB = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userB.token,
    });
    assert.ok(listB.body.some((n) => n.id === ownB.body.id));
    assert.equal(listB.body.some((n) => n.id === ownA.body.id), false);
  });

  test("update (mark read/unread) persists for real; validates the read field; nonexistent id 404s; another user cannot touch it even if they share a workspace", async () => {
    const { userA, userB } = await createSharedWorkspacePair(
      "notif-update-a",
      "notif-update-b",
      "Notification Update Workspace",
    );

    const created = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "Mark me read", message: "..." }),
    });
    const notificationId = created.body.id;

    const invalidRead = await fetchJson<{ error: string }>(
      `${baseUrl}/api/users/me/notifications/${notificationId}`,
      { method: "PATCH", token: userA.token, body: JSON.stringify({ read: "yes" }) },
    );
    assert.equal(invalidRead.status, 400);

    const updated = await fetchJson<NotificationResponse>(
      `${baseUrl}/api/users/me/notifications/${notificationId}`,
      { method: "PATCH", token: userA.token, body: JSON.stringify({ read: true }) },
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.read, true);

    // Fresh fetch — real persistence, not an echoed mutation response.
    const listed = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userA.token,
    });
    assert.ok(listed.body.some((n) => n.id === notificationId && n.read === true));

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/users/me/notifications/not-a-real-notification-id`,
      { method: "PATCH", token: userA.token, body: JSON.stringify({ read: false }) },
    );
    assert.equal(nonexistent.status, 404);

    // userB shares a workspace with userA but is not the recipient — 404,
    // not 403, since the scoping check is "does this row belong to you",
    // with no workspace concept at all.
    const crossUserUpdate = await fetchJson<{ error: string }>(
      `${baseUrl}/api/users/me/notifications/${notificationId}`,
      { method: "PATCH", token: userB.token, body: JSON.stringify({ read: false }) },
    );
    assert.equal(crossUserUpdate.status, 404);
  });

  test("mark-all-read only touches the caller's own unread notifications", async () => {
    const { userA, userB } = await createSharedWorkspacePair(
      "notif-markall-a",
      "notif-markall-b",
      "Notification Mark-All Workspace",
    );

    const first = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "First", message: "..." }),
    });
    const second = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "Second", message: "..." }),
    });
    const bNotification = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ type: "project", title: "B's own", message: "..." }),
    });

    const markAll = await fetchJson(`${baseUrl}/api/users/me/notifications/read-all`, {
      method: "POST",
      token: userA.token,
    });
    assert.equal(markAll.status, 204);

    const listA = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userA.token,
    });
    assert.ok(listA.body.find((n) => n.id === first.body.id)?.read);
    assert.ok(listA.body.find((n) => n.id === second.body.id)?.read);

    // userB's own notification is untouched by userA's mark-all-read.
    const listB = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userB.token,
    });
    assert.equal(listB.body.find((n) => n.id === bNotification.body.id)?.read, false);
  });

  test("delete removes a single notification for real; nonexistent id 404s; another user cannot delete it; clear-all only removes the caller's own", async () => {
    const { userA, userB } = await createSharedWorkspacePair(
      "notif-delete-a",
      "notif-delete-b",
      "Notification Delete Workspace",
    );

    const toDelete = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "Delete me", message: "..." }),
    });

    // userB cannot delete userA's notification, even sharing a workspace.
    const crossUserDelete = await fetchJson<{ error: string }>(
      `${baseUrl}/api/users/me/notifications/${toDelete.body.id}`,
      { method: "DELETE", token: userB.token },
    );
    assert.equal(crossUserDelete.status, 404);

    const deleted = await fetchJson(`${baseUrl}/api/users/me/notifications/${toDelete.body.id}`, {
      method: "DELETE",
      token: userA.token,
    });
    assert.equal(deleted.status, 204);

    const nonexistent = await fetchJson<{ error: string }>(
      `${baseUrl}/api/users/me/notifications/${toDelete.body.id}`,
      { method: "DELETE", token: userA.token },
    );
    assert.equal(nonexistent.status, 404);

    const remainingA = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userA.token,
      body: JSON.stringify({ type: "project", title: "Survives clear-all check", message: "..." }),
    });
    const bNotification = await fetchJson<NotificationResponse>(`${baseUrl}/api/users/me/notifications`, {
      method: "POST",
      token: userB.token,
      body: JSON.stringify({ type: "project", title: "B's own, untouched", message: "..." }),
    });

    const clearAll = await fetchJson(`${baseUrl}/api/users/me/notifications`, {
      method: "DELETE",
      token: userA.token,
    });
    assert.equal(clearAll.status, 204);

    const listAfterClear = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userA.token,
    });
    assert.equal(listAfterClear.body.some((n) => n.id === remainingA.body.id), false);

    // userB's notification is untouched by userA's clear-all.
    const listB = await fetchJson<NotificationResponse[]>(`${baseUrl}/api/users/me/notifications`, {
      token: userB.token,
    });
    assert.ok(listB.body.some((n) => n.id === bNotification.body.id));
  });
});
