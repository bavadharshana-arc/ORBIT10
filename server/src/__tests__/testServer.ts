import type { AddressInfo } from "net";
import { createApp } from "../app";

/**
 * Test-only HTTP server helper (Phase 19 Frontend Integration follow-up
 * — Add Automated Tests). Spins the real, fully-wired Express app up on
 * an OS-assigned ephemeral port (`0`) so test files can exercise real
 * HTTP behavior — status codes, auth middleware, route-level
 * authorization — with plain `fetch`, without needing supertest as a
 * dependency and without colliding with a real dev server already
 * listening on :5000.
 */
export async function startTestServer() {
  const app = createApp();

  return new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((res, rej) => server.close((err?: Error) => (err ? rej(err) : res()))),
      });
    });
    server.on("error", reject);
  });
}

export interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

/** Thin fetch wrapper — always sends/parses JSON, matching every ORBIT API route. */
export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit & { token?: string },
): Promise<JsonResponse<T>> {
  const { token, headers, ...rest } = init ?? {};
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body: body as T };
}
