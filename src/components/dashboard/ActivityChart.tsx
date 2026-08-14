import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { ActivityDatum } from "../../types/dashboard";
import { Pill } from "../ui/Pill";

interface ThemeColors {
  border: string;
  blue: string;
  blueDark: string;
  text: string;
  text3: string;
  surface: string;
  card: string;
}

const LIGHT_THEME: ThemeColors = {
  border: "#E4E8ED",
  blue: "#AFC5DA",
  blueDark: "#8EA7BF",
  text: "#20242B",
  text3: "#98A2B3",
  surface: "#F7F8FA",
  card: "#FFFFFF",
};

const DARK_THEME: ThemeColors = {
  border: "#2A2F38",
  blue: "#3F5064",
  blueDark: "#6F8AA3",
  text: "#EDEFF3",
  text3: "#6B7280",
  surface: "#14171C",
  card: "#1E232B",
};


function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.dataset.theme === "dark");
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

interface ActivityChartProps {
  data: ActivityDatum[];
  /** Total of `data[*].tasks` — passed in rather than re-summed here since the caller already has it. */
  completedThisWeek: number;
  /** % change vs. the previous 7-day window; 0 reads as "no change" rather than a literal "+0%". */
  changeVsLastWeekPct: number;
}

export function ActivityChart({ data, completedThisWeek, changeVsLastWeekPct }: ActivityChartProps) {
  const isDark = useIsDarkMode();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const tooltipBg = isDark ? theme.card : theme.text;
  const tooltipText = isDark ? theme.text : theme.surface;
  const tooltipLabelText = isDark ? theme.text3 : theme.surface;

  const changeLabel =
    changeVsLastWeekPct === 0
      ? "No change vs last week"
      : `${changeVsLastWeekPct > 0 ? "+" : ""}${changeVsLastWeekPct}% vs last week`;

  return (
    <div className="bg-card border-soft shadow-float fade-in p-4 sm:p-5 lg:p-[22px]" style={{ borderRadius: 22, marginTop: 18 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 560, color: "var(--text)" }}>
            Weekly activity
          </h2>
          <span className="text-ink-3" style={{ fontSize: 12.5 }}>
            {completedThisWeek} task{completedThisWeek === 1 ? "" : "s"} completed this week
          </span>
        </div>
        <Pill tone="blue">{changeLabel}</Pill>
      </div>

      <div style={{ height: 160, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="orbitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.blue} stopOpacity={0.55} />
                <stop offset="100%" stopColor={theme.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.border} strokeDasharray="3 4" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: theme.text3, fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: tooltipBg, border: "none", borderRadius: 12, fontSize: 12, color: tooltipText, padding: "8px 12px" }}
              labelStyle={{ color: tooltipLabelText, fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: tooltipText }}
              cursor={{ stroke: theme.border, strokeWidth: 1 }}
              formatter={(value) => [`${value} tasks`, "Completed"]}
            />
            <Area
              type="monotone"
              dataKey="tasks"
              stroke={theme.blueDark}
              strokeWidth={2.5}
              fill="url(#orbitFill)"
              activeDot={{ r: 5, fill: theme.blueDark, stroke: theme.card, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
