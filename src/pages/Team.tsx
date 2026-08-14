import { useMemo, useState } from "react";

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
  loadMembers,
  saveMembers,
  loadActivity,
  saveActivity,
  teams,
  generateMemberId,
  generateActivityId,
  getAvatarColors,
  getInitials,
  canManageWorkspaceMembers,
  resolveCurrentMemberRole,
  type Member,
  type MemberStatus,
} from "../data/teamData";

import { StatCard } from "../components/dashboard/StatCard";
import { MemberCard } from "../components/team/MemberCard";
import { MemberRow } from "../components/team/MemberRow";
import { TeamsPanel } from "../components/team/TeamsPanel";
import { ActivityFeed } from "../components/team/ActivityFeed";

import { useNotificationContext } from "../context/notificationContextValue";
import { notifyMemberInvited } from "../data/systemNotifications";
import { useAuth } from "../context/AuthContext";
import { canManageUsers, resolveEffectiveRole } from "../lib/permissions";

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
   TEAM PAGE
============================================================ */

export default function Team() {
  const [members, setMembers] = useState<Member[]>(
    loadMembers
  );

  const [activity, setActivity] = useState(
    loadActivity
  );

  const { addNotification } = useNotificationContext();

  /*
    Current user's workspace role — resolved from AuthContext's own
    `role` (the authenticated identity, not a roster lookup) each
    render, so if it ever changes it takes effect immediately without
    a refresh.
  */
  const { role: authRole } = useAuth();
  const currentRole = resolveCurrentMemberRole(authRole);
  const canManage = canManageWorkspaceMembers(currentRole) && canManageUsers(resolveEffectiveRole(authRole));

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
     PERSISTENCE
  ============================================================ */

  function persistMembers(
    updater: (
      current: Member[]
    ) => Member[]
  ) {
    setMembers((current) => {
      const next = updater(current);

      saveMembers(next);

      return next;
    });
  }

  function persistActivity(
    entry: {
      memberId: string;
      text: string;
    }
  ) {
    setActivity((current) => {
      const next = [
        {
          id: generateActivityId(),
          memberId: entry.memberId,
          text: entry.text,
          timestamp: "Just now",
        },
        ...current,
      ];

      saveActivity(next);

      return next;
    });
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

  function handleInvite(
    values: InviteMemberValues
  ) {
    if (!canManage) return;

    const colors =
      getAvatarColors(
        members.length
      );

    const newMember: Member = {
      id: generateMemberId(),
      name: values.name,
      email: values.email,
      jobTitle:
        values.jobTitle ||
        "New team member",
      department:
        values.department,
      role: values.role,
      status: "Invited",
      location: "—",
      phone: "—",
      joinedDate:
        new Date()
          .toISOString()
          .split("T")[0],
      initials:
        getInitials(
          values.name
        ),
      bg: colors.bg,
      fg: colors.fg,
      tasksActive: 0,
      tasksCompleted: 0,
    };

    persistMembers(
      (current) => [
        newMember,
        ...current,
      ]
    );

    persistActivity({
      memberId: newMember.id,
      text: `${newMember.name} was invited to ${newMember.department}`,
    });

    notifyMemberInvited(
      addNotification,
      {
        memberName: newMember.name,
        department: newMember.department,
        actionHref: "/team",
      }
    );

    setIsInviteOpen(false);

    setStatusFilter("Invited");

    setShowTeamsPanel(false);
  }

  function handleSaveMember(
    values: MemberDetailsSaveValues
  ) {
    if (!selectedMember || !canManage) {
      return;
    }

    const changes: string[] = [];

    if (
      values.status !==
      selectedMember.status
    ) {
      changes.push(
        `${values.name}'s status changed to ${values.status}`
      );
    }

    if (
      values.department !==
      selectedMember.department
    ) {
      changes.push(
        `${values.name} moved to ${values.department}`
      );
    }

    if (
      values.role !==
      selectedMember.role
    ) {
      changes.push(
        `${values.name}'s role changed to ${values.role}`
      );
    }

    persistMembers(
      (current) =>
        current.map(
          (member) =>
            member.id ===
            selectedMember.id
              ? {
                  ...member,
                  name: values.name,
                  jobTitle:
                    values.jobTitle,
                  department:
                    values.department,
                  role: values.role,
                  status:
                    values.status,
                  email:
                    values.email,
                  phone:
                    values.phone,
                  location:
                    values.location,
                  initials:
                    getInitials(
                      values.name
                    ),
                }
              : member
        )
    );

    changes.forEach(
      (text) =>
        persistActivity({
          memberId:
            selectedMember.id,
          text,
        })
    );
  }

  function handleRemoveMember(
    id: string
  ) {
    if (!canManage) return;

    const member =
      members.find(
        (candidate) =>
          candidate.id === id
      );

    persistMembers(
      (current) =>
        current.filter(
          (candidate) =>
            candidate.id !== id
        )
    );

    if (member) {
      persistActivity({
        memberId: member.id,
        text: `${member.name} was removed from the workspace`,
      });
    }

    setSelectedMemberId(
      (current) =>
        current === id
          ? null
          : current
    );
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
            Invite Member
          </button>
        )}
      </div>

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
          label="Teams"
          value={String(
            teams.length
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
            teams={teams}
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
                All teams
              </option>

              {teams.map(
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
            {sortedMembers.length ===
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
          />
        </div>
      </div>

      {/* ======================================================
          INVITE DRAWER
      ====================================================== */}

      <InviteMemberDrawer
        isOpen={isInviteOpen}
        teams={teams}
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
        teams={teams}
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