import { useEffect, useMemo, useState } from "react";

import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  Users2,
  Mail,
  LayoutGrid,
  Rows3,
  X,
} from "lucide-react";

import {
  mapWorkspaceMemberToMember,
  memberRoleToWorkspaceRole,
  WORKSPACE_ROLE_GROUPS,
  WORKSPACE_MEMBER_ROLE_OPTIONS,
  type MemberStatus,
  type TeamActivityEntry,
} from "../data/teamData";
import { formatRelativeTime } from "../data/workspaceData";

import { StatCard } from "../components/dashboard/StatCard";
import { MemberCard } from "../components/team/MemberCard";
import { MemberRow } from "../components/team/MemberRow";
import { TeamsPanel } from "../components/team/TeamsPanel";
import { ActivityFeed } from "../components/team/ActivityFeed";

import { useNotificationContext } from "../context/notificationContextValue";
import { notifyMemberInvited } from "../data/systemNotifications";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/workspaceContextValue";
import { ApiError } from "../lib/api";
import {
  listWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  type WorkspaceMemberRecord,
  type WorkspaceRole,
} from "../lib/workspaceApi";
import {
  listWorkspaceActivity,
  createWorkspaceActivity,
  type WorkspaceActivityEventRecord,
} from "../lib/workspaceActivityApi";

import {
  MemberDetailsDrawer,
  type MemberDetailsSaveValues,
} from "../components/MemberDetailsDrawer";

import {
  InviteMemberDrawer,
  type InviteMemberValues,
} from "../components/InviteMemberDrawer";

/* ============================================================
   TYPES
============================================================ */

type StatusFilter = "All" | MemberStatus;

type DepartmentFilter = "All" | string;

type SortKey =
  | "name"
  | "role"
  | "department"
  | "joined"
  | "tasks";

type ViewMode = "grid" | "list";

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "Active",
  "Away",
  "Offline",
  "Invited",
];

const SORT_OPTIONS: {
  key: SortKey;
  label: string;
}[] = [
  {
    key: "name",
    label: "Name (A–Z)",
  },
  {
    key: "role",
    label: "Role",
  },
  {
    key: "department",
    label: "Team",
  },
  {
    key: "joined",
    label: "Recently joined",
  },
  {
    key: "tasks",
    label: "Most active tasks",
  },
];

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        gap: 10,
        background: "#FFFFFF",
        border: "1px solid #E4E8ED",
        borderRadius: 16,
      }}
    >
      <Users
        size={26}
        strokeWidth={1.6}
        color="#98A2B3"
      />

      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#20242B",
          margin: 0,
        }}
      >
        {title}
      </p>

      <p
        style={{
          fontSize: 12.5,
          color: "#667085",
          maxWidth: 280,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}

/* ============================================================
   Stage 1 — Real Team Roster

   The additive "Workspace members (live)" read-only panel (Phase 21)
   lived here — it's gone because it's now redundant: the primary
   roster below *is* that same GET /api/workspaces/:id/members data,
   full CRUD, no separate read-only echo needed.
============================================================ */

/* ============================================================
   TEAM PAGE
============================================================ */

export default function Team() {
  const { currentWorkspaceId, isLoading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();

  /* ============================================================
     REAL WORKSPACE MEMBERS (Stage 1 — Real Team Roster)

     Replaces the old loadMembers()/saveMembers() localStorage roster
     as this page's source of truth. Fetched fresh on every workspace
     switch (the currentWorkspaceId dependency below) so a previous
     workspace's roster never lingers after switching — same
     cancelled-flag + deferred-setState pattern every other real fetch
     in this codebase uses (WorkspaceContext.tsx, TaskContext.tsx, ...).
  ============================================================ */

  const [memberRecords, setMemberRecords] = useState<WorkspaceMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  // Surfaces a failed invite/role-change/remove request — never a
  // silent fallback to stale/local data.
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId) {
          return null;
        }
        setMembersLoading(true);
        setMembersError(null);
        return listWorkspaceMembers(currentWorkspaceId);
      })
      .then((fetched) => {
        if (cancelled) return;

        if (!currentWorkspaceId || !fetched) {
          // Signed out, or this account currently has no workspace —
          // reset so a previous workspace's roster never lingers.
          setMemberRecords([]);
          return;
        }

        setMemberRecords(fetched);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMemberRecords([]);
        setMembersError(err instanceof ApiError ? err.message : "Couldn't load workspace members. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId]);

  // Adapts real records onto the existing Member shape — every filter/
  // sort/render below (MemberCard, MemberRow, TeamsPanel, ...) is
  // completely unchanged; see mapWorkspaceMemberToMember's doc comment
  // in teamData.ts for what's real vs. an honest placeholder.
  const members = useMemo(() => memberRecords.map(mapWorkspaceMemberToMember), [memberRecords]);

  const [activityRecords, setActivityRecords] = useState<WorkspaceActivityEventRecord[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId) return null;
        setActivityLoading(true);
        setActivityError(null);
        return listWorkspaceActivity(currentWorkspaceId);
      })
      .then((fetched) => {
        if (cancelled) return;
        if (!currentWorkspaceId || !fetched) {
          setActivityRecords([]);
          return;
        }
        setActivityRecords(fetched);
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
  }, [currentWorkspaceId]);

  // ActivityFeed matches entry.memberId against members[].id (the real
  // WorkspaceMember *row* id — see mapWorkspaceMemberToMember), but the
  // backend's WorkspaceActivityEvent.memberId is a real *userId* — cross-
  // referenced here via memberRecords, same resolution TaskContext.tsx's
  // resolveAssignee and every other real-actor mapping this session does.
  const activity = useMemo<TeamActivityEntry[]>(() => {
    const rowIdByUserId = new Map(memberRecords.map((record) => [record.userId, record.id] as const));
    return activityRecords.map((record) => ({
      id: record.id,
      memberId: (record.member ? rowIdByUserId.get(record.member.id) : undefined) ?? record.member?.id ?? "",
      text: record.text,
      timestamp: formatRelativeTime(new Date(record.createdAt).getTime()),
    }));
  }, [activityRecords, memberRecords]);

  const { addNotification } = useNotificationContext();

  /*
    The signed-in user's *real* WorkspaceRole in this workspace,
    resolved from the roster just fetched — not a separate, decoupled
    AuthRole lookup. This is what the backend actually checks
    (requireWorkspaceRole("OWNER", "ADMIN")), so a control gated on it
    here never offers an action the API would then reject with a 403.
  */
  const myMembership = memberRecords.find((record) => record.userId === user?.id);
  const myRealRole = (myMembership?.role as WorkspaceRole | undefined) ?? null;
  const canManage = myRealRole === "OWNER" || myRealRole === "ADMIN";
  const canGrantOwner = myRealRole === "OWNER";

  const [query, setQuery] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [departmentFilter, setDepartmentFilter] =
    useState<DepartmentFilter>("All");

  const [sortKey, setSortKey] =
    useState<SortKey>("name");

  const [viewMode, setViewMode] =
    useState<ViewMode>("grid");

  const [selectedMemberId, setSelectedMemberId] =
    useState<string | null>(null);

  const [isInviteOpen, setIsInviteOpen] =
    useState(false);

  /*
    NEW:
    Controls whether the Teams panel is visible.
  */
  const [showTeamsPanel, setShowTeamsPanel] =
    useState(false);

  /* ============================================================
     SELECTED MEMBER
  ============================================================ */

  const selectedMember =
    members.find(
      (member) =>
        member.id === selectedMemberId
    ) ?? null;

  /* ============================================================
     PERSISTENCE — real workspace activity now (Stage 5).
  ============================================================ */

  // Best-effort: the member mutation this describes has already
  // succeeded by the time this is called, so a logging failure here
  // shouldn't surface as if the invite/role-change/remove itself failed.
  function persistActivity(
    entry: {
      /** Real userId this event is about (not a WorkspaceMember row id). */
      userId: string;
      text: string;
    }
  ) {
    if (!currentWorkspaceId) return;
    createWorkspaceActivity(currentWorkspaceId, { text: entry.text, memberId: entry.userId })
      .then((record) => {
        setActivityRecords((current) => [record, ...current]);
      })
      .catch((err: unknown) => console.error("Couldn't log workspace activity:", err));
  }

  /* ============================================================
     STATS
  ============================================================ */

  const totalMembers = members.length;

  const activeCount = members.filter(
    (member) =>
      member.status === "Active"
  ).length;

  const invitedCount = members.filter(
    (member) =>
      member.status === "Invited"
  ).length;

  const activeRate =
    totalMembers > 0
      ? Math.round(
          (activeCount / totalMembers) * 100
        )
      : 0;

  /* ============================================================
     FILTER + SORT
  ============================================================ */

  const filteredMembers = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase();

    return members.filter((member) => {
      const matchesQuery =
        normalizedQuery === "" ||
        member.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        member.email
          .toLowerCase()
          .includes(normalizedQuery) ||
        member.jobTitle
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "All" ||
        member.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "All" ||
        member.department === departmentFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesDepartment
      );
    });
  }, [
    members,
    query,
    statusFilter,
    departmentFilter,
  ]);

  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers];

    list.sort((a, b) => {
      switch (sortKey) {
        case "role":
          return (
            a.role.localeCompare(b.role) ||
            a.name.localeCompare(b.name)
          );

        case "department":
          return (
            a.department.localeCompare(
              b.department
            ) ||
            a.name.localeCompare(b.name)
          );

        case "joined":
          return b.joinedDate.localeCompare(
            a.joinedDate
          );

        case "tasks":
          return (
            b.tasksActive - a.tasksActive
          );

        default:
          return a.name.localeCompare(
            b.name
          );
      }
    });

    return list;
  }, [
    filteredMembers,
    sortKey,
  ]);

  /* ============================================================
     QUICK STAT FILTERS
  ============================================================ */

  function clearFilters() {
    setQuery("");
    setStatusFilter("All");
    setDepartmentFilter("All");
  }

  function showAllMembers() {
    clearFilters();

    /*
      Hide Teams panel when clicking Total Members.
    */
    setShowTeamsPanel(false);
  }

  function showActiveMembers() {
    setQuery("");
    setDepartmentFilter("All");
    setStatusFilter("Active");

    /*
      Hide Teams panel when clicking Active.
    */
    setShowTeamsPanel(false);
  }

  function showInvitedMembers() {
    setQuery("");
    setDepartmentFilter("All");
    setStatusFilter("Invited");

    /*
      Hide Teams panel when clicking Invites.
    */
    setShowTeamsPanel(false);
  }

  /*
    NEW TEAM BUTTON BEHAVIOR

    Clicking Teams now toggles the Teams panel.
    It no longer resets the page to Total Members.
  */
  function showTeams() {
    setShowTeamsPanel(
      (current) => !current
    );
  }

  /* ============================================================
     HANDLERS
  ============================================================ */

  /* ============================================================
     MUTATIONS (Stage 1 — Real Team Roster)
     Each calls the real API first and only updates memberRecords from
     the successful response — never optimistically, never a silent
     fallback if the request fails (see mutationError below).
  ============================================================ */

  async function handleInvite(
    values: InviteMemberValues
  ) {
    if (!canManage || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      const record = await addWorkspaceMember(currentWorkspaceId, values.email, values.role);
      setMemberRecords((current) => [...current, record]);

      const added = mapWorkspaceMemberToMember(record);

      persistActivity({
        userId: record.userId,
        text: `${added.name} was added to the workspace as ${added.role}`,
      });

      notifyMemberInvited(
        addNotification,
        {
          department: added.department,
          actionHref: "/team",
          recipientId: record.userId,
        }
      );

      setIsInviteOpen(false);
      // Real members are never "Invited" (see mapWorkspaceMemberToMember)
      // — clear filters instead of the old setStatusFilter("Invited"),
      // which would otherwise hide the member that was just added.
      clearFilters();
      setShowTeamsPanel(false);
    } catch (error) {
      setMutationError(
        error instanceof ApiError
          ? error.message
          : "Couldn't add that member. Try again."
      );
    }
  }

  async function handleSaveMember(
    values: MemberDetailsSaveValues
  ) {
    if (!selectedMember || !canManage || !currentWorkspaceId) {
      return;
    }

    // name/jobTitle/department/status/email/phone/location are
    // disabled inputs for a real member (MemberDetailsDrawer's
    // readOnlyProfileFields) — only role can actually differ here.
    if (values.role === selectedMember.role) {
      return;
    }

    const nextRole = memberRoleToWorkspaceRole(values.role);

    setMutationError(null);

    try {
      const record = await updateWorkspaceMemberRole(currentWorkspaceId, selectedMember.id, nextRole);
      setMemberRecords((current) =>
        current.map((candidate) => (candidate.id === selectedMember.id ? record : candidate))
      );

      persistActivity({
        userId: record.userId,
        text: `${selectedMember.name}'s role changed to ${mapWorkspaceMemberToMember(record).role}`,
      });
    } catch (error) {
      setMutationError(
        error instanceof ApiError
          ? error.message
          : "Couldn't update that member's role. Try again."
      );
    }
  }

  async function handleRemoveMember(
    id: string
  ) {
    if (!canManage || !currentWorkspaceId) return;

    const member =
      members.find(
        (candidate) =>
          candidate.id === id
      );
    // Resolved before removal — memberRecords no longer has this row
    // once removeWorkspaceMember succeeds below.
    const removedUserId = memberRecords.find((record) => record.id === id)?.userId;

    setMutationError(null);

    try {
      await removeWorkspaceMember(currentWorkspaceId, id);
      setMemberRecords((current) => current.filter((candidate) => candidate.id !== id));

      if (member && removedUserId) {
        persistActivity({
          userId: removedUserId,
          text: `${member.name} was removed from the workspace`,
        });
      }

      setSelectedMemberId(
        (current) =>
          current === id
            ? null
            : current
      );
    } catch (error) {
      setMutationError(
        error instanceof ApiError
          ? error.message
          : "Couldn't remove that member. Try again."
      );
    }
  }

  /* ============================================================
     EMPTY STATE
  ============================================================ */

  let emptyTitle =
    "No members found";

  let emptyMessage =
    "Try a different search term or filter.";

  if (
    query.trim() === "" &&
    statusFilter === "All" &&
    departmentFilter === "All"
  ) {
    emptyTitle =
      "No team members yet";

    emptyMessage =
      "Invite your first teammate to get your workspace started.";
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div
      className="fade-in"
      style={{
        width: "100%",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: 28,
              fontWeight: 560,
              marginBottom: 6,
              color: "#20242B",
            }}
          >
            Team
          </h1>

          <p
            style={{
              fontSize: 13.5,
              color: "#667085",
              margin: 0,
            }}
          >
            Manage your workspace members,
            teams, and collaboration.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              setIsInviteOpen(true)
            }
            className="lift"
            style={{
              background: "#20242B",
              color: "#F7F8FA",
              border: "none",
              borderRadius: 12,
              padding: "11px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <UserPlus size={15} />
            Add Member
          </button>
        )}
      </div>

      {(membersError || mutationError) && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#B3564B" }}>
          {membersError ?? mutationError}
        </p>
      )}

      {/* ======================================================
          STATS
      ====================================================== */}

      <div
        className="grid grid-cols-2 xl:grid-cols-4"
        style={{
          gap: 12,
          marginBottom: 18,
        }}
      >
        {/* TOTAL MEMBERS */}

        <StatCard
          label="Total members"
          value={String(
            totalMembers
          )}
          icon={Users}
          compact
          onClick={
            showAllMembers
          }
          active={
            !showTeamsPanel &&
            statusFilter ===
              "All" &&
            departmentFilter ===
              "All" &&
            query === ""
          }
        />

        {/* ACTIVE NOW */}

        <StatCard
          label="Active now"
          value={String(
            activeCount
          )}
          delta={`${activeRate}%`}
          icon={UserCheck}
          ring={activeRate}
          compact
          onClick={
            showActiveMembers
          }
          active={
            !showTeamsPanel &&
            statusFilter ===
              "Active"
          }
        />

        {/* TEAMS */}

        <StatCard
          label="Roles"
          value={String(
            WORKSPACE_ROLE_GROUPS.length
          )}
          icon={Users2}
          compact
          onClick={showTeams}
          active={
            showTeamsPanel
          }
        />

        {/* PENDING INVITES */}

        <StatCard
          label="Pending invites"
          value={String(
            invitedCount
          )}
          icon={Mail}
          compact
          onClick={
            showInvitedMembers
          }
          active={
            !showTeamsPanel &&
            statusFilter ===
              "Invited"
          }
        />
      </div>

      {/* ======================================================
          TEAMS PANEL

          This is now BELOW the 4 STAT CARDS.
          It is NOT in the right sidebar anymore.
      ====================================================== */}

      {showTeamsPanel && (
        <div
          className="fade-in"
          style={{
            marginBottom: 18,
          }}
        >
          <TeamsPanel
            teams={WORKSPACE_ROLE_GROUPS}
            members={members}
          />
        </div>
      )}

      {/* ======================================================
          MAIN LAYOUT
      ====================================================== */}

      <div
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]"
        style={{
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* ==================================================
            MEMBERS
        ================================================== */}

        <div
          style={{
            minWidth: 0,
            background: "#FFFFFF",
            border:
              "1px solid #E4E8ED",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* TOOLBAR */}

          <div
            className="flex items-center flex-wrap"
            style={{
              gap: 10,
              padding: 14,
              background: "#FFFFFF",
              borderBottom:
                "1px solid #E4E8ED",
            }}
          >
            {/* SEARCH */}

            <div
              className="flex items-center"
              style={{
                gap: 8,
                flex: 1,
                minWidth: 180,
                padding:
                  "8px 10px",
                background:
                  "#F7F8FA",
                border:
                  "1px solid #E4E8ED",
                borderRadius: 10,
              }}
            >
              <Search
                size={15}
                color="#98A2B3"
              />

              <input
                value={query}
                onChange={(event) => {
                   setQuery(event.target.value);
                  setShowTeamsPanel(false);
              }}
                placeholder="Search members..."
                style={{
                  border: "none",
                  outline: "none",
                  background:
                    "transparent",
                  fontSize: 12.5,
                  color: "#20242B",
                  width: "100%",
                }}
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    setQuery("")
                  }
                  style={{
                    border: "none",
                    background:
                      "transparent",
                    cursor:
                      "pointer",
                    color:
                      "#98A2B3",
                    display: "flex",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* TEAM FILTER */}

            <select
              value={
                departmentFilter
              }
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setShowTeamsPanel(false);
          }}
              style={filterStyle}
            >
              <option value="All">
                All roles
              </option>

              {WORKSPACE_ROLE_GROUPS.map(
                (team) => (
                  <option
                    key={
                      team.id
                    }
                    value={
                      team.name
                    }
                  >
                    {team.name}
                  </option>
                )
              )}
            </select>

            {/* STATUS FILTER */}

            <select
              value={
                statusFilter
              }
              onChange={(event) => {
                setStatusFilter(
                    event.target.value as StatusFilter
                );
                 setShowTeamsPanel(false);
              }}
              style={filterStyle}
            >
              {STATUS_FILTERS.map(
                (option) => (
                  <option
                    key={
                      option
                    }
                    value={
                      option
                    }
                  >
                    {option ===
                    "All"
                      ? "All statuses"
                      : option}
                  </option>
                )
              )}
            </select>

            {/* SORT */}

            <select
              value={sortKey}
              onChange={(event) =>
                setSortKey(
                  event.target
                    .value as SortKey
                )
              }
              style={filterStyle}
            >
              {SORT_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.key
                    }
                    value={
                      option.key
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>

            {/* VIEW TOGGLE */}

            <div
              className="flex items-center"
              style={{
                gap: 2,
                background:
                  "#EEF2F6",
                borderRadius: 10,
                padding: 3,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "grid"
                  )
                }
                style={viewToggleStyle(
                  viewMode ===
                    "grid"
                )}
              >
                <LayoutGrid
                  size={14}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "list"
                  )
                }
                style={viewToggleStyle(
                  viewMode ===
                    "list"
                )}
              >
                <Rows3
                  size={14}
                />
              </button>
            </div>
          </div>

          {/* ==================================================
              ACTIVE FILTER BAR
          ================================================== */}

          {(query ||
            statusFilter !==
              "All" ||
            departmentFilter !==
              "All") && (
            <div
              className="flex items-center flex-wrap"
              style={{
                gap: 7,
                padding:
                  "10px 14px",
                background:
                  "#FFFFFF",
                borderBottom:
                  "1px solid #E4E8ED",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color:
                    "#98A2B3",
                }}
              >
                Showing
              </span>

              {statusFilter !==
                "All" && (
                <span
                  style={
                    activeFilterStyle
                  }
                >
                  {statusFilter}
                </span>
              )}

              {departmentFilter !==
                "All" && (
                <span
                  style={
                    activeFilterStyle
                  }
                >
                  {departmentFilter}
                </span>
              )}

              {query && (
                <span
                  style={
                    activeFilterStyle
                  }
                >
                  "{query}"
                </span>
              )}

              <button
                type="button"
                onClick={
                  clearFilters
                }
                style={{
                  marginLeft:
                    "auto",
                  border: "none",
                  background:
                    "transparent",
                  color:
                    "#8EA7BF",
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor:
                    "pointer",
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* ==================================================
              MEMBERS LIST
          ================================================== */}

          <div
            style={{
              padding: 16,
              background:
                "#F7F8FA",
            }}
          >
            {membersLoading || workspaceLoading ? (
              <EmptyState
                title="Loading members…"
                message="Fetching your workspace's real roster."
              />
            ) : sortedMembers.length ===
            0 ? (
              <EmptyState
                title={
                  emptyTitle
                }
                message={
                  emptyMessage
                }
              />
            ) : viewMode ===
              "grid" ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                style={{
                  gap: 14,
                }}
              >
                {sortedMembers.map(
                  (member) => (
                    <MemberCard
                      key={
                        member.id
                      }
                      member={
                        member
                      }
                      canManage={
                        canManage
                      }
                      onSelect={() =>
                        setSelectedMemberId(
                          member.id
                        )
                      }
                      onRemove={() =>
                        handleRemoveMember(
                          member.id
                        )
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div
                className="flex flex-col"
                style={{
                  gap: 7,
                }}
              >
                {sortedMembers.map(
                  (member) => (
                    <MemberRow
                      key={
                        member.id
                      }
                      member={
                        member
                      }
                      canManage={
                        canManage
                      }
                      onSelect={() =>
                        setSelectedMemberId(
                          member.id
                        )
                      }
                      onRemove={() =>
                        handleRemoveMember(
                          member.id
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            RIGHT SIDEBAR

            TeamsPanel removed from here.
            ActivityFeed stays here.
        ================================================== */}

        <div
          className="w-full flex flex-col"
          style={{
            gap: 14,
          }}
        >
          <ActivityFeed
            activity={activity}
            members={members}
            isLoading={activityLoading}
            error={activityError}
          />
        </div>
      </div>

      {/* ======================================================
          INVITE DRAWER
      ====================================================== */}

      <InviteMemberDrawer
        isOpen={isInviteOpen}
        canGrantOwner={canGrantOwner}
        onClose={() =>
          setIsInviteOpen(false)
        }
        onInvite={
          handleInvite
        }
      />

      {/* ======================================================
          MEMBER DETAILS DRAWER
      ====================================================== */}

      <MemberDetailsDrawer
        member={selectedMember}
        isOpen={
          selectedMember !==
          null
        }
        teams={WORKSPACE_ROLE_GROUPS}
        roleOptions={WORKSPACE_MEMBER_ROLE_OPTIONS}
        readOnlyProfileFields
        canEdit={canManage}
        onClose={() =>
          setSelectedMemberId(
            null
          )
        }
        onSave={
          handleSaveMember
        }
        onRemove={() =>
          selectedMember &&
          handleRemoveMember(
            selectedMember.id
          )
        }
      />
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const filterStyle = {
  appearance: "none" as const,
  border:
    "1px solid #E4E8ED",
  borderRadius: 10,
  background: "#F7F8FA",
  padding: "8px 12px",
  fontSize: 11.5,
  fontWeight: 600,
  color: "#20242B",
  outline: "none",
  cursor: "pointer",
};

const activeFilterStyle = {
  padding: "4px 8px",
  borderRadius: 6,
  background: "#EEF2F6",
  color: "#667085",
  fontSize: 10,
  fontWeight: 600,
};

function viewToggleStyle(
  active: boolean
) {
  return {
    width: 30,
    height: 28,
    borderRadius: 7,
    border: "none",
    background: active
      ? "#FFFFFF"
      : "transparent",
    boxShadow: active
      ? "0 1px 2px rgba(32,36,43,0.08)"
      : "none",
    color: active
      ? "#20242B"
      : "#98A2B3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  } as const;
}