import { History } from "lucide-react";

import type { Member, TeamActivityEntry } from "../../data/teamData";
import { Avatar } from "../ui/Avatar";

interface ActivityFeedProps {
  activity: TeamActivityEntry[];
  members: Member[];
  isLoading?: boolean;
  error?: string | null;
}

export function ActivityFeed({
  activity,
  members,
  isLoading = false,
  error = null,
}: ActivityFeedProps) {
  return (
    <div
      className="fade-in"
      style={{
        borderRadius: 16,
        padding: 16,
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(32, 36, 43, 0.04)",
      }}
    >
      {/* HEADER */}
      <div
        className="flex items-center"
        style={{
          gap: 8,
          marginBottom: 14,
        }}
      >
        {/* ICON */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <History
            size={15}
            color="var(--blue-dark)"
            strokeWidth={1.8}
          />
        </div>

        {/* TITLE */}
        <div>
          <span
            className="font-display"
            style={{
              display: "block",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Team Activity
          </span>

          <span
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 10.5,
              color: "var(--text-3)",
            }}
          >
            Recent team updates
          </span>
        </div>
      </div>

      {/* LOADING / ERROR / EMPTY STATE */}
      {isLoading ? (
        <div style={{ padding: "24px 8px", textAlign: "center", background: "var(--surface)", borderRadius: 11, border: "1px solid var(--surface-2)" }}>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-3)" }}>Loading activity…</span>
        </div>
      ) : error ? (
        <div style={{ padding: "24px 8px", textAlign: "center", background: "var(--surface)", borderRadius: 11, border: "1px solid var(--surface-2)" }}>
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#B3564B", marginBottom: 4 }}>Couldn't load activity</span>
          <span style={{ display: "block", fontSize: 10.5, color: "var(--text-3)" }}>{error}</span>
        </div>
      ) : activity.length === 0 ? (
        <div
          style={{
            padding: "24px 8px",
            textAlign: "center",
            background: "var(--surface)",
            borderRadius: 11,
            border: "1px solid var(--surface-2)",
          }}
        >
          <History
            size={20}
            color="var(--text-3)"
            style={{
              margin: "0 auto 8px",
            }}
          />

          <span
            style={{
              display: "block",
              fontSize: 11.5,
              color: "var(--text-3)",
            }}
          >
            No recent activity
          </span>
        </div>
      ) : (
        /* ACTIVITY LIST */
        <div
          className="flex flex-col"
          style={{
            gap: 8,
          }}
        >
          {activity.map((entry) => {
            const member = members.find(
              (candidate) =>
                candidate.id === entry.memberId
            );

            return (
              <div
                key={entry.id}
                className="flex items-start"
                style={{
                  gap: 10,
                  padding: 10,
                  borderRadius: 11,
                  background: "var(--surface)",
                  border: "1px solid var(--surface-2)",
                }}
              >
                {/* AVATAR */}
                {member ? (
                  <Avatar
                    initials={member.initials}
                    bg={member.bg}
                    fg={member.fg}
                    size={30}
                  />
                ) : (
                  <Avatar
                    initials="?"
                    size={30}
                  />
                )}

                {/* ACTIVITY CONTENT */}
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11.5,
                      color: "var(--text)",
                      lineHeight: 1.5,
                    }}
                  >
                    {entry.text}
                  </p>

                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 10,
                      color: "var(--text-3)",
                    }}
                  >
                    {entry.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}