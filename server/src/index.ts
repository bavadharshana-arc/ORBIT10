import { createApp } from "./app";
import { logError, logInfo } from "./lib/logger";

const PORT = 5000;

// ORBIT Step 9 (Error Handling + Logging): a backstop for anything that
// escapes every route's own try/catch and the app-level errorHandler
// (error.middleware.ts) — e.g. a genuinely synchronous throw outside any
// request at all. Logs via the same shared logger, then exits rather
// than limping along in a possibly-corrupted state; this only changes
// *how* the process crashes (a clear log line instead of a raw,
// unformatted stack dump), not whether it crashes.
process.on("uncaughtException", (error) => {
  logError("uncaughtException", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection", reason);
  process.exit(1);
});

const app = createApp();

app.listen(PORT, () => {
  logInfo("index", `ORBIT server running on http://localhost:${PORT}`);
});
