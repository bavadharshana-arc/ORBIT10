import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, fetchJson } from "./testServer";
import { uniqueEmail, cleanupTestUsers } from "./testHelpers";
import { prisma } from "../lib/prisma";
import { hashResetToken } from "../utils/token";
import { resetEmailProviderCache } from "../services/email.service";

describe("password reset", () => {
  let baseUrl: string;
  let close: () => Promise<void>;
  let originalEmailSmtpHost: string | undefined;

  before(async () => {
    // .env's real EMAIL_SMTP_HOST leaks into this process via lib/prisma.ts's
    // `import "dotenv/config"`, which makes email.service.ts think a real
    // provider is configured and suppresses the dev-only devResetToken these
    // tests rely on. Clear it and reset the cached provider so tests get the
    // console/dev fallback described in the test names below.
    originalEmailSmtpHost = process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_HOST;
    resetEmailProviderCache();

    ({ baseUrl, close } = await startTestServer());
  });

  after(async () => {
    await close();
    await cleanupTestUsers();

    if (originalEmailSmtpHost === undefined) {
      delete process.env.EMAIL_SMTP_HOST;
    } else {
      process.env.EMAIL_SMTP_HOST = originalEmailSmtpHost;
    }
    resetEmailProviderCache();
  });

  async function registerUser(label: string) {
    const email = uniqueEmail(label);
    await fetchJson(`${baseUrl}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: "Reset Test", email, password: "OriginalPass123!" }),
    });
    return email;
  }

  test("forgot-password issues a token (dev fallback, no email provider configured in tests) and reset-password changes the real password", async () => {
    const email = await registerUser("reset-flow");

    const forgot = await fetchJson<{ message: string; devResetToken?: string }>(
      `${baseUrl}/api/auth/forgot-password`,
      { method: "POST", body: JSON.stringify({ email }) },
    );
    assert.equal(forgot.status, 200);
    assert.equal(typeof forgot.body.devResetToken, "string", "no EMAIL_SMTP_HOST is configured for tests, so the dev fallback token must be present");

    const token = forgot.body.devResetToken!;

    const reset = await fetchJson(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token, password: "BrandNewPass123!" }),
    });
    assert.equal(reset.status, 200);

    // The real, hashed password actually changed.
    const oldLogin = await fetchJson(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "OriginalPass123!" }),
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await fetchJson<{ token: string }>(`${baseUrl}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password: "BrandNewPass123!" }),
    });
    assert.equal(newLogin.status, 200);
  });

  test("a reset token is single-use — reusing it after a successful reset is rejected", async () => {
    const email = await registerUser("single-use");

    const forgot = await fetchJson<{ devResetToken?: string }>(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const token = forgot.body.devResetToken!;

    const first = await fetchJson(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token, password: "FirstReset123!" }),
    });
    assert.equal(first.status, 200);

    const second = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token, password: "SecondReset123!" }),
    });
    assert.equal(second.status, 400);
  });

  test("an expired reset token is rejected", async () => {
    const email = await registerUser("expired");
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Directly manufacture an already-expired token the same way
    // requestPasswordReset would (hashed, never the raw value) — there's
    // no practical way to wait a real hour out in a test.
    const rawToken = "test-expired-token-value";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashResetToken(rawToken),
        passwordResetExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token: rawToken, password: "WontWork123!" }),
    });
    assert.equal(res.status, 400);
  });

  test("an unknown reset token is rejected", async () => {
    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token: "this-token-does-not-exist", password: "WontWork123!" }),
    });
    assert.equal(res.status, 400);
  });

  test("forgot-password gives the same generic response for an unregistered email (no enumeration) and never returns a token for it", async () => {
    const res = await fetchJson<{ message: string; devResetToken?: string }>(
      `${baseUrl}/api/auth/forgot-password`,
      { method: "POST", body: JSON.stringify({ email: uniqueEmail("never-registered") }) },
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.devResetToken, undefined);
  });

  test("reset-password rejects a password shorter than 8 characters", async () => {
    const email = await registerUser("short-pw");
    const forgot = await fetchJson<{ devResetToken?: string }>(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const res = await fetchJson<{ error: string }>(`${baseUrl}/api/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ token: forgot.body.devResetToken, password: "short" }),
    });
    assert.equal(res.status, 400);
  });
});
