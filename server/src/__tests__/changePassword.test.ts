import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

describe("change password", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  async function registerAndLogin(label: string) {
    const email = uniqueEmail(label);
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Change Password Test", email, password: "OriginalPass123!" }),
    });
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "OriginalPass123!" }),
    });
    return { email, token: login.body.token };
  }

  test("rejects the wrong current password", async () => {
    const { token } = await registerAndLogin("wrong-current");

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/password`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ currentPassword: "NotMyPassword1", newPassword: "WontMatter123!" }),
    });

    assert.equal(res.status, 400);
  });

  test("updates the password for real when the current password is correct", async () => {
    const { email, token } = await registerAndLogin("correct-current");

    const res = await fetchJson(`${baseUrl}/api/users/me/password`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ currentPassword: "OriginalPass123!", newPassword: "UpdatedPass123!" }),
    });
    assert.equal(res.status, 200);

    const oldLogin = await fetchJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "OriginalPass123!" }),
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await fetchJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "UpdatedPass123!" }),
    });
    assert.equal(newLogin.status, 200);
  });

  test("rejects a new password shorter than 8 characters", async () => {
    const { token } = await registerAndLogin("short-new");

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me/password`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ currentPassword: "OriginalPass123!", newPassword: "short" }),
    });
    assert.equal(res.status, 400);
  });

  test("requires authentication", async () => {
    const res = await fetchJson(`${baseUrl}/api/users/me/password`, {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "a", newPassword: "AnythingLongEnough1" }),
    });
    assert.equal(res.status, 401);
  });
});
