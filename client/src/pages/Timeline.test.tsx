import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { Task } from "../data/taskData";

/**
 * jsdom doesn't implement Element.scrollTo/scrollBy — Timeline.tsx calls
 * these on mount (scrollToToday) purely for UX, unrelated to what these
 * tests actually check, so stub them out rather than fail on the gap.
 */
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
Element.prototype.scrollBy = vi.fn() as unknown as typeof Element.prototype.scrollBy;

const scheduledTask: Task = {
  id: "task-real-1",
  title: "Build responsive homepage layout",
  description: "Make the homepage adapt cleanly across breakpoints.",
  project: "Website Redesign",
  due: "2026-08-20",
  dueDate: "2026-08-20",
  dueGroup: "This Week",
  priority: "High",
  status: "In Progress",
  assignees: [{ initials: "EM", bg: "#AFC5DA", fg: "#20242B" }],
  assigneeId: "user-1",
  comments: [],
  activity: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const otherScheduledTask: Task = {
  ...scheduledTask,
  id: "task-real-2",
  title: "Set up Lighthouse performance budget in CI",
  description: "Fail CI when Lighthouse scores regress.",
  project: "Website Redesign",
  due: "2026-08-22",
  dueDate: "2026-08-22",
  priority: "Medium",
  status: "To Do",
  assignees: [],
  assigneeId: undefined,
};

const unscheduledTask: Task = {
  ...scheduledTask,
  id: "task-real-3",
  title: "Unscheduled follow-up",
  due: "No due date",
  dueDate: undefined,
};

const tasks: Task[] = [scheduledTask, otherScheduledTask, unscheduledTask];

vi.mock("../context/taskContextValue", () => ({
  useTaskContext: () => ({
    tasks,
    setTasks: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    workspaceMembers: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../context/notificationContextValue", () => ({
  useNotificationContext: () => ({ addNotification: vi.fn(), notifications: [] }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Test User", email: "test@orbit.dev" } }),
}));

vi.mock("../hooks/useWorkspaceRole", () => ({
  useWorkspaceRole: () => "OWNER",
  isWorkspaceManager: () => true,
}));

vi.mock("../hooks/useTaskCommentHandlers", () => ({
  useTaskCommentHandlers: () => ({
    handleAddComment: vi.fn(),
    handleEditComment: vi.fn(),
    handleDeleteComment: vi.fn(),
    commentsLoading: false,
    commentsError: null,
  }),
}));

vi.mock("../data/workspaceData", () => ({
  resolveCurrentActor: () => ({ id: "user-1", name: "Test User", initials: "TU", bg: "#AFC5DA", fg: "#20242B" }),
}));

vi.mock("../data/teamData", () => ({
  loadMembers: () => [],
}));

import Timeline from "./Timeline";

/**
 * Investigates the reported "blank task detail panel" on the Timeline
 * page. Reproduces the exact click flow (real task id -> existing
 * TaskDetailsDrawer) end to end against real, correctly-shaped task
 * data — this passes today, i.e. no blank-panel defect reproduces for a
 * well-formed task; see the accompanying report for what was actually
 * changed (LABEL_WIDTH/ellipsis/row padding, plus a real "Task not
 * found" fallback for the one genuine gap found: a selected id that
 * doesn't resolve to a task used to render nothing at all).
 */
describe("Timeline task detail drawer", () => {
  test("clicking a task's title opens the drawer with that exact task's real data", () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    expect(screen.queryByText(scheduledTask.description)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle(scheduledTask.title));

    expect(screen.getByDisplayValue(scheduledTask.title)).toBeInTheDocument();
    expect(screen.getByDisplayValue(scheduledTask.description)).toBeInTheDocument();
    expect(screen.getAllByText(scheduledTask.project).length).toBeGreaterThan(0);
  });

  test("clicking a different task updates the drawer to that task instead", () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle(scheduledTask.title));
    expect(screen.getByDisplayValue(scheduledTask.title)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(otherScheduledTask.title));
    expect(screen.getByDisplayValue(otherScheduledTask.title)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(scheduledTask.title)).not.toBeInTheDocument();
  });

  test("closing the drawer and reopening a different task still works", () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle(scheduledTask.title));
    fireEvent.click(screen.getByLabelText("Close task details"));
    expect(screen.queryByDisplayValue(scheduledTask.title)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle(otherScheduledTask.title));
    expect(screen.getByDisplayValue(otherScheduledTask.title)).toBeInTheDocument();
  });

  test("an unscheduled task (no due date) card opens the same drawer with real data", () => {
    render(
      <MemoryRouter>
        <Timeline />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(unscheduledTask.title));
    expect(screen.getByDisplayValue(unscheduledTask.title)).toBeInTheDocument();
  });

  test("a selected task id that no longer resolves shows 'Task not found', not a blank panel", () => {
    render(
      <MemoryRouter initialEntries={["/timeline?task=does-not-exist"]}>
        <Timeline />
      </MemoryRouter>,
    );

    expect(screen.getByText("Task not found")).toBeInTheDocument();
  });
});
