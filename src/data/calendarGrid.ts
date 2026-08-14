import type { Task } from "./taskData";

/* ============================================================
   MONTH GRID
============================================================ */

export interface MonthGrid {
  rows: number[][];
  outsideKeys: Set<string>;
  monthLabel: string;
  year: number;
  month: number;
}

/**
 * Builds a real calendar grid for the given month, generalizing the
 * hardcoded demo `calendarRows` that used to live in dashboardData.ts
 * (which only covered "July 2026") so MiniCalendar can be reused
 * anywhere a real, current-dated month grid is needed.
 */
export function buildMonthGrid(reference: Date): MonthGrid {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; isOutside: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isOutside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, isOutside: false });
  }
  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailingDay, isOutside: true });
    trailingDay += 1;
  }

  const rows: number[][] = [];
  const outsideKeys = new Set<string>();

  for (let r = 0; r < cells.length / 7; r++) {
    const rowCells = cells.slice(r * 7, r * 7 + 7);
    rows.push(rowCells.map((cell) => cell.day));
    rowCells.forEach((cell, ci) => {
      if (cell.isOutside) outsideKeys.add(`r${r}c${ci}`);
    });
  }

  return {
    rows,
    outsideKeys,
    monthLabel: reference.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    year,
    month,
  };
}

/** Tasks in the given grid month, keyed by day-of-month. */
export function groupTasksByDay(tasks: Task[], year: number, month: number): Map<number, Task[]> {
  const map = new Map<number, Task[]>();

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const [taskYear, taskMonth, taskDay] = task.dueDate.split("-").map(Number);
    if (taskYear !== year || taskMonth - 1 !== month) continue;

    const existing = map.get(taskDay);
    if (existing) existing.push(task);
    else map.set(taskDay, [task]);
  }

  return map;
}

/** Formats a grid year/month (0-indexed) + day-of-month as the "YYYY-MM-DD" key used by `Task.dueDate`. */
export function formatDateKey(year: number, month: number, day: number): string {
  const monthStr = String(month + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr}`;
}
