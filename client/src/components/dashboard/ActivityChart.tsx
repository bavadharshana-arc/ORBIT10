import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import { Sparkles } from "lucide-react";
import type { ActivityDatum } from "../../types/dashboard";
import { Pill } from "../ui/Pill";
import { TinySparkle } from "../doodles/CelestialMarks";
import { LIGHT_THEME, DARK_THEME } from "../../data/chartTheme";
import { useIsDarkMode } from "../../hooks/useIsDarkMode";

/* A dotted "no activity yet" trail shown only when the week has no
   created or completed tasks — a few tiny dots riding an irregular
   line, plus one small accent sparkle, layered over the otherwise-flat
   baseline so the empty state reads as a deliberate, polished "quiet
   week" rather than a broken chart. Built from three different cubic
   segments (rise-then-dip, deeper-dip-then-rise, rise-then-settle)
   rather than one symmetric arch, so it reads as an organic trail with
   subtle rises and dips instead of a parabola. The path and its dots
   share one fixed-size, fixed-viewBox <svg> (see render below) so the
   dots stay perfectly circular and aligned to the curve — no
   independent percentage-based positioning that could drift or
   distort. Purely decorative/non-interactive: the real axes and marks
   underneath are untouched, and no fake activity is drawn — this never
   resembles real task data. */
const EMPTY_STATE_CURVE_PATH =
  "M4 23 C 40 9, 65 9, 92 19 C 112 26, 135 27, 160 17 C 185 7, 205 6, 230 16 C 248 22, 265 20, 296 21";
const EMPTY_STATE_CURVE_DOTS = [
  { cx: 50, cy: 11, r: 2 },
  { cx: 132, cy: 25, r: 1.6 },
  { cx: 205, cy: 8, r: 2.3 },
  { cx: 268, cy: 20, r: 1.8 },
];

interface ActivityChartProps {
  data: ActivityDatum[];
  /** Total of `data[*].created` — passed in rather than re-summed here since the caller already has it. */
  createdThisWeek: number;
  /** Total of `data[*].completed` — passed in rather than re-summed here since the caller already has it. */
  completedThisWeek: number;
  /** % change in completions vs. the previous 7-day window; 0 reads as "no change" rather than a literal "+0%". */
  changeVsLastWeekPct: number;
}

function ChartLegend({ blue, blueDark }: { blue: string; blueDark: string }) {
  return (
    <div className="flex items-center" style={{ gap: 14, marginTop: 6 }}>
      <span className="flex items-center" style={{ gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: blue, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Created</span>
      </span>
      <span className="flex items-center" style={{ gap: 5 }}>
        <span style={{ width: 11, height: 2, borderRadius: 999, background: blueDark, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Completed</span>
      </span>
    </div>
  );
}

export function ActivityChart({ data, createdThisWeek, completedThisWeek, changeVsLastWeekPct }: ActivityChartProps) {
  const isDark = useIsDarkMode();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const tooltipBg = isDark ? theme.card : theme.text;
  const tooltipText = isDark ? theme.text : theme.surface;
  const tooltipLabelText = isDark ? theme.text3 : theme.surface;

  const changeLabel =
    changeVsLastWeekPct === 0
      ? "No change vs last week"
      : `${changeVsLastWeekPct > 0 ? "+" : ""}${changeVsLastWeekPct}% vs last week`;

  const isEmpty = createdThisWeek === 0 && completedThisWeek === 0;

  function renderTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null;

    // One tooltip, every series — created and completed both read off
    // the same hovered day, in a fixed order regardless of which mark
    // the pointer happens to be over. Both dataKeys are always plain
    // numbers (see ActivityDatum), so a non-number payload value (which
    // recharts' wider ValueType allows in principle) just falls back to 0
    // rather than rendering something unexpected.
    const created = payload.find((entry) => entry.dataKey === "created")?.value;
    const completed = payload.find((entry) => entry.dataKey === "completed")?.value;
    const createdCount = typeof created === "number" ? created : 0;
    const completedCount = typeof completed === "number" ? completed : 0;

    return (
      <div style={{ background: tooltipBg, borderRadius: 12, fontSize: 12, padding: "9px 12px", minWidth: 108 }}>
        <div style={{ color: tooltipLabelText, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        <div className="flex items-center" style={{ gap: 7, marginBottom: 3 }}>
          <span style={{ width: 10, height: 2, borderRadius: 999, background: theme.blueDark, flexShrink: 0 }} />
          <span style={{ color: tooltipText, fontWeight: 700 }}>{completedCount}</span>
          <span style={{ color: tooltipLabelText }}>completed</span>
        </div>
        <div className="flex items-center" style={{ gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2.5, background: theme.blue, flexShrink: 0 }} />
          <span style={{ color: tooltipText, fontWeight: 700 }}>{createdCount}</span>
          <span style={{ color: tooltipLabelText }}>created</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-soft shadow-float fade-in p-4 sm:p-5 lg:p-[22px]" style={{ borderRadius: 22, marginTop: 18 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <h2 className="flex items-center font-display" style={{ gap: 6, fontSize: 18, fontWeight: 560, color: "var(--text)" }}>
            Weekly activity
            <Sparkles size={12} style={{ color: "var(--blue-dark)" }} opacity={0.55} />
          </h2>
          <span className="text-ink-3" style={{ fontSize: 12.5 }}>
            {completedThisWeek} completed &middot; {createdThisWeek} created this week
          </span>
        </div>
        <Pill tone="blue">{changeLabel}</Pill>
      </div>

      <ChartLegend blue={theme.blue} blueDark={theme.blueDark} />

      <div style={{ height: 160, marginTop: 10, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.7} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: theme.text3, fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
              tick={{ fill: theme.text3, fontSize: 10 }}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: theme.surface2, opacity: 0.6 }} />
            <Bar dataKey="created" name="Created" fill={theme.blue} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={theme.blueDark}
              strokeWidth={2}
              dot={{ r: 4, fill: theme.blueDark, stroke: theme.card, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: theme.blueDark, stroke: theme.card, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Empty-state flourish — a clearly-visible dotted-blue "no
            activity yet" trail with a few varied-size dots riding it,
            plus one small accent sparkle. Absolutely positioned over a
            normal-flow chart, so it paints above the chart automatically
            without any extra z-index; pointer-events stay off so
            hover/tooltip still work. */}
        {isEmpty && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <svg
              width="300"
              height="30"
              viewBox="0 0 300 30"
              style={{ position: "absolute", left: "50%", top: "56%", transform: "translateX(-50%)" }}
            >
              <path
                d={EMPTY_STATE_CURVE_PATH}
                fill="none"
                stroke={theme.blueDark}
                strokeWidth="2"
                strokeDasharray="3 3.5"
                strokeLinecap="round"
                opacity="0.68"
              />
              {EMPTY_STATE_CURVE_DOTS.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={theme.blueDark} opacity="0.75" />
              ))}
            </svg>

            <TinySparkle style={{ left: "48%", top: "46%" }} size={9} color="var(--card)" opacity={0.55} />

            <div
              className="flex items-center justify-center"
              style={{ position: "absolute", inset: 0, top: "80%" }}
            >
              <span style={{ fontSize: 11.5, color: theme.text3 }}>No tasks created or completed this week</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
