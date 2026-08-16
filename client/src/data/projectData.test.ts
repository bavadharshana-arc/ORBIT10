import { describe, expect, test } from "vitest";
import { formatProjectDue, getProjectStatus } from "./projectData";
import type { Project } from "../types/dashboard";

function baseProject(overrides: Partial<Project>): Project {
  return {
    id: "p1",
    name: "Project",
    tag: "Product",
    progress: 0,
    tasks: "0 / 0 tasks",
    due: "",
    ...overrides,
  };
}

describe("formatProjectDue", () => {
  test("an invalid date falls back to 'No due date'", () => {
    expect(formatProjectDue("")).toBe("No due date");
  });

  test("today reads 'Due today'", () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(formatProjectDue(iso)).toBe("Due today");
  });

  test("a past date reads 'Overdue by N day(s)'", () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const iso = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
    expect(formatProjectDue(iso)).toBe("Overdue by 3 days");
  });
});

describe("getProjectStatus", () => {
  test("an explicit status wins over progress", () => {
    expect(getProjectStatus(baseProject({ progress: 10, status: "archived" }))).toBe("archived");
  });

  test("100% progress with no explicit status is 'completed'", () => {
    expect(getProjectStatus(baseProject({ progress: 100 }))).toBe("completed");
  });

  test("less than 100% progress with no explicit status is 'active'", () => {
    expect(getProjectStatus(baseProject({ progress: 40 }))).toBe("active");
  });
});
