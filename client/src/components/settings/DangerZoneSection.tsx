import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Trash2, TriangleAlert } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { deleteMyAccount } from "../../lib/userApi";
import { ApiError } from "../../lib/api";
import { useWorkspaceRole, isWorkspaceOwner } from "../../hooks/useWorkspaceRole";
import { ConfirmDangerModal } from "./ConfirmDangerModal";
import { SectionCard } from "./shared";

/* ============================================================
   DANGER ZONE (Phase 19 Frontend Integration audit fix, Priority 3)

   Previously both actions here only cleared obsolete localStorage keys
   nothing in the real app ever wrote to — clicking either one silently
   did nothing to real backend data while claiming to. Now:

   - "Delete account" calls the real, self-service DELETE /api/users/me
     (user.controller.ts's deleteMe) — a genuine destructive operation,
     scoped to the caller's own account by the JWT, same as every other
     self-service endpoint in this app. The backend refuses this for
     the permanent demo accounts, so the seeded Demo Workspace survives
     no matter who explores it.
   - "Reset workspace data" has no safe real equivalent: there is no
     backend endpoint that resets a shared workspace's real tasks/
     members/activity back to a known state, and building one now would
     be a genuinely dangerous, easy-to-misuse addition (it would nuke
     every other member's real data, not just the caller's own) rather
     than a contained fix. Removed rather than left pointing at nothing,
     per the audit's own guidance.
============================================================ */

export function DangerZoneSection() {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Stage 6 (Permissions Alignment): real WorkspaceRole, Owner only —
  // matches DELETE /workspaces/:id's actual gate (requireWorkspaceRole
  // ("OWNER"), workspace.routes.ts), the most-privileged real action
  // this destructive a panel represents.
  const workspaceRole = useWorkspaceRole();
  const canManage = isWorkspaceOwner(workspaceRole);

  if (!canManage) return null;

  async function handleDeleteConfirm() {
    setDeleteError(null);
    setDeleting(true);

    try {
      await deleteMyAccount();
      setIsDeleteOpen(false);
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : "Couldn't delete your account. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SectionCard icon={TriangleAlert} title="Danger Zone" description="These actions are irreversible. Proceed with care." tone="danger">
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-between flex-wrap"
          style={{ gap: 14, padding: "14px 16px", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E4E8ED", opacity: 0.7 }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "#20242B" }}>Reset workspace data</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#98A2B3" }}>
              Not available — there's no safe way to reset this shared workspace's real data for every member from
              here. Ask an administrator to remove specific projects or tasks instead.
            </p>
          </div>

          <span
            className="flex items-center"
            style={{
              gap: 7,
              border: "1px solid #E4E8ED",
              background: "#F7F8FA",
              color: "#98A2B3",
              borderRadius: 11,
              padding: "9px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Ban size={13} />
            Unavailable
          </span>
        </div>

        <div
          className="flex items-center justify-between flex-wrap"
          style={{ gap: 14, padding: "14px 16px", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E9CCC6" }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "#20242B" }}>Delete account</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#98A2B3" }}>
              Permanently deletes your account ({user?.email}). This cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center"
            style={{
              gap: 7,
              border: "none",
              background: "#B3564B",
              color: "#FFF8F6",
              borderRadius: 11,
              padding: "9px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Trash2 size={13} />
            Delete account
          </button>
        </div>

        {deleteError && <p style={{ margin: 0, fontSize: 12, color: "#B3564B" }}>{deleteError}</p>}
      </div>

      <ConfirmDangerModal
        isOpen={isDeleteOpen}
        title="Delete account"
        description="This permanently deletes your account and removes you from every workspace you belong to. This cannot be undone."
        confirmWord="DELETE"
        confirmLabel={deleting ? "Deleting…" : "Delete account"}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </SectionCard>
  );
}
