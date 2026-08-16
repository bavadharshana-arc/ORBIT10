import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

describe("delete account", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  test("refuses to delete a protected demo account", async () => {
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: "demo.dev@orbitdemo.local", password: "DemoPass123!" }),
    });
    assert.equal(login.status, 200, "demo.dev@orbitdemo.local must exist — run `npm run seed` first");

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/users/me`, {
      method: "DELETE",
      token: login.body.token,
    });
    assert.equal(res.status, 403);

    // The account genuinely still exists and can still log in — the
    // refusal wasn't just a response-shape lie.
    const stillWorks = await fetchJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: "demo.dev@orbitdemo.local", password: "DemoPass123!" }),
    });
    assert.equal(stillWorks.status, 200);
  });

  test("refuses to delete an RBAC demo account too", async () => {
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: "viewer@orbit.dev", password: "demo1234" }),
    });
    assert.equal(login.status, 200, "viewer@orbit.dev must exist — run `npm run seed` first");

    const res = await fetchJson(`${baseUrl}/api/users/me`, { method: "DELETE", token: login.body.token });
    assert.equal(res.status, 403);
  });

  test("deletes a real, non-demo account for real", async () => {
    const email = uniqueEmail("delete-me");
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Delete Me", email, password: "DeleteMe123!" }),
    });
    const login = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "DeleteMe123!" }),
    });

    const res = await fetchJson(`${baseUrl}/api/users/me`, { method: "DELETE", token: login.body.token });
    assert.equal(res.status, 204);

    const loginAfter = await fetchJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "DeleteMe123!" }),
    });
    assert.equal(loginAfter.status, 401, "the account should genuinely no longer exist");
  });

  test("requires authentication", async () => {
    const res = await fetchJson(`${baseUrl}/api/users/me`, { method: "DELETE" });
    assert.equal(res.status, 401);
  });
});
