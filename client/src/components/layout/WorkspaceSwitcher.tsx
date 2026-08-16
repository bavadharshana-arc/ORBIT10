import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";

import { useWorkspace } from "../../context/workspaceContextValue";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

/* ============================================================
   WORKSPACE SWITCHER (Phase 30, workspace creation added Phase 31)

   Exposes the real workspaces WorkspaceContext already fetches
   (Phase 24) — this component adds no workspace-discovery or
   persistence logic of its own; it only renders `workspaces`/
   `currentWorkspace` and calls the existing `selectWorkspace()`,
   which already updates state and persists the choice to
   `orbit-current-workspace-id`. Selecting a different workspace is
   what drives the rest of the real cascade (ProjectContext ->
   TaskContext -> Comments/Files/Discussions), all built in Phases
   25–29 — this component doesn't touch any of that directly.

   Positioned/styled to match ProfileMenu.tsx's existing dropdown
   convention (portal to document.body, anchored to the trigger's own
   bounding rect, backdrop-click-to-close) — the same fix ProfileMenu
   already needed for the identical stacking-context problem, reused
   here rather than reinvented.

   Phase 31 adds the only piece Phase 30 left out: creating one. A
   member of >=1 workspace gets a "Create workspace" row inside the
   existing dropdown; a zero-workspace account (freshly registered, or
   removed from its last one) has no workspace to switch to, so the
   trigger button opens the create modal directly instead of a
   dropdown with nothing in it — same "support zero-workspace users"
   case Projects.tsx/Team.tsx already render an empty state for, just
   given a way out instead of a dead end.
============================================================ */

interface PanelPosition {
  top: number;
  left: number;
}

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, currentWorkspaceId, isLoading, error, selectWorkspace, refetch } =
    useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 8, left: rect.left });
  }

  function toggleOpen() {
    // Nothing to switch to yet — skip straight to creating one instead
    // of opening an empty dropdown.
    if (workspaces.length === 0) {
      setIsCreateOpen(true);
      return;
    }
    if (!isOpen) updatePosition();
    setIsOpen((current) => !current);
  }

  function close() {
    setIsOpen(false);
  }

  function openCreate() {
    close();
    setIsCreateOpen(true);
  }

  function handleCreated(workspaceId: string) {
    setIsCreateOpen(false);
    // Same pair WorkspaceSection.tsx's save flow uses: refetch() pulls
    // the new workspace into the shared list, selectWorkspace() makes it
    // current and persists the choice — order doesn't matter since
    // currentWorkspace is derived by id lookup, re-resolving once the
    // refetch lands regardless of which settles first.
    refetch();
    selectWorkspace(workspaceId);
  }

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const hasNoWorkspaces = !isLoading && !error && workspaces.length === 0;

  const label = isLoading
    ? "Loading workspace…"
    : error
      ? "Workspace unavailable"
      : hasNoWorkspaces
        ? "Create a workspace"
        : (currentWorkspace?.name ?? "No workspace");

  // A genuine fetch failure still disables the trigger (nothing useful to
  // do from here but retry elsewhere) — but zero workspaces is a real,
  // actionable state, not a broken one, so the button stays live and
  // opens the create modal (see toggleOpen) instead of a dropdown with
  // nothing in it.
  const disabled = isLoading || !!error;

  return (
    <div style={{ padding: "0 8px 14px" }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Switch workspace"
        onClick={toggleOpen}
        disabled={disabled}
        className={disabled ? "border-soft flex items-center" : "border-soft lift flex items-center"}
        style={{
          width: "100%",
          gap: 9,
          padding: "9px 10px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--card)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "var(--surface-2)",
            color: "var(--blue-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Building2 size={13} strokeWidth={1.8} />
        </div>

        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 650,
            color: "var(--text)",
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>

        {!disabled &&
          (hasNoWorkspaces ? (
            <Plus size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
          ) : (
            <ChevronDown size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
          ))}
      </button>

      {error && !isLoading && (
        <p style={{ margin: "6px 2px 0", fontSize: 10.5, color: "#B3564B" }}>{error}</p>
      )}

      {isOpen &&
        position &&
        createPortal(
          <>
            <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
            <div
              role="menu"
              className="bg-card border-soft shadow-float-lg fade-in-static"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: 230,
                borderRadius: 16,
                padding: 6,
                zIndex: 1000,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              <div style={{ padding: "6px 8px 8px" }}>
                <span
                  className="text-ink-3"
                  style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}
                >
                  Your workspaces
                </span>
              </div>

              {workspaces.map((workspace) => {
                const isActive = workspace.id === currentWorkspaceId;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      selectWorkspace(workspace.id);
                      close();

                      // A project detail page (/projects/:id/...) is tied
                      // to a specific project id that may not exist in the
                      // newly selected workspace — ProjectWorkspace.tsx
                      // already handles that gracefully (shows its
                      // existing "Project not found" state, Phase 25), but
                      // navigating back to the project list avoids that
                      // flash for the common case. Every other page
                      // (Dashboard, Projects, Tasks, Kanban, Team, ...) is
                      // workspace-wide and already re-renders correctly
                      // once ProjectContext/TaskContext refetch — no
                      // navigation needed there.
                      if (/^\/projects\/[^/]+/.test(location.pathname)) {
                        navigate("/projects");
                      }
                    }}
                    className="nav-item flex items-center"
                    style={{
                      width: "100%",
                      gap: 9,
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: "none",
                      background: "transparent",
                      color: "var(--text)",
                      fontSize: 12.5,
                      fontWeight: isActive ? 650 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {workspace.name}
                    </span>
                    {isActive && <Check size={14} color="var(--blue-dark)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}

              <div style={{ borderTop: "1px solid var(--border)", margin: "6px 4px 4px", paddingTop: 4 }}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openCreate}
                  className="nav-item flex items-center"
                  style={{
                    width: "100%",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 9,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-2)",
                    fontSize: 12.5,
                    fontWeight: 550,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Plus size={14} style={{ flexShrink: 0 }} />
                  Create workspace
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}

      <CreateWorkspaceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
