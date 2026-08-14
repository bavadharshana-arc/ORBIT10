import { Mail, Pencil, Trash2 } from "lucide-react";

import type { Member } from "../../data/teamData";
import { formatJoinedDate } from "../../data/teamData";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";
import { STATUS_META } from "./statusMeta";

interface MemberRowProps {
  member: Member;
  /** Admin only — clicking the row to view details stays available to everyone; the Edit/Remove affordances don't. */
  canManage: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function MemberRow({ member, canManage, onSelect, onRemove }: MemberRowProps) {
  const status = STATUS_META[member.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="bg-card border-soft flex items-center fade-in"
      style={{
        width: "100%",
        borderRadius: 12,
        padding: "10px 14px",
        gap: 14,
        cursor: "pointer",
        transition: "box-shadow 160ms ease",
      }}
    >
      {/* IDENTITY */}
      <div className="flex items-center" style={{ gap: 10, flex: "1.6 1 200px", minWidth: 0 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar initials={member.initials} bg={member.bg} fg={member.fg} size={34} />
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: status.dot,
              boxShadow: "0 0 0 2px #FFFFFF",
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 650, color: "#20242B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.name}
          </div>
          <div className="flex items-center text-ink-3" style={{ gap: 5, fontSize: 11.5 }}>
            <Mail size={11} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email}</span>
          </div>
        </div>
      </div>

      {/* ROLE */}
      <div className="hidden sm:block text-ink-2" style={{ flex: "0.7 1 90px", fontSize: 12.5, fontWeight: 600 }}>
        {member.jobTitle}
      </div>

      {/* DEPARTMENT */}
      <div style={{ flex: "0.7 1 100px" }}>
        <Pill tone="surface">{member.department}</Pill>
      </div>

      {/* STATUS */}
      <div style={{ flex: "0.6 1 80px" }}>
        <Pill tone={status.tone}>{member.status}</Pill>
      </div>

      {/* TASKS */}
      <div className="hidden md:block text-ink-3" style={{ flex: "0.5 1 70px", fontSize: 12 }}>
        {member.tasksActive} active
      </div>

      {/* JOINED */}
      <div className="hidden lg:block text-ink-3" style={{ flex: "0.6 1 90px", fontSize: 12 }}>
        {formatJoinedDate(member.joinedDate)}
      </div>

      {/* ACTIONS */}
      {canManage && (
        <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            aria-label={`Edit ${member.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            style={iconButtonStyle}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${member.name}`}
            onClick={(event) => {
              event.stopPropagation();

              const confirmed = window.confirm(
                `Remove ${member.name} from the workspace? This cannot be undone.`
              );

              if (!confirmed) {
                return;
              }

              onRemove();
            }}
            style={iconButtonStyle}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

const iconButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "#F7F8FA",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#667085",
} as const;
