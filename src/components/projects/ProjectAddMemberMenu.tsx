import { useState } from "react";
import { Search, UserPlus } from "lucide-react";

import type { Member } from "../../data/teamData";
import { Avatar } from "../ui/Avatar";

interface ProjectAddMemberMenuProps {
  /** Workspace members not already on the project. */
  candidates: Member[];
  onAdd: (member: Member) => void;
}

/** A small popover for adding an existing workspace member to the current project — distinct from InviteMemberDrawer, which creates a brand-new workspace member. */
export function ProjectAddMemberMenu({ candidates, onAdd }: ProjectAddMemberMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = candidates.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="lift"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--text)",
          color: "var(--surface)",
          border: "none",
          borderRadius: 12,
          padding: "9px 15px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <UserPlus size={14} strokeWidth={2} />
        Add member
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            className="bg-card border-soft shadow-float-lg fade-in-static"
            style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 260, borderRadius: 14, padding: 10, zIndex: 41 }}
          >
            <div
              className="bg-surface-2 flex items-center"
              style={{ gap: 8, padding: "8px 10px", borderRadius: 10, marginBottom: 8 }}
            >
              <Search size={13} strokeWidth={1.8} color="var(--text-3)" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members…"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", width: "100%" }}
              />
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.length === 0 ? (
                <p className="text-ink-3" style={{ fontSize: 11.5, padding: "10px 8px", textAlign: "center" }}>
                  {candidates.length === 0 ? "Everyone's already on this project." : "No members match."}
                </p>
              ) : (
                filtered.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onAdd(member);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="nav-item flex items-center"
                    style={{
                      gap: 9,
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      borderRadius: 10,
                      padding: "7px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Avatar initials={member.initials} bg={member.bg} fg={member.fg} size={28} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {member.name}
                      </span>
                      <span className="text-ink-3" style={{ display: "block", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {member.jobTitle}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
