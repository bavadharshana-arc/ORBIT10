import { useEffect, useMemo, useState } from "react";
import { Search, History } from "lucide-react";

import type { ActivityEvent, ActivityEventType, ActivityFeedItem } from "../../types/workspace";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useWorkspace } from "../../context/workspaceContextValue";
import { buildProjectActivityFeed, formatRelativeTime } from "../../data/workspaceData";
import { getInitials } from "../../data/teamData";
import { ApiError } from "../../lib/api";
import { listActivity as listActivityRequest, type ActivityEventRecord } from "../../lib/activityApi";
import type { WorkspaceMemberRecord } from "../../lib/workspaceApi";
import { Avatar } from "../ui/Avatar";
import { ACTIVITY_META } from "./activityMeta";

const NEUTRAL_ACTOR_AVATAR = { bg: "var(--blue)", fg: "var(--text)" };

/** Resolves a real ActivityEventRecord's embedded actor (id/name/email only — no color) into a full display ActivityEvent, cross-referencing the workspace roster for avatar color — same pattern as every other real-actor resolution this session (TaskContext.tsx's resolveAssignee, ProjectFilesTab.tsx's resolveUploader). */
function mapActivityRecord(record: ActivityEventRecord, membersById: Map<string, WorkspaceMemberRecord>): ActivityEvent {
  const actor = record.actor
    ? (() => {
        const name = record.actor!.name ?? record.actor!.email;
        const member = membersById.get(record.actor!.id);
        return {
          id: record.actor!.id,
          name,
          initials: getInitials(name),
          bg: member?.user.avatarBg ?? NEUTRAL_ACTOR_AVATAR.bg,
          fg: member?.user.avatarFg ?? NEUTRAL_ACTOR_AVATAR.fg,
        };
      })()
    : undefined;

  return {
    id: record.id,
    projectId: record.projectId,
    type: record.type,
    text: record.text,
    createdAt: new Date(record.createdAt).getTime(),
    actor,
  };
}

/* ============================================================
   FILTER GROUPS
============================================================ */

type FilterKey = "all" | "tasks" | "files" | "discussions" | "team" | "milestones";

const FILTER_GROUPS: { key: FilterKey; label: string; types: ActivityEventType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "tasks", label: "Tasks", types: ["task_created", "task_updated", "status_changed", "comment_added"] },
  { key: "files", label: "Files", types: ["file_uploaded"] },
  { key: "discussions", label: "Discussions", types: ["discussion_posted"] },
  { key: "team", label: "Team", types: ["member_added", "member_removed"] },
  { key: "milestones", label: "Milestones", types: ["milestone_completed", "project_created"] },
];

/* ============================================================
   DATE GROUPING
============================================================ */

function dayLabel(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function groupByDay(items: ActivityFeedItem[]): { label: string; items: ActivityFeedItem[] }[] {
  const groups: { label: string; items: ActivityFeedItem[] }[] = [];
  items.forEach((item) => {
    const label = dayLabel(item.timestampMs);
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

/* ============================================================
   ROW
============================================================ */

function ActivityRow({ item, isLast }: { item: ActivityFeedItem; isLast: boolean }) {
  const meta = ACTIVITY_META[item.type];

  return (
    <div className="flex items-start" style={{ gap: 12, padding: "13px 0", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {item.actor ? (
          <Avatar initials={item.actor.initials} bg={item.actor.bg} fg={item.actor.fg} size={30} />
        ) : (
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <meta.icon size={13} strokeWidth={1.8} color="var(--blue-dark)" />
          </div>
        )}
        {item.actor && (
          <div
            style={{
              position: "absolute",
              bottom: -3,
              right: -3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--card)",
              border: "1.5px solid var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <meta.icon size={9} strokeWidth={2} color="var(--blue-dark)" />
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1, paddingTop: 3 }}>
        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{item.text}</p>
        <span className="text-ink-3" style={{ fontSize: 11 }}>{formatRelativeTime(item.timestampMs)}</span>
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVITY TAB
============================================================ */

export function ProjectActivityTab() {
  const { project, projectTasks } = useProjectWorkspace();
  const { currentWorkspaceId } = useWorkspace();
  const { workspaceMembers } = useTaskContext();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const [activityRecords, setActivityRecords] = useState<ActivityEventRecord[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const workspaceId = currentWorkspaceId;
    const projectId = project.id;

    // Deferred into the promise chain — never synchronous in the effect
    // body — same reasoning as every other real-data fetch effect this
    // session.
    Promise.resolve()
      .then(() => {
        if (cancelled || !workspaceId) return null;
        setActivityLoading(true);
        setActivityError(null);
        return listActivityRequest(workspaceId, projectId);
      })
      .then((records) => {
        if (cancelled) return;
        if (!workspaceId || !records) {
          setActivityRecords([]);
          return;
        }
        setActivityRecords(records);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setActivityRecords([]);
        setActivityError(err instanceof ApiError ? err.message : "Couldn't load activity. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, project.id]);

  const events = useMemo(() => {
    const membersById = new Map(workspaceMembers.map((member) => [member.userId, member] as const));
    return activityRecords.map((record) => mapActivityRecord(record, membersById));
  }, [activityRecords, workspaceMembers]);

  const feed = useMemo(
    () => buildProjectActivityFeed(project, projectTasks, events),
    [project, projectTasks, events]
  );

  const activeTypes = FILTER_GROUPS.find((g) => g.key === filter)?.types ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = feed.filter((item) => {
    const matchesFilter = filter === "all" || activeTypes.includes(item.type);
    const matchesQuery = normalizedQuery === "" || item.text.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  const groups = groupByDay(filtered);

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Activity</h2>
          <p className="text-ink-2" style={{ fontSize: 12.5 }}>Everything that's happened in this project, in order.</p>
        </div>

        <div className="bg-card border-soft flex items-center" style={{ gap: 8, padding: "9px 13px", borderRadius: 12, width: 240 }}>
          <Search size={14} strokeWidth={1.8} color="var(--text-3)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", width: "100%" }}
          />
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 4, flexWrap: "wrap", background: "var(--surface-2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {FILTER_GROUPS.map((group) => {
          const isActive = filter === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setFilter(group.key)}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "7px 13px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: isActive ? "var(--card)" : "transparent",
                color: isActive ? "var(--text)" : "var(--text-2)",
                boxShadow: isActive ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
                transition: "background 160ms ease, color 160ms ease",
              }}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="bg-card border-soft shadow-float" style={{ borderRadius: 20, padding: "6px 20px" }}>
        {activityLoading ? (
          <div className="flex flex-col items-center" style={{ padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading activity…</p>
          </div>
        ) : activityError ? (
          <div className="flex flex-col items-center" style={{ padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#B3564B" }}>Couldn't load activity</p>
            <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>{activityError}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <History size={22} strokeWidth={1.6} color="var(--text-3)" />
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>No activity to show</p>
            <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 260 }}>
              {normalizedQuery ? `Nothing matches "${query}".` : "Once work starts happening here, it'll show up in this feed."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div style={{ position: "sticky", top: 0, background: "var(--card)", padding: "12px 0 4px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--text-3)" }}>
                {group.label}
              </div>
              {group.items.map((item, index) => (
                <ActivityRow key={item.id} item={item} isLast={index === group.items.length - 1} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
