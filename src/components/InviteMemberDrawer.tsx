import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { WORKSPACE_ROLES, type WorkspaceRole } from "../lib/workspaceApi";

/* ============================================================
   INVITE MEMBER DRAWER (Stage 1 — Real Team Roster)

   Previously collected name/email/jobTitle/department for a person
   who might not exist in ORBIT at all, and fabricated a full local
   Member record from those fields with status "Invited". The real
   backend has no invitation system — POST /workspaces/:id/members
   only ever adds an *existing* ORBIT account (by userId, or by email
   since Stage 1's minimal backend addition) to the workspace with a
   real WorkspaceRole. name/jobTitle are that person's own profile
   fields (self-service only, PATCH /users/me), not something an
   admin can set on their behalf, and there's no "team/department"
   concept in the data model at all — so this form now only collects
   what the real endpoint actually accepts: email + role.
============================================================ */

export interface InviteMemberValues {
  email: string;
  role: WorkspaceRole;
}

export interface InviteMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (values: InviteMemberValues) => void;
  /** Only an existing OWNER may grant OWNER at add-time — the backend enforces this too (403 otherwise), this just keeps the option from being offered to someone it would only fail for. */
  canGrantOwner: boolean;
}

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function InviteMemberDrawer({ isOpen, onClose, onInvite, canGrantOwner }: InviteMemberDrawerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");

  // Reset the form the same render the drawer reopens, rather than one
  // render later in an effect — matches CreateProjectDrawer.tsx's
  // `wasOpen` pattern (React's documented way to adjust state in
  // response to a prop change).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setEmail("");
      setRole("MEMBER");
    }
  }

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

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    onInvite({
      email: trimmedEmail,
      role,
    });
  }

  if (!isOpen) {
    return null;
  }

  const roleOptions = WORKSPACE_ROLES.filter((option) => option !== "OWNER" || canGrantOwner);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add member">
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close add member drawer"
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
            <h2 className="font-display text-xl font-semibold text-[#20242B]">Add Member</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Add an existing ORBIT account to this workspace by email. They'll need to have already signed up.
            </p>
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
            {/* EMAIL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Email</label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jordan@orbit.io"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* ROLE */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((option) => {
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
                      {ROLE_LABEL[option]}
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
              Add Member
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default InviteMemberDrawer;
