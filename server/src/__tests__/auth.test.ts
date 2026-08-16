import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

describe("auth", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  test("register creates a real account and returns it without a password", async () => {
    const email = uniqueEmail("register");
    const res = await fetchJson<{ id: string; email: string; name: string }>(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email, password: "TestPass123!" }),
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.email, email);
    assert.equal("password" in res.body, false);
  });

  test("register rejects a duplicate email", async () => {
    const email = uniqueEmail("dup");
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "First", email, password: "TestPass123!" }),
    });

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Second", email, password: "TestPass123!" }),
    });

    assert.equal(res.status, 409);
  });

  test("login succeeds with the right password and returns a usable token", async () => {
    const email = uniqueEmail("login");
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Login Test", email, password: "TestPass123!" }),
    });

    const res = await fetchJson<{ token: string; email: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "TestPass123!" }),
    });

    assert.equal(res.status, 200);
    assert.equal(typeof res.body.token, "string");
    assert.ok(res.body.token.length > 0);

    // The returned token is real — it authenticates a protected route.
    const me = await fetchJson<{ email: string }>(`${baseUrl}/api/users/me`, { token: res.body.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.email, email);
  });

  test("login rejects a wrong password", async () => {
    const email = uniqueEmail("wrongpw");
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Wrong Password", email, password: "TestPass123!" }),
    });

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "NotTheRightPassword1" }),
    });

    assert.equal(res.status, 401);
  });

  test("login rejects an unknown email", async () => {
    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: uniqueEmail("nobody"), password: "Whatever123!" }),
    });

    assert.equal(res.status, 401);
  });

  test("demo login (demo.owner@orbitdemo.local) signs in and lands on the real, permanent Demo Workspace", async () => {
    const res = await fetchJson<{ token: string; email: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: "demo.owner@orbitdemo.local", password: "DemoPass123!" }),
    });

    assert.equal(res.status, 200, "demo.owner@orbitdemo.local must exist — run `npm run seed` first");
    assert.equal(res.body.email, "demo.owner@orbitdemo.local");

    const workspaces = await fetchJson<{ id: string; name: string }[]>(`${baseUrl}/api/workspaces`, {
      token: res.body.token,
    });
    assert.equal(workspaces.status, 200);
    assert.ok(
      workspaces.body.some((workspace) => workspace.name === "Demo Workspace"),
      "demo.owner should belong to the real, permanent Demo Workspace",
    );
  });

  test("a protected route rejects a request with no token", async () => {
    const res = await fetchJson(`${baseUrl}/api/users/me`);
    assert.equal(res.status, 401);
  });

  test("a protected route rejects a garbage token", async () => {
    const res = await fetchJson(`${baseUrl}/api/users/me`, { token: "not-a-real-jwt" });
    assert.equal(res.status, 401);
  });
});
