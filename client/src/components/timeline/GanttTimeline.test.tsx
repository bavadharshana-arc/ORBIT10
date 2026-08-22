import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";

import type { Task } from "../../data/taskData";
import {
  addDays,
  computeDateRange,
  daysBetween,
  startOfDay,
  DAY_WIDTH,
  MIN_BAR_WIDTH,
  TaskGanttRow,
} from "./GanttTimeline";

/**
 * Regression coverage for the "timeline mostly looks empty, only small
 * markers appear" report. Root cause: the real Task model (server side)
 * has no `startDate` column, only `dueDate`, so every real task fell
 * back to a same-day bar whose width was tied to a single day column
 * (as little as 16px in month view) — technically a "bar", but too
 * small to read as one. These tests pin the fix: bars always render at
 * least MIN_BAR_WIDTH regardless of view mode, positioned at the
 * correct due-date column.
 */
const today = startOfDay(new Date("2026-08-18T00:00:00"));

const baseTask: Task = {
  id: "task-1",
  title: "Build responsive homepage layout",
  description: "",
  project: "Demo Project: Website Redesign",
  due: "2026-08-18",
  dueDate: "2026-08-18",
  dueGroup: "Today",
  priority: "High",
  status: "In Progress",
  assignees: [],
  comments: [],
  activity: [],
};

function renderBar(task: Task, dayWidth: number) {
  const { rangeStart, rangeEnd } = computeDateRange([task], today);
  const count = daysBetween(rangeStart, rangeEnd) + 1;
  const days = Array.from({ length: count }, (_, i) => addDays(rangeStart, i));
  const daysWidth = days.length * dayWidth;

  const { container } = render(
    <TaskGanttRow
      task={task}
      days={days}
      today={today}
      dayWidth={dayWidth}
      daysWidth={daysWidth}
      totalWidth={400 + daysWidth}
      onSelect={() => {}}
    />,
  );

  // The bar is the only element whose title starts with the task's
  // title *and* the full tooltip (the label div's title is just the
  // bare title; the bar's is "title · status · priority · ... dates").
  const candidates = Array.from(container.querySelectorAll(`[title^="${task.title}"]`));
  const bar = candidates.find((el) => (el.getAttribute("title") ?? "").includes("·"));
  return { bar, rangeStart, days, dayWidth };
}

describe("TaskGanttRow — horizontal bar rendering", () => {
  test("a task with only a dueDate (no startDate) still renders a real bar, not a bare marker", () => {
    const { bar } = renderBar(baseTask, DAY_WIDTH.week);
    expect(bar).toBeTruthy();
    const style = bar!.getAttribute("style") ?? "";
    expect(style).toContain("border-radius");
    expect(style).not.toContain("rotate(45deg)"); // not the milestone diamond
  });

  test("the fallback single-day bar is at least MIN_BAR_WIDTH wide in week view, not squeezed to one day column", () => {
    const { bar } = renderBar(baseTask, DAY_WIDTH.week);
    const style = bar!.getAttribute("style") ?? "";
    const match = style.match(/width:\s*([\d.]+)px/);
    expect(match).toBeTruthy();
    const width = Number(match![1]);
    expect(width).toBeGreaterThanOrEqual(MIN_BAR_WIDTH);
    // Previously this was dayWidth - 10 = 34px in week view — confirm the
    // fix actually widened it, not just that it happens to already pass.
    expect(width).toBeGreaterThan(DAY_WIDTH.week - 10);
  });

  test("the fallback bar is still at least MIN_BAR_WIDTH wide in month view, where a single day column is only 26px", () => {
    const { bar } = renderBar(baseTask, DAY_WIDTH.month);
    const style = bar!.getAttribute("style") ?? "";
    const match = style.match(/width:\s*([\d.]+)px/);
    const width = Number(match![1]);
    expect(width).toBeGreaterThanOrEqual(MIN_BAR_WIDTH);
  });

  test("the bar's left offset stays exactly aligned to the due date's own day column (no drift)", () => {
    const { bar, rangeStart, dayWidth } = renderBar(baseTask, DAY_WIDTH.week);
    const style = bar!.getAttribute("style") ?? "";
    const match = style.match(/left:\s*([\d.]+)px/);
    const left = Number(match![1]);
    const expectedColumnIndex = daysBetween(rangeStart, startOfDay(new Date("2026-08-18T00:00:00")));
    // The bar has a fixed 5px inset from its column's left edge (see
    // TaskGanttRow's `barLeft + 5`) — assert against that same contract
    // rather than a magic number.
    expect(left).toBe(expectedColumnIndex * dayWidth + 5);
  });

  test("a genuinely multi-day span (both dates real) still renders proportionally wider than the single-day floor", () => {
    const multiDay: Task = { ...baseTask, id: "task-2", startDate: "2026-08-18", dueDate: "2026-08-25", due: "2026-08-25" };
    const { bar } = renderBar(multiDay, DAY_WIDTH.week);
    const style = bar!.getAttribute("style") ?? "";
    const match = style.match(/width:\s*([\d.]+)px/);
    const width = Number(match![1]);
    // 8 days inclusive * 44px - 10 margin = 342px, well past the floor.
    expect(width).toBeGreaterThan(MIN_BAR_WIDTH);
  });
});
