/**
 * ORBIT — Phase 4 demo data seed.
 *
 * Creates a permanent, realistic "Demo Workspace" for showcasing the product.
 * Safe to run multiple times: every record is looked up first and only
 * created if missing (or updated in place), so re-running never duplicates
 * demo data and never touches records it doesn't own.
 *
 * Run with: npx prisma db seed
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";

// Demo credentials are intentionally fake and clearly labelled — not real secrets.
const DEMO_PASSWORD = "DemoPass123!";
const DEMO_WORKSPACE_NAME = "Demo Workspace";

const DEMO_USERS = [
  { email: "demo.owner@orbitdemo.local", name: "Demo Owner", role: "OWNER" },
  { email: "demo.pm@orbitdemo.local", name: "Demo Product Manager", role: "ADMIN" },
  { email: "demo.dev@orbitdemo.local", name: "Demo Developer", role: "MEMBER" },
  { email: "demo.designer@orbitdemo.local", name: "Demo Designer", role: "MEMBER" },
] as const;

/**
 * Phase 23 — RBAC demo accounts. Separate from DEMO_USERS above on
 * purpose: DEMO_USERS populates the realistic "Demo Workspace" showcase
 * (named by job function, mapped to real WorkspaceRole values for that
 * workspace); these 5 exist purely so client/src/context/AuthContext.tsx's
 * client-side AuthRole demo-switcher (Owner/Admin/Project Manager/Member/
 * Viewer — a UI-gating vocabulary decoupled from WorkspaceRole, see
 * types/auth.ts) has a real, database-backed login behind each of the 5
 * emails it already referenced before Phase 23. They intentionally don't
 * join any workspace — AuthRole gating never checks WorkspaceMember.
 */
const RBAC_DEMO_PASSWORD = "demo1234";
const RBAC_DEMO_USERS = [
  { email: "owner@orbit.dev", name: "Maya Chen" },
  { email: "admin@orbit.dev", name: "Ari Admin" },
  { email: "pm@orbit.dev", name: "Pat Manager" },
  { email: "member@orbit.dev", name: "Mo Member" },
  { email: "viewer@orbit.dev", name: "Vic Viewer" },
] as const;

type TaskSeed = { title: string; status: string; priority: string; assignee: string; due: string; body: string };
type ProjectSeed = { name: string; description: string; tasks: TaskSeed[] };

const PROJECTS: ProjectSeed[] = [
  {
    name: "Demo Project: Website Redesign",
    description:
      "Revamping the public marketing site with a modern design system, improved performance, and better accessibility.",
    tasks: [
      { title: "Audit current site accessibility", status: "Completed", priority: "Medium", assignee: "Demo Designer", due: "2026-07-28", body: "Run an a11y pass against WCAG 2.1 AA and log findings." },
      { title: "Define new design system tokens", status: "Completed", priority: "High", assignee: "Demo Designer", due: "2026-08-02", body: "Colors, spacing, and typography tokens for the new site." },
      { title: "Build responsive homepage layout", status: "In Progress", priority: "High", assignee: "Demo Developer", due: "2026-08-18", body: "Implement the new homepage using the design system tokens." },
      { title: "Migrate blog to new CMS templates", status: "In Progress", priority: "Medium", assignee: "Demo Developer", due: "2026-08-22", body: "Port existing blog posts to the redesigned templates." },
      { title: "Set up Lighthouse performance budget in CI", status: "To Do", priority: "Medium", assignee: "Demo Developer", due: "2026-08-29", body: "Fail CI if Lighthouse performance score drops below 90." },
      { title: "Write launch announcement copy", status: "To Do", priority: "Low", assignee: "Demo Product Manager", due: "2026-09-01", body: "Draft blog post and social copy for the relaunch." },
      { title: "Cross-browser QA pass", status: "Blocked", priority: "High", assignee: "Unassigned", due: "2026-09-05", body: "Blocked on homepage layout completion before QA can start." },
    ],
  },
  {
    name: "Demo Project: Mobile App Launch",
    description:
      "Building and shipping the v1 native mobile app for iOS and Android, from onboarding through payments.",
    tasks: [
      { title: "Implement OAuth login flow", status: "Completed", priority: "High", assignee: "Demo Developer", due: "2026-07-20", body: "Google and Apple sign-in for the mobile app." },
      { title: "Design onboarding screens", status: "Completed", priority: "Medium", assignee: "Demo Designer", due: "2026-07-25", body: "First-run flow introducing core app features." },
      { title: "Integrate push notifications", status: "In Progress", priority: "High", assignee: "Demo Developer", due: "2026-08-19", body: "Wire up APNs/FCM for task reminders." },
      { title: "Add in-app subscription billing", status: "In Progress", priority: "Urgent", assignee: "Demo Developer", due: "2026-08-17", body: "App Store and Play Store billing integration." },
      { title: "Prepare App Store & Play Store listings", status: "In Review", priority: "Medium", assignee: "Demo Product Manager", due: "2026-08-24", body: "Screenshots, descriptions, and metadata for both stores." },
      { title: "Beta test with 20 external users", status: "To Do", priority: "High", assignee: "Demo Product Manager", due: "2026-08-30", body: "Recruit and onboard a closed beta cohort." },
      { title: "Fix crash on Android 14 cold start", status: "Blocked", priority: "Urgent", assignee: "Demo Developer", due: "2026-08-16", body: "Blocked pending crash logs from the beta cohort." },
    ],
  },
  {
    name: "Demo Project: Internal Tooling",
    description:
      "Internal dashboards and automation tools that help the ops and support teams work faster.",
    tasks: [
      { title: "Build ops dashboard MVP", status: "Completed", priority: "Medium", assignee: "Demo Developer", due: "2026-07-15", body: "Ship the first version of the internal ops dashboard." },
      { title: "Automate weekly usage report email", status: "Completed", priority: "Low", assignee: "Demo Developer", due: "2026-07-22", body: "Cron job that emails a usage summary every Monday." },
      { title: "Add role-based access to admin panel", status: "In Progress", priority: "High", assignee: "Demo Developer", due: "2026-08-21", body: "Restrict admin panel sections by team role." },
      { title: "Design empty & error states for dashboard", status: "In Progress", priority: "Low", assignee: "Demo Designer", due: "2026-08-27", body: "Cover zero-data and failure states in the dashboard UI." },
      { title: "Write runbook for on-call escalation", status: "To Do", priority: "Medium", assignee: "Demo Owner", due: "2026-09-02", body: "Document escalation steps for the on-call rotation." },
      { title: "Audit third-party API rate limits", status: "To Do", priority: "Medium", assignee: "Demo Developer", due: "2026-09-08", body: "Check current usage against provider rate limits." },
      { title: "Retire legacy CSV export script", status: "Backlog", priority: "Low", assignee: "Unassigned", due: "2026-09-15", body: "Replace the old export script with the new dashboard export." },
    ],
  },
];

/**
 * Task.status/priority/assigneeId/dueDate are real columns as of Phase 8A.
 * "Unassigned" has no corresponding demo user, so it resolves to `null`
 * (an unassigned task) rather than a fabricated user.
 */
const resolveAssigneeId = (
  assigneeName: string,
  usersByName: Record<string, { id: string }>,
): string | null => {
  if (assigneeName === "Unassigned") return null;
  return usersByName[assigneeName]?.id ?? null;
};

async function getOrCreateWorkspace(ownerId: string) {
  const existing = await prisma.workspace.findFirst({
    where: {
      name: DEMO_WORKSPACE_NAME,
      workspaceMembers: { some: { userId: ownerId } },
    },
  });
  if (existing) return existing;

  return prisma.workspace.create({ data: { name: DEMO_WORKSPACE_NAME } });
}

async function getOrCreateProject(workspaceId: string, name: string, description: string) {
  const existing = await prisma.project.findFirst({ where: { workspaceId, name } });
  if (existing) {
    return prisma.project.update({ where: { id: existing.id }, data: { description } });
  }
  return prisma.project.create({ data: { name, description, workspaceId } });
}

/**
 * Phase 19 Frontend Integration follow-up (Persist Project people) —
 * without this, the demo projects above had zero ProjectMember rows at
 * all (only real WorkspaceMember rows), so every project-scoped action
 * gated by requireProjectMembership (project.middleware.ts) — posting a
 * discussion, replying, reacting, pin/unpin — genuinely 403'd for every
 * demo user against every demo project, workspace OWNER included:
 * requireProjectMembership checks real ProjectMember rows independently
 * of workspace role, by design (see its own doc comment). Idempotent,
 * same lookup-then-create pattern as every other helper in this file.
 */
async function getOrCreateProjectMember(projectId: string, userId: string, role: string) {
  const existing = await prisma.projectMember.findUnique({ where: { userId_projectId: { userId, projectId } } });
  if (existing) {
    if (existing.role === role) return existing;
    return prisma.projectMember.update({ where: { id: existing.id }, data: { role } });
  }
  return prisma.projectMember.create({ data: { projectId, userId, role } });
}

type TaskFields = {
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date;
};

async function getOrCreateTask(projectId: string, title: string, fields: TaskFields) {
  const existing = await prisma.task.findFirst({ where: { projectId, title } });
  if (existing) {
    return prisma.task.update({ where: { id: existing.id }, data: fields });
  }
  return prisma.task.create({ data: { title, projectId, ...fields } });
}

async function main() {
  console.log("Seeding demo workspace...");

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users: Record<string, { id: string }> = {};
  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name },
      create: { email: demoUser.email, name: demoUser.name, password: passwordHash },
    });
    users[demoUser.email] = user;
  }

  const usersByName: Record<string, { id: string }> = {};
  for (const demoUser of DEMO_USERS) {
    usersByName[demoUser.name] = users[demoUser.email]!;
  }

  const owner = users[DEMO_USERS[0].email]!;
  const workspace = await getOrCreateWorkspace(owner.id);

  for (const demoUser of DEMO_USERS) {
    const user = users[demoUser.email]!;
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: { role: demoUser.role },
      create: { userId: user.id, workspaceId: workspace.id, role: demoUser.role },
    });
  }

  // Every demo user is a real member of every demo project — they're
  // each assigned tasks across all three projects above, so they need
  // real ProjectMember rows to actually act on them (comment, post
  // discussions, ...), not just workspace membership. OWNER keeps
  // "Owner" at the project level too; the rest get "Editor" (they're
  // actively doing the work, not just viewing/commenting on it).
  const PROJECT_ROLE_BY_WORKSPACE_ROLE: Record<string, string> = {
    OWNER: "Owner",
    ADMIN: "Editor",
    MEMBER: "Editor",
  };

  let taskCount = 0;
  for (const projectSeed of PROJECTS) {
    const project = await getOrCreateProject(workspace.id, projectSeed.name, projectSeed.description);

    for (const demoUser of DEMO_USERS) {
      const user = users[demoUser.email]!;
      await getOrCreateProjectMember(project.id, user.id, PROJECT_ROLE_BY_WORKSPACE_ROLE[demoUser.role]!);
    }

    for (const taskSeed of projectSeed.tasks) {
      await getOrCreateTask(project.id, taskSeed.title, {
        description: taskSeed.body,
        status: taskSeed.status,
        priority: taskSeed.priority,
        assigneeId: resolveAssigneeId(taskSeed.assignee, usersByName),
        dueDate: new Date(`${taskSeed.due}T00:00:00.000Z`),
      });
      taskCount += 1;
    }
  }

  console.log(
    `Demo workspace seeded: workspace="${workspace.name}" (${workspace.id}), ` +
      `users=${DEMO_USERS.length}, projects=${PROJECTS.length}, tasks=${taskCount}.`,
  );

  // Phase 23 — RBAC demo accounts (see RBAC_DEMO_USERS above). Independent
  // of the Demo Workspace seeded above: no workspace/project attachment.
  const rbacPasswordHash = await hashPassword(RBAC_DEMO_PASSWORD);
  for (const demoUser of RBAC_DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name },
      create: { email: demoUser.email, name: demoUser.name, password: rbacPasswordHash },
    });
  }
  console.log(`RBAC demo accounts seeded: ${RBAC_DEMO_USERS.length} (password: "${RBAC_DEMO_PASSWORD}").`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
