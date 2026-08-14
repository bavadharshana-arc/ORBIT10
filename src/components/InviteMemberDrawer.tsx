import { useEffect, useState, type FormEvent } from "react";
import { X, ChevronDown } from "lucide-react";

import type { MemberRole, OrbitTeam } from "../data/teamData";
import { ROLES } from "../lib/permissions";

export interface InviteMemberValues {
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  role: MemberRole;
}

export interface InviteMemberDrawerProps {
  isOpen: boolean;
  teams: OrbitTeam[];
  onClose: () => void;
  onInvite: (values: InviteMemberValues) => void;
}

/** MemberRole is AuthRole (see teamData.ts), so the option list comes
 *  straight from lib/permissions.ts's ROLES rather than being
 *  redeclared here — that stays the single source of truth for which
 *  5 roles exist and what order they display in. */
const ROLE_OPTIONS: MemberRole[] = ROLES;

export function InviteMemberDrawer({ isOpen, teams, onClose, onInvite }: InviteMemberDrawerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<MemberRole>("Member");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName("");
    setEmail("");
    setJobTitle("");
    setDepartment(teams[0]?.name ?? "");
    setRole("Member");
  }, [isOpen, teams]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    onInvite({
      name: trimmedName,
      email: trimmedEmail,
      jobTitle: jobTitle.trim(),
      department: department || (teams[0]?.name ?? ""),
      role,
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Invite member">
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close invite member drawer"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/20 backdrop-blur-[2px]"
      />

      {/* DRAWER */}
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-120 flex-col bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-soft px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#20242B]">Invite Member</h2>
            <p className="mt-1 text-xs text-[#667085]">Add a new person to your Orbit workspace.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F7F8FA] hover:text-[#20242B]"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* NAME */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Full name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Jordan Avery"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jordan@orbit.io"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* JOB TITLE */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Job title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Product Designer"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition placeholder:text-[#98A2B3] focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* TEAM */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Team</label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-soft bg-card px-3.5 py-3 pr-10 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
                />
              </div>
            </div>

            {/* ROLE */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((option) => {
                  const selected = role === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                        selected
                          ? "border-[#20242B] bg-[#20242B] text-white"
                          : "border-soft bg-card text-[#667085] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-2 border-t border-soft bg-card px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-soft px-4 py-2.5 text-xs font-semibold text-[#667085] transition hover:bg-[#F7F8FA] hover:text-[#20242B]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#20242B] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Send Invite
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default InviteMemberDrawer;
