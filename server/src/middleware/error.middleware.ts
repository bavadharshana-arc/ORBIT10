import type { NextFunction, Request, Response } from "express";
import { logError } from "../lib/logger";

/**
 * ORBIT Step 9 (Error Handling + Logging).
 *
 * Registered last in app.ts, after every real route. Handles exactly the
 * two things no controller's own try/catch ever sees:
 *
 *   1. notFoundHandler — no route matched at all (a typo'd path, an
 *      unimplemented endpoint). Previously fell through to Express's
 *      default "Cannot GET /path" HTML page; now returns the same
 *      `{ error: string }` JSON shape every other 404 in this API
 *      already uses.
 *
 *   2. errorHandler — anything thrown or rejected before it ever reached
 *      a controller's own try/catch (e.g. express.json()'s body-parser
 *      rejecting malformed JSON), or a genuinely uncaught bug. Without
 *      this, Express 5's default error handler sends an HTML page
 *      containing the raw error message *and full stack trace* —
 *      confirmed live against this app's own malformed-JSON-body case
 *      during Step 9's inspection. This always logs server-side (via
 *      the shared logger) and always responds with detail-free JSON —
 *      never the underlying message or stack, regardless of NODE_ENV.
 *
 *      A genuine 4xx from upstream (e.g. body-parser's malformed-JSON
 *      SyntaxError, which carries its own `.status`/`.statusCode` of
 *      400) keeps that status code — it's still the client's mistake,
 *      not a server error — but the message is always the same generic,
 *      safe string, never the real parser message. Anything without a
 *      trustworthy 4xx status is treated as an unexpected server error
 *      and answered with the same `{ error: "Internal server error" }`
 *      every controller's own generic 500 already uses.
 *
 * Every existing controller's own try/catch still runs first and still
 * owns its own status codes/messages exactly as before — this layer
 * only ever catches what nothing else caught.
 */

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: "Not found" });
};

/** True for a genuine 4xx client-error status attached by upstream middleware (e.g. body-parser/http-errors), not a hint we invented ourselves. */
const getUpstreamClientErrorStatus = (err: unknown): number | null => {
  if (typeof err !== "object" || err === null) {
    return null;
  }

  const candidate =
    "statusCode" in err && typeof err.statusCode === "number"
      ? err.statusCode
      : "status" in err && typeof err.status === "number"
        ? err.status
        : null;

  return candidate !== null && candidate >= 400 && candidate < 500 ? candidate : null;
};

// `next` is unused but required — Express only recognizes a 4-arg
// function as error-handling middleware.
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  logError("errorHandler", err);

  if (res.headersSent) {
    return next(err);
  }

  const clientErrorStatus = getUpstreamClientErrorStatus(err);
  if (clientErrorStatus !== null) {
    res.status(clientErrorStatus).json({ error: "Invalid request" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};
