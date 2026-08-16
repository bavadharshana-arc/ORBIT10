import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ListChecks,
  CheckCircle2,
  Clock3,
  Circle,
  AlertTriangle,
  CalendarRange,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  FolderKanban,
  Gauge,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import { getDueGroup, getUpcomingTasks, type Status, type Priority, type Task } from "../data/taskData";
import { useTaskContext } from "../context/taskContextValue";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Pill } from "../components/ui/Pill";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { LIGHT_THEME, DARK_THEME, type ThemeColors } from "../data/chartTheme";

/* ============================================================
   THEME
   Cards, text, and borders use var(--...) from styles/globals.css
   directly in `style`/className, which already reacts to
   html[data-theme="dark"] with no extra work.

   Lucide icons, ProgressRing, and Recharts marks are different:
   they all paint through raw SVG attributes (stroke/fill), not
   the `style` prop, where CSS custom property resolution isn't
   dependable across engines. Those consumers get literal hex
   from chartTheme.ts instead, mirroring globals.css's light/dark
   tokens exactly and switching in JS based on the active theme
   (see useIsDarkMode, shared with the project workspace's
   Analytics tab).
============================================================ */

/* ============================================================
   TOP-SECTION TIME RANGE (KPI cards)
============================================================ */

type TimeRange = "all" | "week" | "month";

const RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

/**
 * Week runs Monday–Sunday, matching how most of Orbit's team
 * plans work, rather than the locale-default Sunday start.
 * `weeksAgo` shifts the window backward, used to build the
 * "previous period" comparison for KPI % change badges.
 */
function isDueThisWeek(dueDate?: string, weeksAgo = 0): boolean {
  if (!dueDate) return false;

  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return false;

  const target = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const daysSinceMonday = (todayStart.getDay() + 6) % 7;
  const monday = new Date(todayStart);
  monday.setDate(monday.getDate() - daysSinceMonday - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  return target >= monday && target <= sunday;
}

function isDueThisMonth(dueDate?: string, monthsAgo = 0): boolean {
  if (!dueDate) return false;

  const [year, month] = dueDate.split("-").map(Number);
  if (!year || !month) return false;

  const today = new Date();
  const ref = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  return year === ref.getFullYear() && month === ref.getMonth() + 1;
}

/* ============================================================
   KPI CARD
============================================================ */

function ChangeBadge({ value, theme }: { value: number; theme: ThemeColors }) {
  if (value === 0) {
    return (
      <span className="flex items-center" style={{ gap: 3, fontSize: 10.5, fontWeight: 700, color: theme.text3 }}>
        <Minus size={10} strokeWidth={2.4} />
        0%
      </span>
    );
  }

  const isUp = value > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span className="flex items-center" style={{ gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--blue-dark)" }}>
      <Icon size={10} strokeWidth={2.4} />
      {Math.abs(value)}%
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  sublabel?: string;
  changePct?: number | null;
  icon: LucideIcon;
  ring?: number;
  emphasis?: boolean;
  theme: ThemeColors;
}

function KpiCard({ label, value, sublabel, changePct, icon: Icon, ring, emphasis, theme }: KpiCardProps) {
  return (
    <div
      className="shadow-float lift fade-in"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "16px 18px",
      }}
    >
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: emphasis ? "var(--text)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} strokeWidth={1.8} color={emphasis ? theme.surface : theme.blueDark} />
        </div>
        {ring !== undefined ? (
          <ProgressRing value={ring} size={36} stroke={3.5} color={theme.blueDark} track={theme.border} />
        ) : null}
      </div>

      <div className="font-display" style={{ fontSize: 25, fontWeight: 600, lineHeight: 1.1, marginBottom: 4, color: "var(--text)" }}>
        {value}
      </div>

      <div className="flex items-center" style={{ justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
        {changePct !== undefined && changePct !== null ? (
          <ChangeBadge value={changePct} theme={theme} />
        ) : sublabel ? (
          <span style={{ fontSize: 10.5, color: "var(--blue-dark)", fontWeight: 700 }}>{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   TREND CHART — TIME RANGE (7D / 30D / 3M / 6M / 1Y)
============================================================ */

type ChartRange = "7D" | "30D" | "3M" | "6M" | "1Y";

const CHART_RANGE_OPTIONS: { key: ChartRange; label: string }[] = [
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
];

const CHART_RANGE_CONFIG: Record<ChartRange, { unit: "day" | "week" | "month"; buckets: number; description: string }> = {
  "7D": { unit: "day", buckets: 7, description: "last 7 days" },
  "30D": { unit: "day", buckets: 30, description: "last 30 days" },
  "3M": { unit: "week", buckets: 13, description: "last 3 months" },
  "6M": { unit: "month", buckets: 6, description: "last 6 months" },
  "1Y": { unit: "month", buckets: 12, description: "last year" },
};

interface TrendBucket {
  start: Date;
  end: Date;
  label: string;
}

function parseDueDate(dueDate?: string): Date | null {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Builds the buckets a trend range is aggregated into, trailing
 * backward from today — day buckets for 7D/30D, week buckets for
 * 3M, calendar-month buckets for 6M/1Y.
 */
function buildTrendBuckets(range: ChartRange): TrendBucket[] {
  const config = CHART_RANGE_CONFIG[range];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (config.unit === "day") {
    return Array.from({ length: config.buckets }, (_, index) => {
      const offset = config.buckets - 1 - index;
      const date = new Date(todayStart);
      date.setDate(date.getDate() - offset);
      return {
        start: date,
        end: date,
        label: date.toLocaleDateString("en-US", config.buckets <= 7 ? { weekday: "short" } : { month: "short", day: "numeric" }),
      };
    });
  }

  if (config.unit === "week") {
    return Array.from({ length: config.buckets }, (_, index) => {
      const weeksAgo = config.buckets - 1 - index;
      const end = new Date(todayStart);
      end.setDate(end.getDate() - weeksAgo * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end, label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    });
  }

  return Array.from({ length: config.buckets }, (_, index) => {
    const monthsAgo = config.buckets - 1 - index;
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - monthsAgo, 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    return { start: monthStart, end: monthEnd, label: monthStart.toLocaleDateString("en-US", { month: "short" }) };
  });
}

/* ============================================================
   STATUS META
============================================================ */

interface StatusMeta {
  status: Status;
  label: string;
  icon: LucideIcon;
  colorKey: keyof ThemeColors;
}

const STATUS_META: StatusMeta[] = [
  { status: "To Do", label: "To Do", icon: Circle, colorKey: "text3" },
  { status: "In Progress", label: "In Progress", icon: Clock3, colorKey: "blueDark" },
  { status: "Completed", label: "Completed", icon: CheckCircle2, colorKey: "text" },
];

interface StatusRow {
  status: Status;
  label: string;
  icon: LucideIcon;
  color: string;
  count: number;
  percent: number;
}

/* ============================================================
   PRIORITY → PILL TONE (matches Tasks.tsx convention)
============================================================ */

const PRIORITY_TONE: Record<Priority, "surface" | "blue" | "dark"> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

/* ============================================================
   SHARED PRESENTATIONAL BITS
============================================================ */

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span className="text-ink-2" style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

interface RangePillsProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}

function RangePills<T extends string>({ options, value, onChange, compact }: RangePillsProps<T>) {
  return (
    <div className="flex items-center" style={{ gap: compact ? 4 : 6 }}>
      {options.map((option) => {
        const isActive = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            style={{
              border: "none",
              borderRadius: compact ? 8 : 999,
              padding: compact ? "6px 10px" : "8px 16px",
              fontSize: compact ? 11.5 : 12.5,
              fontWeight: 600,
              cursor: "pointer",
              background: isActive ? "var(--text)" : compact ? "transparent" : "var(--surface-2)",
              color: isActive ? "var(--surface)" : "var(--text-2)",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   TREND CHART CARD — primary centerpiece
============================================================ */

interface TrendChartCardProps {
  data: { label: string; total: number; completed: number }[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  completed: number;
  total: number;
  rangeDescription: string;
  theme: ThemeColors;
  isDark: boolean;
}

function TrendChartCard({ data, range, onRangeChange, completed, total, rangeDescription, theme, isDark }: TrendChartCardProps) {
  const tickInterval = data.length > 8 ? Math.ceil(data.length / 6) : 0;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  /*
   * The tooltip is meant to stay a dark, elevated chip in both
   * themes (matching ActivityChart's existing convention) rather
   * than mirroring the page's own background — reusing
   * theme.text/theme.surface directly would invert to a bright
   * white chip in dark mode, since theme.text is near-white there.
   */
  const tooltipBg = isDark ? theme.card : theme.text;
  const tooltipText = isDark ? theme.text : theme.surface;
  const tooltipLabelText = isDark ? theme.text2 : theme.surface2;

  return (
    <div
      className="bg-card border-soft shadow-float lift fade-in"
      style={{ flex: 1.7, minWidth: 0, borderRadius: 22, padding: 20 }}
    >
      <div className="flex items-start" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, marginBottom: 6 }}>
            Task activity trend
          </h2>
          <div className="flex items-baseline" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: "var(--text)" }}>{rate}%</span>
            <span className="text-ink-3" style={{ fontSize: 12.5 }}>
              completed &middot; {completed} of {total} &middot; {rangeDescription}
            </span>
          </div>
        </div>
        <RangePills options={CHART_RANGE_OPTIONS} value={range} onChange={onRangeChange} compact />
      </div>

      <div className="flex items-center" style={{ gap: 16, margin: "16px 0 4px" }}>
        <LegendSwatch color={theme.text} label="Completed" />
        <LegendSwatch color={theme.blue} label="Total due" />
      </div>

      <div style={{ height: 280, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsTotalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.blue} stopOpacity={0.34} />
                <stop offset="100%" stopColor={theme.blue} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="analyticsCompletedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.text} stopOpacity={0.16} />
                <stop offset="100%" stopColor={theme.text} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.border} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tick={{ fill: theme.text3, fontSize: 11 }}
            />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={26} tick={{ fill: theme.text3, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: "none", borderRadius: 12, fontSize: 12, color: tooltipText, padding: "10px 12px" }}
              labelStyle={{ color: tooltipLabelText, marginBottom: 4, fontWeight: 600 }}
              cursor={{ stroke: theme.border, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Total due"
              stroke={theme.blue}
              strokeWidth={2}
              fill="url(#analyticsTotalFill)"
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="none"
              fill="url(#analyticsCompletedFill)"
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={theme.text}
              strokeWidth={2}
              dot={{ r: 4, fill: theme.text, stroke: theme.card, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ============================================================
   STATUS DISTRIBUTION CARD — donut + compact legend
============================================================ */

interface StatusDistributionCardProps {
  rows: StatusRow[];
  total: number;
  rangeDescription: string;
  theme: ThemeColors;
  isDark: boolean;
}

function StatusDistributionCard({ rows, total, rangeDescription, theme, isDark }: StatusDistributionCardProps) {
  const tooltipBg = isDark ? theme.card : theme.text;
  const tooltipText = isDark ? theme.text : theme.surface;
  const pieData = rows.map((row) => ({ name: row.label, value: row.count, color: row.color }));
  const hasData = total > 0;

  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20 }}>
      <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, marginBottom: 3 }}>
        Status distribution
      </h2>
      <span className="text-ink-3" style={{ fontSize: 11.5 }}>{rangeDescription}</span>

      <div className="flex items-center" style={{ gap: 16, marginTop: 14 }}>
        <div style={{ width: 106, height: 106, flexShrink: 0, position: "relative" }}>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={33}
                  outerRadius={51}
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: "none", borderRadius: 10, fontSize: 11.5, color: tooltipText, padding: "6px 10px" }}
                  itemStyle={{ color: tooltipText }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `2px dashed ${theme.border}` }} />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span className="font-display" style={{ fontSize: 19, fontWeight: 600, color: "var(--text)" }}>{total}</span>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>tasks</span>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 10, flex: 1, minWidth: 0 }}>
          {rows.map((row) => (
            <div key={row.status} className="flex items-center" style={{ justifyContent: "space-between", gap: 8, minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: 7, minWidth: 0, flex: 1 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.label}
                </span>
              </div>
              <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{row.count}</span>
                <span className="text-ink-3" style={{ fontSize: 10.5 }}>{row.percent}%</span>
              </div>
            </div>
          ))}
          {total === 0 && (
            <p className="text-ink-3" style={{ fontSize: 11.5 }}>No tasks due in this range yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROJECT HEALTH CARD
============================================================ */

interface ProjectHealthRow {
  project: string;
  total: number;
  completed: number;
  overdue: number;
  rate: number;
}

function ProjectHealthCard({ rows, theme }: { rows: ProjectHealthRow[]; theme: ThemeColors }) {
  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20, flex: 1 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 3 }}>
        <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 560 }}>Project health</h2>
        <FolderKanban size={14} strokeWidth={1.8} color={theme.text3} />
      </div>
      <span className="text-ink-3" style={{ fontSize: 11.5 }}>Completion rate by project</span>

      <div className="flex flex-col" style={{ gap: 13, marginTop: 14 }}>
        {rows.map((row) => (
          <div key={row.project} style={{ minWidth: 0 }}>
            <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 6, gap: 8, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {row.project}
              </span>
              <div className="flex items-center" style={{ gap: 7, flexShrink: 0 }}>
                {row.overdue > 0 && (
                  <span className="flex items-center" style={{ gap: 3, fontSize: 10, fontWeight: 700, color: "var(--text)" }}>
                    <AlertTriangle size={10} strokeWidth={2.2} />
                    {row.overdue}
                  </span>
                )}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--blue-dark)" }}>{row.rate}%</span>
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${row.rate}%`,
                  height: "100%",
                  background: "var(--blue-dark)",
                  borderRadius: 999,
                  transition: "width 400ms ease",
                }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-ink-3" style={{ fontSize: 12 }}>No projects yet.</p>}
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCTIVITY CARD — completion-rate sparkbar
============================================================ */

interface ProductivityCardProps {
  data: { label: string; total: number; completed: number }[];
  completionRate: number;
  theme: ThemeColors;
}

function ProductivityCard({ data, completionRate, theme }: ProductivityCardProps) {
  const chartData = data.map((bucket) => ({
    label: bucket.label,
    rate: bucket.total > 0 ? Math.round((bucket.completed / bucket.total) * 100) : 0,
  }));

  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 3 }}>
        <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 560 }}>Productivity</h2>
        <Gauge size={14} strokeWidth={1.8} color={theme.text3} />
      </div>
      <span className="text-ink-3" style={{ fontSize: 11.5 }}>Avg. completion rate this window</span>

      <div className="font-display" style={{ fontSize: 26, fontWeight: 600, margin: "10px 0 12px", color: "var(--text)" }}>
        {completionRate}%
      </div>

      <div style={{ height: 56 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="24%">
            <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={theme.blueDark} fillOpacity={0.28 + (entry.rate / 100) * 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ============================================================
   TASK LIST CARD — overdue / upcoming insights
============================================================ */

interface TaskListCardProps {
  title: string;
  icon: LucideIcon;
  tasks: Task[];
  emptyText: string;
  theme: ThemeColors;
  accent?: boolean;
}

function TaskListCard({ title, icon: Icon, tasks, emptyText, theme, accent }: TaskListCardProps) {
  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 3 }}>
        <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 560 }}>{title}</h2>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: accent && tasks.length > 0 ? "var(--text)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={13} strokeWidth={1.8} color={accent && tasks.length > 0 ? theme.surface : theme.blueDark} />
        </div>
      </div>
      <span className="text-ink-3" style={{ fontSize: 11.5 }}>
        {tasks.length} task{tasks.length === 1 ? "" : "s"}
      </span>

      <div className="flex flex-col" style={{ marginTop: 10 }}>
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="flex items-center"
            style={{
              justifyContent: "space-between",
              gap: 10,
              padding: "8px 0",
              borderTop: index === 0 ? "none" : "1px solid var(--border)",
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {task.title}
              </div>
              <div
                className="text-ink-3"
                style={{ fontSize: 10.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {task.project} &middot; {task.due}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-ink-3" style={{ fontSize: 12, padding: "6px 0" }}>{emptyText}</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ANALYTICS PAGE
============================================================ */

export default function Analytics() {
  const { tasks } = useTaskContext();
  const [range, setRange] = useState<TimeRange>("all");
  const [chartRange, setChartRange] = useState<ChartRange>("30D");
  const isDark = useIsDarkMode();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const filteredTasks = useMemo(() => {
    if (range === "week") return tasks.filter((task) => isDueThisWeek(task.dueDate));
    if (range === "month") return tasks.filter((task) => isDueThisMonth(task.dueDate));
    return tasks;
  }, [tasks, range]);

  const metrics = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((task) => task.status === "Completed").length;
    const inProgress = filteredTasks.filter((task) => task.status === "In Progress").length;
    const overdue = filteredTasks.filter((task) => getDueGroup(task.dueDate) === "Overdue").length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate, inProgressRate };
  }, [filteredTasks]);

  const rangeLabel = RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "All time";

  /*
   * Period-over-period % change for the KPI row. Only meaningful
   * when "week" or "month" is selected — "all time" has no natural
   * previous period to compare against, so KPI cards fall back to
   * their static sublabel in that case.
   */
  const comparison = useMemo(() => {
    if (range === "all") return null;

    const previousTasks = tasks.filter((task) =>
      range === "week" ? isDueThisWeek(task.dueDate, 1) : isDueThisMonth(task.dueDate, 1)
    );
    const previousTotal = previousTasks.length;
    const previousCompleted = previousTasks.filter((task) => task.status === "Completed").length;
    const previousInProgress = previousTasks.filter((task) => task.status === "In Progress").length;

    const pct = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      total: pct(metrics.total, previousTotal),
      completed: pct(metrics.completed, previousCompleted),
      inProgress: pct(metrics.inProgress, previousInProgress),
    };
  }, [tasks, range, metrics]);

  const trend = useMemo(() => {
    const buckets = buildTrendBuckets(chartRange);
    const windowStart = buckets[0].start;
    const windowEnd = buckets[buckets.length - 1].end;

    const windowTasks = tasks.filter((task) => {
      const due = parseDueDate(task.dueDate);
      return due !== null && due >= windowStart && due <= windowEnd;
    });

    const data = buckets.map((bucket) => {
      const bucketTasks = windowTasks.filter((task) => {
        const due = parseDueDate(task.dueDate) as Date;
        return due >= bucket.start && due <= bucket.end;
      });

      return {
        label: bucket.label,
        total: bucketTasks.length,
        completed: bucketTasks.filter((task) => task.status === "Completed").length,
      };
    });

    const completedCount = windowTasks.filter((task) => task.status === "Completed").length;

    return { data, windowTasks, completedCount, totalCount: windowTasks.length };
  }, [tasks, chartRange]);

  const statusBreakdown = useMemo<StatusRow[]>(() => {
    const total = trend.windowTasks.length;
    return STATUS_META.map((meta) => {
      const count = trend.windowTasks.filter((task) => task.status === meta.status).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        status: meta.status,
        label: meta.label,
        icon: meta.icon,
        color: theme[meta.colorKey],
        count,
        percent,
      };
    });
  }, [trend.windowTasks, theme]);

  const projectHealth = useMemo<ProjectHealthRow[]>(() => {
    const byProject = new Map<string, { total: number; completed: number; overdue: number }>();
    tasks.forEach((task) => {
      const entry = byProject.get(task.project) ?? { total: 0, completed: 0, overdue: 0 };
      entry.total += 1;
      if (task.status === "Completed") entry.completed += 1;
      if (getDueGroup(task.dueDate) === "Overdue") entry.overdue += 1;
      byProject.set(task.project, entry);
    });

    return Array.from(byProject.entries())
      .map(([project, stats]) => ({
        project,
        ...stats,
        rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((task) => getDueGroup(task.dueDate) === "Overdue")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 5);
  }, [tasks]);

  const upcomingTasks = useMemo(() => getUpcomingTasks(tasks, 5), [tasks]);

  return (
    <>
      <div className="fade-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ marginBottom: 18 }}>
        <div>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 560, color: "var(--text)" }}>
              Analytics
            </h1>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--surface-2)",
                color: "var(--text-2)",
              }}
            >
              {tasks.length} tasks &middot; {projectHealth.length} projects
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            Track how work is progressing across every project in Orbit.
          </p>
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          <CalendarRange size={15} strokeWidth={1.8} color={theme.text3} />
          <RangePills options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 14 }}>
        <KpiCard
          label="Total tasks"
          value={metrics.total}
          sublabel={rangeLabel}
          changePct={comparison?.total}
          icon={ListChecks}
          theme={theme}
        />
        <KpiCard
          label="Completed"
          value={metrics.completed}
          sublabel={`${metrics.completionRate}% complete`}
          changePct={comparison?.completed}
          icon={CheckCircle2}
          ring={metrics.completionRate}
          theme={theme}
        />
        <KpiCard
          label="In progress"
          value={metrics.inProgress}
          sublabel={`${metrics.inProgressRate}% of total`}
          changePct={comparison?.inProgress}
          icon={Clock3}
          theme={theme}
        />
        <KpiCard
          label="Overdue"
          value={metrics.overdue}
          sublabel={metrics.overdue > 0 ? "Needs attention" : "All caught up"}
          icon={AlertTriangle}
          emphasis={metrics.overdue > 0}
          theme={theme}
        />
      </div>

      <div className="flex flex-col xl:flex-row" style={{ gap: 14, alignItems: "stretch", marginTop: 14 }}>
        <TrendChartCard
          data={trend.data}
          range={chartRange}
          onRangeChange={setChartRange}
          completed={trend.completedCount}
          total={trend.totalCount}
          rangeDescription={CHART_RANGE_CONFIG[chartRange].description}
          theme={theme}
          isDark={isDark}
        />
        <div className="flex flex-col" style={{ flex: 1, minWidth: 280, gap: 14 }}>
          <StatusDistributionCard
            rows={statusBreakdown}
            total={trend.totalCount}
            rangeDescription={CHART_RANGE_CONFIG[chartRange].description}
            theme={theme}
            isDark={isDark}
          />
          <ProjectHealthCard rows={projectHealth} theme={theme} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: 14, marginTop: 14 }}>
        <ProductivityCard
          data={trend.data}
          completionRate={trend.totalCount > 0 ? Math.round((trend.completedCount / trend.totalCount) * 100) : 0}
          theme={theme}
        />
        <TaskListCard
          title="Overdue"
          icon={AlertTriangle}
          tasks={overdueTasks}
          emptyText="Nothing overdue — all caught up."
          theme={theme}
          accent
        />
        <TaskListCard
          title="Upcoming"
          icon={CalendarClock}
          tasks={upcomingTasks}
          emptyText="Nothing due in the next 7 days."
          theme={theme}
        />
      </div>
    </>
  );
}
