import { useEffect, useState } from "react";
import { X, Trash2, Mail, Phone, MapPin, CalendarDays } from "lucide-react";

import type { Member, MemberRole, MemberStatus, OrbitTeam } from "../data/teamData";
import { formatJoinedDate } from "../data/teamData";
import { ROLES } from "../lib/permissions";

import { Avatar } from "./ui/Avatar";
import { Pill } from "./ui/Pill";
import { STATUS_META } from "./team/statusMeta";

/** MemberRole is AuthRole (see teamData.ts), so the option list comes
 *  straight from lib/permissions.ts's ROLES rather than being
 *  redeclared here — that stays the single source of truth for which
 *  5 roles exist and what order they display in. */
const ROLE_OPTIONS: MemberRole[] = ROLES;
const STATUS_OPTIONS: MemberStatus[] = ["Active", "Away", "Offline", "Invited"];

export interface MemberDetailsSaveValues {
  name: string;
  jobTitle: string;
  department: string;
  role: MemberRole;
  status: MemberStatus;
  email: string;
  phone: string;
  location: string;
}

interface MemberDetailsDrawerProps {
  member: Member | null;
  isOpen: boolean;
  teams: OrbitTeam[];
  /** Whether the current user can edit fields, save, and remove this member. Defaults to true so any future call site outside a role-aware context keeps today's behavior. */
  canEdit?: boolean;
  onClose: () => void;
  onSave: (values: MemberDetailsSaveValues) => void;
  onRemove: () => void;
}

export function MemberDetailsDrawer({
  member,
  isOpen,
  teams,
  canEdit = true,
  onClose,
  onSave,
  onRemove,
}: MemberDetailsDrawerProps) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<MemberRole>("Member");
  const [status, setStatus] = useState<MemberStatus>("Active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!member) {
      return;
    }

    setName(member.name);
    setJobTitle(member.jobTitle);
    setDepartment(member.department);
    setRole(member.role);
    setStatus(member.status);
    setEmail(member.email);
    setPhone(member.phone);
    setLocation(member.location);
  }, [member]);

  function handleSave() {
    if (!member || !canEdit) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    onSave({
      name: trimmedName,
      jobTitle: jobTitle.trim(),
      department,
      role,
      status,
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
    });
  }

  function handleRemoveClick() {
    if (!member || !canEdit) {
      return;
    }

    const confirmed = window.confirm(`Remove ${member.name} from the workspace? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    onRemove();
  }

  if (!isOpen || !member) {
    return null;
  }

  const statusDot = STATUS_META[member.status].dot;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      {/* OVERLAY */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(32,36,43,0.32)" }} />

      {/* DRAWER */}
      <div
        className="bg-card shadow-float-lg fade-in flex flex-col"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "100%",
          maxWidth: 460,
          overflowY: "auto",
          padding: 24,
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
          <Pill tone="surface">{member.department}</Pill>

          <div className="flex items-center" style={{ gap: 8 }}>
            {canEdit && (
              <button type="button" onClick={handleRemoveClick} aria-label="Remove member" style={headerButtonStyle}>
                <Trash2 size={15} />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close member details" style={headerButtonStyle}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* IDENTITY */}
        <div className="flex items-center" style={{ gap: 14, marginBottom: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar initials={member.initials} bg={member.bg} fg={member.fg} size={56} />
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: statusDot,
                boxShadow: "0 0 0 3px #FFFFFF",
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
              className="font-display"
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: "#20242B",
                border: "none",
                outline: "none",
                background: "transparent",
                padding: 0,
                width: "100%",
              }}
            />
            <p className="text-ink-3" style={{ margin: "2px 0 0", fontSize: 12 }}>
              {member.role} · Joined {formatJoinedDate(member.joinedDate)}
            </p>
          </div>
        </div>

        {/* FIELDS */}
        <div className="flex flex-col" style={{ gap: 14, marginBottom: 20 }}>
          <div className="flex flex-col" style={{ gap: 5 }}>
            <label className="text-ink-3" style={{ fontSize: 11 }}>
              Job title
            </label>
            <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} disabled={!canEdit} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <label className="text-ink-3" style={{ fontSize: 11 }}>
                Team
              </label>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} disabled={!canEdit} style={selectStyle}>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col" style={{ gap: 5 }}>
              <label className="text-ink-3" style={{ fontSize: 11 }}>
                Role
              </label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as MemberRole)}
                disabled={!canEdit}
                style={selectStyle}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <label className="text-ink-3" style={{ fontSize: 11 }}>
              Status
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as MemberStatus)}
              disabled={!canEdit}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <label className="text-ink-3" style={{ fontSize: 11 }}>
              Email
            </label>
            <div className="flex items-center" style={{ ...inputStyle, gap: 8 }}>
              <Mail size={13} color="#98A2B3" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!canEdit}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, color: "#20242B" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <label className="text-ink-3" style={{ fontSize: 11 }}>
                Phone
              </label>
              <div className="flex items-center" style={{ ...inputStyle, gap: 8 }}>
                <Phone size={13} color="#98A2B3" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={!canEdit}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, color: "#20242B" }}
                />
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 5 }}>
              <label className="text-ink-3" style={{ fontSize: 11 }}>
                Location
              </label>
              <div className="flex items-center" style={{ ...inputStyle, gap: 8 }}>
                <MapPin size={13} color="#98A2B3" />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  disabled={!canEdit}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, color: "#20242B" }}
                />
              </div>
            </div>
          </div>

          {canEdit && (
            <button type="button" onClick={handleSave} className="lift" style={saveButtonStyle}>
              Save changes
            </button>
          )}
        </div>

        {/* STATS */}
        <div style={{ borderTop: "1px solid #E4E8ED", paddingTop: 16 }}>
          <div className="flex items-center text-ink-2" style={{ gap: 6, marginBottom: 12 }}>
            <CalendarDays size={14} />
            <span style={{ fontSize: 12.5, fontWeight: 650 }}>Activity summary</span>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 10 }}>
            <div className="border-soft" style={{ borderRadius: 12, padding: "10px 12px", background: "#F7F8FA" }}>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 560 }}>
                {member.tasksActive}
              </div>
              <div className="text-ink-3" style={{ fontSize: 11 }}>
                Active tasks
              </div>
            </div>
            <div className="border-soft" style={{ borderRadius: 12, padding: "10px 12px", background: "#F7F8FA" }}>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 560 }}>
                {member.tasksCompleted}
              </div>
              <div className="text-ink-3" style={{ fontSize: 11 }}>
                Completed tasks
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   STYLES
================================================================ */

const headerButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "#EEF2F6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#667085",
} as const;

const inputStyle = {
  border: "1px solid #E4E8ED",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12.5,
  color: "#20242B",
  background: "#F7F8FA",
  outline: "none",
} as const;

const selectStyle = {
  ...inputStyle,
  fontWeight: 600,
} as const;

const saveButtonStyle = {
  background: "#20242B",
  color: "#F7F8FA",
  border: "none",
  borderRadius: 12,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  alignSelf: "flex-start",
} as const;
