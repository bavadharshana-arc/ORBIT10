# ORBIT server

Express + Prisma API for ORBIT.

## Local development

```bash
npm run db     # starts a local Prisma Postgres dev server
npm run dev    # starts the API on http://localhost:5000
```

(`npm run dev` at the repo root starts the db, server, and client together.)

## Database & the permanent Demo Workspace

Migrations live in `prisma/migrations` and are applied with:

```bash
npx prisma migrate deploy
# or: npm run migrate:deploy
```

The seed script (`prisma/seed.ts`) creates the permanent **Demo
Workspace** — a realistic workspace with 4 users, 3 projects, and ~21
tasks — plus 5 standalone RBAC demo accounts used to exercise each
AuthRole. It's safe to re-run any number of times: every record is
looked up by a stable key first and only created if missing (or updated
in place), so re-seeding never duplicates data.

Run it explicitly whenever the Demo Workspace needs to be (re)created:

```bash
npx prisma db seed
# or: npm run seed
```

**The server never runs the seed automatically on startup** (`src/index.ts`
only starts the Express app — see for yourself, there's no seed import
there). This is deliberate: auto-seeding on every boot would risk
re-running against a production database on every deploy/restart. Run
`npm run seed` as a one-time, explicit step after `migrate:deploy` when
setting up a new environment (or whenever the Demo Workspace needs to be
recreated from scratch after, say, someone deletes one of its projects
while exploring it) — never wire it into `npm start`/`npm run build`.

### Demo credentials

| Email | Password | Role |
| --- | --- | --- |
| `demo.owner@orbitdemo.local` | `DemoPass123!` | Demo Workspace OWNER |
| `demo.pm@orbitdemo.local` | `DemoPass123!` | Demo Workspace ADMIN |
| `demo.dev@orbitdemo.local` | `DemoPass123!` | Demo Workspace MEMBER |
| `demo.designer@orbitdemo.local` | `DemoPass123!` | Demo Workspace MEMBER |
| `owner@orbit.dev` / `admin@orbit.dev` / `pm@orbit.dev` / `member@orbit.dev` / `viewer@orbit.dev` | `demo1234` | AuthRole demo accounts (no workspace) |

The client's "Explore Demo Workspace" button on `/login` signs in as
`demo.owner@orbitdemo.local`.

None of the accounts above can be deleted through Settings -> Danger
Zone -> Delete account — the backend refuses it (`user.controller.ts`'s
`deleteMe`) so the Demo Workspace stays available no matter who's
exploring it.

## Password reset email

`POST /api/auth/forgot-password` / `POST /api/auth/reset-password`
implement a real, hashed, single-use, expiring (1 hour) reset token, and
can send a real email for it — see `src/services/email.service.ts`.

**To send real emails**, set these in your environment (`.env` locally,
real secrets/env config in production — see `.env`'s commented-out
template for the full list):

| Variable | Required | Purpose |
| --- | --- | --- |
| `EMAIL_SMTP_HOST` | to enable real sending | SMTP host — works with any provider that speaks SMTP (SES, Postmark, SendGrid, Mailgun, a self-hosted relay, ...) |
| `EMAIL_SMTP_PORT` | no (default `587`) | SMTP port |
| `EMAIL_SMTP_SECURE` | no (default `false`) | `"true"` for implicit TLS (port 465) |
| `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASSWORD` | if your provider requires auth | SMTP credentials — never hardcoded, always read from the environment |
| `EMAIL_FROM` | no | From address (defaults to a placeholder) |
| `FRONTEND_URL` | no (default `http://localhost:5173`) | Where the frontend is deployed, used to build the emailed reset link |

**When `EMAIL_SMTP_HOST` is unset** (a fresh local checkout, by design —
see `.env`), ORBIT falls back to its original development-safe behavior:
outside `NODE_ENV=production`, the raw reset token is returned directly
in the forgot-password response (and logged server-side) in place of an
emailed link, so the flow stays fully testable without standing up a
mailbox. That fallback token is never returned once a real provider is
configured, and never returned in production regardless of provider
configuration — a misconfigured production deploy fails closed (no
email sent, nothing leaked) rather than falling back to handing out
working reset tokens over the API.

No specific provider is required or hardcoded — `EmailProvider`
(`src/services/email.service.ts`) is a plain interface; swapping in a
different provider's HTTP API instead of SMTP is a new class implementing
that interface, not a rewrite of the auth flow around it.
