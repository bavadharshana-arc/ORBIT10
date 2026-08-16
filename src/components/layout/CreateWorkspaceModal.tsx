import { useEffect, useState, type FormEvent } from "react";
import { Building2, X } from "lucide-react";

import { ApiError } from "../../lib/api";
import { createWorkspace } from "../../lib/workspaceApi";

/* ============================================================
   CREATE WORKSPACE MODAL (Phase 31)

   The one write WorkspaceSwitcher.tsx (Phase 30) didn't cover: POST
   /api/workspaces already existed server-side (workspace.controller.ts's
   createWorkspace, name-only, caller becomes OWNER via req.userId — no
   client-supplied identity involved), just nothing in the client called
   it. This is the only thing that does — no mock/localStorage workspace
   ever existed to replace.

   Centered dialog (not a side drawer) to match ConfirmDangerModal.tsx's
   footprint for a single-field form, but themed with the var(--...)
   tokens WorkspaceSwitcher/Sidebar already use (ConfirmDangerModal's own
   #hex values are Settings-only and don't respond to dark mode).

   On success, hands the new WorkspaceRecord to the caller rather than
   deciding what happens next itself — WorkspaceSwitcher is the one that
   knows to refetch() + selectWorkspace() it, since that's the exact same
   pair WorkspaceSection.tsx's save flow already uses.
============================================================ */

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (workspaceId: string) => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form the same render the modal reopens, rather than one
  // render later in an effect — matches CreateProjectDrawer.tsx's `wasOpen`
  // pattern (React's documented way to adjust state in response to a prop
  // change without the extra render a useEffect would cost here).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setName("");
      setError(null);
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Workspace name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const workspace = await createWorkspace(trimmed);
      onCreated(workspace.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the workspace. Try again.");
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create workspace"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/30 backdrop-blur-[2px]"
      />

      <div
        className="fade-in shadow-float-lg"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          margin: 20,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 22,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "var(--surface-2)",
                color: "var(--blue-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={15} strokeWidth={1.8} />
            </div>
            <h3 className="font-display" style={{ fontSize: 16, fontWeight: 650, color: "var(--text)", margin: 0 }}>
              Create workspace
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "var(--surface-2)",
              borderRadius: 8,
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-2)",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: "6px 0 16px" }}>
          You'll be its first member and OWNER. You can invite others and fill in the rest of its
          settings afterward.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, fontWeight: 650, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
            Workspace name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Inc."
            disabled={isSaving}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 12.5,
              color: "var(--text)",
              background: "var(--card)",
              outline: "none",
              marginBottom: error ? 8 : 18,
            }}
          />

          {error && <p style={{ margin: "0 0 14px", fontSize: 11.5, color: "#B3564B" }}>{error}</p>}

          <div className="flex items-center justify-end" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                background: "var(--card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 11,
                padding: "9px 15px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isSaving ? "default" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: "var(--text)",
                color: "var(--surface)",
                border: "none",
                borderRadius: 11,
                padding: "9px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isSaving ? "default" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
