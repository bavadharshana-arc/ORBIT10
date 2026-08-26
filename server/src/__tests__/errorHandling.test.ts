import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { cleanupTestUsers } from "./testHelpers";

/**
 * ORBIT Step 9 (Error Handling + Logging) — focused coverage for the two
 * behaviors app.ts's notFoundHandler/errorHandler (error.middleware.ts)
 * exist to fix: a malformed JSON request body no longer leaks Express's
 * default HTML page (raw error message + full server-side stack trace),
 * and an unmatched route no longer falls through to Express's default
 * "Cannot GET /path" HTML page. Both must return the same `{ error: string }`
 * JSON contract every other response in this API already uses.
 */
describe("error handling (Step 9)", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();
  });

  test("a malformed JSON body is rejected as 400 with a safe, generic message — no stack trace or parser detail leaks", async () => {
    const response = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: "{not valid json",
    });

    assert.equal(response.status, 400);
    // Deep-equal (not just checking the `error` key) — proves nothing
    // else (a `stack` field, the raw parser message, a file path) rode
    // along in the response body.
    assert.deepEqual(response.body, { error: "Invalid request" });
  });

  test("a malformed JSON body is rejected the same way even on an authenticated route, before auth ever runs", async () => {
    const response = await fetchJson<{ error: string }>(`${baseUrl}/api/workspaces`, {
      method: "POST",
      token: "not-a-real-token",
      body: "{ also not valid",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Invalid request" });
  });

  test("an unknown route 404s with the API's own JSON contract, not Express's default HTML page", async () => {
    const response = await fetchJson<{ error: string }>(`${baseUrl}/api/this-route-does-not-exist`);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Not found" });
  });

  test("an unknown route 404s the same way regardless of HTTP method", async () => {
    const response = await fetchJson<{ error: string }>(`${baseUrl}/api/this-route-does-not-exist`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Not found" });
  });

  test("a real, existing route is unaffected by the catch-all handlers", async () => {
    const response = await fetchJson<{ status: string }>(`${baseUrl}/api/health`);

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
  });
});
