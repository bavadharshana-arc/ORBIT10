import type { CSSProperties } from "react";
import { Mail, MapPin, Pencil, Trash2 } from "lucide-react";

import type { Member } from "../../data/teamData";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";
import { STATUS_META } from "./statusMeta";

interface MemberCardProps {
  member: Member;
  /** Admin only — clicking the card to view details stays available to everyone; the Edit/Remove affordances don't. */
  canManage: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function MemberCard({
  member,
  canManage,
  onSelect,
  onRemove,
}: MemberCardProps) {
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
      className="group bg-card border-soft lift fade-in flex flex-col"
      style={{
        borderRadius: 16,
        padding: 18,
        gap: 14,
        cursor: "pointer",
        position: "relative",
        minHeight: 250,
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "0 1px 3px rgba(32, 36, 43, 0.04)",
        transition: "all 0.2s ease",
      }}
    >
      {/* ACTIONS */}
      {canManage && (
        <div
          className="flex items-center"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            gap: 5,
          }}
        >
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

      {/* IDENTITY */}
      <div
        className="flex items-center"
        style={{
          gap: 12,
          paddingRight: 60,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            initials={member.initials}
            bg={member.bg}
            fg={member.fg}
            size={44}
          />

          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: status.dot,
              boxShadow: "0 0 0 2px var(--card)",
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 650,
              margin: 0,
              marginBottom: 3,
              lineHeight: 1.3,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.name}
          </h3>

          <p
            className="text-ink-2"
            style={{
              fontSize: 11.5,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.jobTitle}
          </p>
        </div>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          height: 1,
          background: "var(--surface-2)",
          width: "100%",
        }}
      />

      {/* TEAM + STATUS */}
      <div
        className="flex items-center flex-wrap"
        style={{ gap: 6 }}
      >
        <Pill tone="surface">
          {member.department}
        </Pill>

        <Pill tone={status.tone}>
          {member.status}
        </Pill>
      </div>

      {/* CONTACT INFO */}
      <div
        className="flex flex-col text-ink-3"
        style={{
          gap: 7,
          fontSize: 11.5,
          padding: "10px 11px",
          borderRadius: 10,
          background: "var(--surface)",
          border: "1px solid var(--surface-2)",
        }}
      >
        <div
          className="flex items-center"
          style={{ gap: 7 }}
        >
          <Mail
            size={12}
            style={{ flexShrink: 0 }}
          />

          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.email}
          </span>
        </div>

        <div
          className="flex items-center"
          style={{ gap: 7 }}
        >
          <MapPin
            size={12}
            style={{ flexShrink: 0 }}
          />

          <span>
            {member.location}
          </span>
        </div>
      </div>

      {/* FOOTER */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "1px solid var(--surface-2)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 650,
              color: "var(--text)",
            }}
          >
            {member.tasksActive}
          </p>

          <span
            className="text-ink-3"
            style={{ fontSize: 10.5 }}
          >
            Active tasks
          </span>
        </div>

        <span
          className="text-ink-3"
          style={{
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {member.role}
        </span>
      </div>
    </div>
  );
}

const iconButtonStyle: CSSProperties = {
  width: 27,
  height: 27,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-2)",
};