import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  monthLabel: string;
  rows: number[][];
  outsideKeys: Set<string>;
  today: number;
  /** Whether the displayed grid is actually today's real month — gates the "today" highlight so navigating away from the current month doesn't highlight an unrelated day that happens to share the same day-of-month number. Defaults to true for callers that never navigate away from the current month. */
  isCurrentMonth?: boolean;
  eventDays?: number[];
  /** Fired with the clicked day (or `null` when the selection is cleared). */
  onSelectDay?: (day: number | null) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

export function MiniCalendar({
  monthLabel,
  rows,
  outsideKeys,
  today,
  isCurrentMonth = true,
  eventDays = [],
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // The displayed month is identified by `monthLabel` alone (rows don't
  // carry a year/month) — clear any selection made in a previously-viewed
  // month so a stale cell key doesn't keep rendering as "selected" (and,
  // via onSelectDay, so a caller tracking the selected day doesn't keep
  // showing data for what's now a different month's same day-of-month
  // number) after navigating with the prev/next buttons.
  useEffect(() => {
    setSelectedKey(null);
    setHoveredKey(null);
    onSelectDay?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthLabel]);

  function selectCell(key: string, day: number) {
    setSelectedKey((current) => {
      const next = current === key ? null : key;
      onSelectDay?.(next ? day : null);
      return next;
    });
  }

  return (
    <div className="bg-card border-soft shadow-float fade-in p-4 sm:p-5" style={{ borderRadius: 22 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <span className="font-display" style={{ fontSize: 15.5, fontWeight: 560 }}>
          {monthLabel}
        </span>
        <div className="flex items-center" style={{ gap: 4 }}>
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrevMonth}
            disabled={!onPrevMonth}
            className="nav-item"
            style={{ border: "none", background: "var(--surface-2)", borderRadius: 8, width: 24, height: 24, cursor: onPrevMonth ? "pointer" : "default", opacity: onPrevMonth ? 1 : 0.5, display: "flex" }}
          >
            <ChevronLeft size={13} style={{ margin: "auto", color: "var(--text-2)" }} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={onNextMonth}
            disabled={!onNextMonth}
            className="nav-item"
            style={{ border: "none", background: "var(--surface-2)", borderRadius: 8, width: 24, height: 24, cursor: onNextMonth ? "pointer" : "default", opacity: onNextMonth ? 1 : 0.5, display: "flex" }}
          >
            <ChevronRight size={13} style={{ margin: "auto", color: "var(--text-2)" }} />
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-ink-3" style={{ textAlign: "center", fontSize: 11, fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {rows.map((row, ri) =>
          row.map((day, ci) => {
            const key = `r${ri}c${ci}`;
            const isOutside = outsideKeys.has(key);
            const isToday = !isOutside && isCurrentMonth && day === today;
            const isSelected = !isOutside && !isToday && key === selectedKey;
            const isHovered = !isOutside && !isToday && key === hoveredKey;
            const hasEvent = !isOutside && eventDays.includes(day);

            return (
              <div
                key={key}
                role={isOutside ? undefined : "button"}
                tabIndex={isOutside ? undefined : 0}
                onClick={isOutside ? undefined : () => selectCell(key, day)}
                onMouseEnter={isOutside ? undefined : () => setHoveredKey(key)}
                onMouseLeave={isOutside ? undefined : () => setHoveredKey(null)}
                onKeyDown={
                  isOutside
                    ? undefined
                    : (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectCell(key, day);
                        }
                      }
                }
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: isToday || isSelected ? 700 : 500,
                  color: isOutside ? "var(--text-3)" : isToday ? "var(--surface)" : "var(--text)",
                  background: isToday ? "var(--text)" : isHovered ? "var(--surface-2)" : "transparent",
                  boxShadow: isSelected ? "inset 0 0 0 1.5px var(--blue-dark)" : "none",
                  opacity: isOutside ? 0.5 : 1,
                  position: "relative",
                  cursor: isOutside ? "default" : "pointer",
                  transition: "background 140ms ease, box-shadow 140ms ease",
                }}
              >
                {day}
                {hasEvent && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 3,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isToday ? "var(--surface)" : "var(--blue-dark)",
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
