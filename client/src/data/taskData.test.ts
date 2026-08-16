import { describe, expect, test } from "vitest";
import { getDueGroup, getUpcomingTasks, type Task } from "./taskData";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

describe("getDueGroup", () => {
  test("no due date is 'No Due Date'", () => {
    expect(getDueGroup(undefined)).toBe("No Due Date");
  });

  test("a date before today is 'Overdue'", () => {
    expect(getDueGroup(offsetDate(-1))).toBe("Overdue");
  });

  test("today is 'Today'", () => {
    expect(getDueGroup(offsetDate(0))).toBe("Today");
  });

  test("tomorrow is 'Tomorrow'", () => {
    expect(getDueGroup(offsetDate(1))).toBe("Tomorrow");
  });

  test("within the next week (but not tomorrow) is 'This Week'", () => {
    expect(getDueGroup(offsetDate(5))).toBe("This Week");
  });

  test("more than a week out is 'Later'", () => {
    expect(getDueGroup(offsetDate(30))).toBe("Later");
  });

  test("an unparseable date falls back to 'No Due Date' instead of throwing", () => {
    expect(getDueGroup("not-a-date")).toBe("No Due Date");
  });
});

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Task",
    description: "",
    project: "Some Project",
    due: "",
    dueGroup: "No Due Date",
    priority: "Medium",
    status: "To Do",
    assignees: [],
    comments: [],
    activity: [],
    ...overrides,
  };
}

describe("getUpcomingTasks", () => {
  test("excludes completed tasks even if due soon", () => {
    const tasks = [makeTask({ id: "t1", dueDate: offsetDate(0), status: "Completed" })];
    expect(getUpcomingTasks(tasks)).toHaveLength(0);
  });

  test("includes Today/Tomorrow/This Week tasks, sorted by due date", () => {
    const tasks = [
      makeTask({ id: "t-later", dueDate: offsetDate(6) }),
      makeTask({ id: "t-today", dueDate: offsetDate(0) }),
      makeTask({ id: "t-tomorrow", dueDate: offsetDate(1) }),
      makeTask({ id: "t-too-far", dueDate: offsetDate(30) }),
    ];

    const upcoming = getUpcomingTasks(tasks);
    expect(upcoming.map((t) => t.id)).toEqual(["t-today", "t-tomorrow", "t-later"]);
  });

  test("respects the limit", () => {
    const tasks = [
      makeTask({ id: "t1", dueDate: offsetDate(0) }),
      makeTask({ id: "t2", dueDate: offsetDate(1) }),
      makeTask({ id: "t3", dueDate: offsetDate(2) }),
    ];
    expect(getUpcomingTasks(tasks, 2)).toHaveLength(2);
  });
});
