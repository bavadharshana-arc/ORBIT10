import { Prisma } from "../generated/prisma/client";

/**
 * ORBIT Step 9 (Error Handling + Logging).
 *
 * The one shared logging entry point for the whole server — previously
 * only auth.controller.ts had anything like this (its own private
 * logAuthError/isDbUnreachableError), and every other controller's
 * generic 500 catch block logged nothing at all, so a real unexpected
 * error anywhere outside auth left zero trace. Generalized from that
 * exact auth.controller.ts pattern rather than a new design — same
 * `[context] ...` prefix convention, same DB-unreachable special case,
 * just usable from anywhere.
 *
 * Deliberately console-based, not a logging library: nothing here needs
 * levels, transports, or log shipping yet, and adding a dependency for
 * that would be over-building a single-process dev-oriented API.
 */

/**
 * Prisma error codes meaning "the database itself couldn't be reached" —
 * as opposed to a query that ran fine and returned/rejected normally.
 * P1001: can't reach the database server. P1002: reached it but the
 * connection timed out. P1008: operation timed out. P1017: the server
 * closed the connection (e.g. a pooled connection that went stale while
 * idle — the local `prisma dev` database can do this after the app has
 * sat untouched for a long stretch, which is what turns a request hours
 * later into an opaque 500).
 */
const DB_UNREACHABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

export const isDbUnreachableError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && DB_UNREACHABLE_CODES.has(error.code);

/**
 * Logs an unhandled error so it's unmistakable in the server's own
 * console instead of scrolling past as an anonymous 500 with no trace —
 * a database connectivity failure (see isDbUnreachableError above) is
 * tagged and called out separately from a genuinely unexpected bug,
 * since the fix for each is different (restart the local db vs. actually
 * debug code). Never sends anything to the client — this only ever
 * writes to the server's own console.
 */
export const logError = (context: string, error: unknown): void => {
  if (isDbUnreachableError(error)) {
    console.error(
      `[${context}] Database unreachable — is the local Postgres dev server running ` +
        "(\"npm run db\" / \"prisma dev\")? Underlying error:",
      error,
    );
    return;
  }

  console.error(`[${context}] Unhandled error:`, error);
};

/** Plain informational log, same `[context]` prefix convention as logError, for non-error status/startup messages. */
export const logInfo = (context: string, message: string): void => {
  console.log(`[${context}] ${message}`);
};
