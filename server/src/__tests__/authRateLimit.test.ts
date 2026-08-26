import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";

// Deliberately tiny for this test process only — low enough to exercise
// the 429 path in a handful of requests instead of waiting out the real
// (env-configurable) production defaults of 20/10 per 15 minutes.
const LOGIN_LIMIT = 3;
const FORGOT_PASSWORD_LIMIT = 3;

describe("auth rate limiting", () => {
  let baseUrl: string;
  let close: () => Promise<void>;
  let originalLoginMax: string | undefined;
  let originalForgotMax: string | undefined;

  before(async () => {
    // rateLimit.middleware.ts reads these env vars per-request (not once
    // at startup), so overriding them here takes effect immediately for
    // every request this file makes — no import-order dependency, same
    // shape as passwordReset.test.ts's EMAIL_SMTP_HOST isolation.
    originalLoginMax = process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    originalForgotMax = process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX;
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = String(LOGIN_LIMIT);
    process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX = String(FORGOT_PASSWORD_LIMIT);

    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();

    if (originalLoginMax === undefined) {
      delete process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    } else {
      process.env.AUTH_LOGIN_RATE_LIMIT_MAX = originalLoginMax;
    }

    if (originalForgotMax === undefined) {
      delete process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX;
    } else {
      process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX = originalForgotMax;
    }
  });

  async function registerUser(label: string) {
    const email = uniqueEmail(label);
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Rate Limit Test", email, password: "OriginalPass123!" }),
    });
    return email;
  }

  test("login: requests up to the limit keep their normal status code, the next one is rate-limited", async () => {
    const email = await registerUser("login-rate-limit");

    // Wrong password on purpose — proves the limiter doesn't interfere
    // with (or mask) the existing generic 401, only adds a 429 once the
    // limit is actually exceeded.
    for (let i = 0; i < LOGIN_LIMIT; i++) {
      const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password: "WrongPassword123!" }),
      });
      assert.equal(res.status, 401, `request ${i + 1} of ${LOGIN_LIMIT} should still be a normal 401`);
    }

    const overLimit = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "WrongPassword123!" }),
    });
    assert.equal(overLimit.status, 429);
    assert.deepEqual(overLimit.body, { error: "Too many attempts. Please try again later." });
  });

  test("forgot-password: requests up to the limit keep their normal status code, the next one is rate-limited", async () => {
    const email = await registerUser("forgot-password-rate-limit");

    for (let i = 0; i < FORGOT_PASSWORD_LIMIT; i++) {
      const res = await fetchJson<{ message: string }>(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      assert.equal(res.status, 200, `request ${i + 1} of ${FORGOT_PASSWORD_LIMIT} should still be a normal 200`);
    }

    const overLimit = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    assert.equal(overLimit.status, 429);
    assert.deepEqual(overLimit.body, { error: "Too many attempts. Please try again later." });
  });
});
