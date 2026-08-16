import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

/**
 * Test data helpers (Phase 19 Frontend Integration follow-up — Add
 * Automated Tests). These tests run against the same local Postgres the
 * app itself uses in development (there's no separate test database
 * configured in this project) — every test creates its own uniquely
 * emailed throwaway user(s)/workspace(s)/project(s) via
 * TEST_EMAIL_PREFIX below and cleans them up in an `after` hook, so runs
 * never collide with each other or with the permanent seeded Demo
 * Workspace (server/prisma/seed.ts).
 */
export const TEST_EMAIL_PREFIX = "orbit-test";

export function uniqueEmail(label: string): string {
  return `${TEST_EMAIL_PREFIX}.${label}.${randomUUID()}@example.com`;
}

/** Deletes every User row created by this test run (matched by TEST_EMAIL_PREFIX), cascading to whatever they own per schema.prisma's own onDelete rules. Safe to call even if some were already deleted individually. */
export async function cleanupTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_EMAIL_PREFIX } } });
}
