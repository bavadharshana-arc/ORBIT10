import { Info, Users, Archive, ArchiveRestore, Copy, TriangleAlert, Check, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PROJECT_COLORS, PROJECT_TAGS } from "../../data/projectData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useProjectContext } from "../../context/projectContextValue";
import { SectionCard, Field } from "../settings/shared";
import { primaryButtonStyle, secondaryButtonStyle } from "../settings/styles";
import { Pill } from "../ui/Pill";

export function ProjectSettingsTab() {
  const { project, isArchived, openEditDrawer, openDeleteModal, duplicateProject, archiveProject, canManageProjectEntity, projectMembers } =
    useProjectWorkspace();
  // Stage 6 (Permissions Alignment): edit/duplicate/archive/delete are
  // all project-*entity* actions — real WorkspaceRole-gated
  // (requireWorkspaceRole("OWNER", "ADMIN"), project.routes.ts), not
  // this project's ProjectRole. See ProjectWorkspace.tsx's doc comment
  // on canManageProjectEntity.
  const canManage = canManageProjectEntity;
  const { setProjects } = useProjectContext();

  function setColor(color: string) {
    if (!canManage) return;
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, color } : p)));
  }

  function unarchive() {
    if (!canManage) return;
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, status: undefined } : p)));
  }

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16, maxWidth: 720 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Settings</h2>
        <p className="text-ink-2" style={{ fontSize: 12.5 }}>Manage this project's details, membership, and lifecycle.</p>
      </div>

      {/* PROJECT DETAILS */}
      <SectionCard icon={Info} title="Project details" description="Name, description, category, and color.">
        <div className="flex flex-col" style={{ gap: 16 }}>
          <div className="flex items-start" style={{ gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: project.color ?? "var(--blue-dark)", flexShrink: 0 }} />
                <span style={{ fontSize: 14.5, fontWeight: 650, color: "var(--text)" }}>{project.name}</span>
                <Pill tone="surface">{project.tag}</Pill>
              </div>
              <p className="text-ink-2" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                {project.description || "No description yet."}
              </p>
            </div>
            {canManage && (
              <button type="button" onClick={openEditDrawer} style={secondaryButtonStyle}>
                Edit details
              </button>
            )}
          </div>

          <Field label="Color">
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {PROJECT_COLORS.map((option) => {
                const selected = project.color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.name}
                    title={option.name}
                    onClick={() => setColor(option.value)}
                    disabled={!canManage}
                    className="flex items-center justify-center"
                    style={{ width: 30, height: 30, borderRadius: "50%", background: option.value, border: "none", cursor: canManage ? "pointer" : "default", boxShadow: selected ? "0 0 0 2px var(--card), 0 0 0 3.5px var(--blue-dark)" : "none" }}
                  >
                    {selected && <Check size={13} color="#FFFFFF" />}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Category" hint="Change the full category and dates from Edit details.">
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {PROJECT_TAGS.map((tag) => (
                <Pill key={tag} tone={project.tag === tag ? "dark" : "surface"}>{tag}</Pill>
              ))}
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* MEMBERS — real roster (ProjectContext's projectMembersByProjectId),
          same data the Team tab manages. This card is read-only and
          points there instead of duplicating its own add/remove UI, so
          there's exactly one place that actually mutates project
          membership (Phase 19 Frontend Integration follow-up: Persist
          Project people). */}
      <SectionCard icon={Users} title="Members" description="Who has access to this project.">
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
          <span className="text-ink-3" style={{ fontSize: 11.5 }}>
            {projectMembers.length} member{projectMembers.length === 1 ? "" : "s"}
          </span>
          <Link
            to={`/projects/${project.id}/team`}
            className="flex items-center"
            style={{ gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
          >
            Manage on the Team tab <ArrowRight size={13} />
          </Link>
        </div>
      </SectionCard>

      {/* LIFECYCLE */}
      {canManage && (
        <SectionCard icon={Archive} title="Lifecycle" description="Duplicate this project or take it out of active rotation.">
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>Duplicate project</p>
                <p className="text-ink-3" style={{ margin: "2px 0 0", fontSize: 11 }}>Creates a copy with the same details and members, reset to 0% progress.</p>
              </div>
              <button type="button" onClick={duplicateProject} className="flex items-center" style={{ ...secondaryButtonStyle, gap: 7 }}>
                <Copy size={13} /> Duplicate
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>{isArchived ? "Restore project" : "Archive project"}</p>
                <p className="text-ink-3" style={{ margin: "2px 0 0", fontSize: 11 }}>
                  {isArchived ? "Brings this project back into your active list." : "Hides this project from the active list without deleting anything."}
                </p>
              </div>
              <button
                type="button"
                onClick={isArchived ? unarchive : archiveProject}
                className="flex items-center"
                style={{ ...(isArchived ? primaryButtonStyle : secondaryButtonStyle), gap: 7 }}
              >
                {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                {isArchived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* DANGER ZONE */}
      {canManage && (
        <SectionCard icon={TriangleAlert} title="Danger Zone" description="This action is irreversible." tone="danger">
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 14, padding: "14px 16px", borderRadius: 12, background: "var(--card)", border: "1px solid #E9CCC6" }}>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>Delete project</p>
              <p className="text-ink-3" style={{ margin: "3px 0 0", fontSize: 11 }}>Permanently deletes this project. Tasks already assigned to it are kept.</p>
            </div>
            <button
              type="button"
              onClick={openDeleteModal}
              className="flex items-center"
              style={{ gap: 7, border: "none", background: "#B3564B", color: "#FFF8F6", borderRadius: 11, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
            >
              <Trash2 size={13} /> Delete project
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
