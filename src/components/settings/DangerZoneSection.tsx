import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Trash2, TriangleAlert } from "lucide-react";

import { deleteAllOrbitData, resetWorkspaceData } from "../../data/settingsData";
import { useWorkspaceRole, isWorkspaceOwner } from "../../hooks/useWorkspaceRole";
import { ConfirmDangerModal } from "./ConfirmDangerModal";
import { SectionCard } from "./shared";

type DangerAction = "reset" | "delete" | null;

export function DangerZoneSection() {
  const [activeAction, setActiveAction] = useState<DangerAction>(null);
  const navigate = useNavigate();

  // Stage 6 (Permissions Alignment): real WorkspaceRole, Owner only —
  // matches DELETE /workspaces/:id's actual gate (requireWorkspaceRole
  // ("OWNER"), workspace.routes.ts), the most-privileged real action
  // this destructive a panel represents.
  const workspaceRole = useWorkspaceRole();
  const canManage = isWorkspaceOwner(workspaceRole);

  if (!canManage) return null;

  function handleResetConfirm() {
    resetWorkspaceData();
    setActiveAction(null);
    window.location.reload();
  }

  function handleDeleteConfirm() {
    deleteAllOrbitData();
    setActiveAction(null);
    navigate("/login", { replace: true });
  }

  return (
    <SectionCard icon={TriangleAlert} title="Danger Zone" description="These actions are irreversible. Proceed with care." tone="danger">
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-between flex-wrap"
          style={{ gap: 14, padding: "14px 16px", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E9CCC6" }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "#20242B" }}>Reset workspace data</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#98A2B3" }}>
              Clears all team members, tasks, and activity, restoring the original demo data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveAction("reset")}
            className="flex items-center"
            style={{
              gap: 7,
              border: "1px solid #E9CCC6",
              background: "#FBF2F1",
              color: "#B3564B",
              borderRadius: 11,
              padding: "9px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <RefreshCw size={13} />
            Reset data
          </button>
        </div>

        <div
          className="flex items-center justify-between flex-wrap"
          style={{ gap: 14, padding: "14px 16px", borderRadius: 12, background: "#FFFFFF", border: "1px solid #E9CCC6" }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "#20242B" }}>Delete account</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#98A2B3" }}>
              Permanently deletes your account and all workspace data. This cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveAction("delete")}
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
      </div>

      <ConfirmDangerModal
        isOpen={activeAction === "reset"}
        title="Reset workspace data"
        description="This clears all team members, tasks, and activity from this browser and restores the original demo data. This cannot be undone."
        confirmWord="RESET"
        confirmLabel="Reset data"
        onCancel={() => setActiveAction(null)}
        onConfirm={handleResetConfirm}
      />

      <ConfirmDangerModal
        isOpen={activeAction === "delete"}
        title="Delete account"
        description="This permanently deletes your account, settings, and all workspace data from this browser. This cannot be undone."
        confirmWord="DELETE"
        confirmLabel="Delete account"
        onCancel={() => setActiveAction(null)}
        onConfirm={handleDeleteConfirm}
      />
    </SectionCard>
  );
}
