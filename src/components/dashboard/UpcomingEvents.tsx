import { Clock, MapPin, MoreHorizontal } from "lucide-react";
import type { UpcomingEvent } from "../../types/dashboard";

interface UpcomingEventsProps {
  events: UpcomingEvent[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="bg-card border-soft shadow-float fade-in p-4 sm:p-5" style={{ borderRadius: 22, marginTop: 18 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <span className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>
          Upcoming
        </span>
        <MoreHorizontal size={16} style={{ color: "var(--text-3)" }} />
      </div>

      <div style={{ position: "relative" }}>
        {events.length > 1 && (
          <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 1, background: "var(--border)" }} />
        )}

        {events.map((event, index) => {
          const isNext = index === 0;
          return (
            <div
              key={event.title}
              className="flex items-start"
              style={{ gap: 12, position: "relative", paddingBottom: index < events.length - 1 ? 18 : 0 }}
            >
              {/* Timeline marker */}
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  flexShrink: 0,
                  marginTop: 4,
                  display: "block",
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: isNext ? "var(--blue-dark)" : "var(--card)",
                  border: isNext ? "none" : "1.5px solid var(--border)",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center" style={{ justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 650, color: "var(--text)" }}>{event.title}</span>
                  {isNext ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--blue-dark)",
                        background: "var(--surface-2)",
                        padding: "2px 8px",
                        borderRadius: 999,
                        flexShrink: 0,
                      }}
                    >
                      {event.when}
                    </span>
                  ) : (
                    <span className="text-ink-3" style={{ fontSize: 11, flexShrink: 0 }}>
                      {event.when}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-ink-2" style={{ gap: 6, fontSize: 12, marginBottom: 3 }}>
                  <Clock size={11} />
                  {event.time}
                </div>
                <div className="flex items-center text-ink-3" style={{ gap: 6, fontSize: 11.5 }}>
                  <MapPin size={11} />
                  {event.meta}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
