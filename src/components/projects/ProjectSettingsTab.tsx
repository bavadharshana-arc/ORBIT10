import { useMemo } from "react";
import { Info, Users, Archive, ArchiveRestore, Copy, TriangleAlert, Check, Trash2 } from "lucide-react";

import { loadMembers } from "../../data/teamData";
import { PROJECT_COLORS, PROJECT_TAGS } from "../../data/projectData";
import { matchMember, canManageProject } from "../../data/workspaceData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useProjectContext } from "../../context/projectContextValue";
import { SectionCard, Field } from "../settings/shared";
import { primaryButtonStyle, secondaryButtonStyle } from "../settings/styles";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";
import { ProjectAddMemberMenu } from "./ProjectAddMemberMenu";

export function ProjectSettingsTab() {
  const { project, isArchived, openEditDrawer, openDeleteModal, duplicateProject, archiveProject, permission } = useProjectWorkspace();
  const canManage = canManageProject(permission);
  const { setProjects } = useProjectContext();
  const allMembers = useMemo(() => loadMembers(), []);

  const resolvedMembers = useMemo(
    () => project.people.map((person) => ({ person, matched: matchMember(person, allMembers) })),
    [project.people, allMembers]
  );

  const candidates = useMemo(
    () => allMembers.filter((member) => !project.people.some((person) => person.initials === member.initials && person.bg === member.bg)),
    [allMembers, project.people]
  );

  function setColor(color: string) {
    if (!canManage) return;
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, color } : p)));
  }

  function addMember(member: (typeof allMembers)[number]) {
    if (!canManage) return;
    setProjects((current) =>
      current.map((p) => (p.id === project.id ? { ...p, people: [...p.people, { initials: member.initials, bg: member.bg, fg: member.fg }] } : p))
    );
  }

  function removeMember(person: (typeof project.people)[number]) {
    if (!canManage) return;
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, people: p.people.filter((candidate) => candidate !== person) } : p)));
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

      {/* MEMBERS */}
      <SectionCard icon={Users} title="Members" description="Who has access to this project.">
        <div className="flex flex-col" style={{ gap: 12 }}>
          <div className="flex items-center justify-between">
            <span className="text-ink-3" style={{ fontSize: 11.5 }}>{project.people.length} member{project.people.length === 1 ? "" : "s"}</span>
            {canManage && <ProjectAddMemberMenu candidates={candidates} onAdd={addMember} />}
          </div>

          {resolvedMembers.length === 0 ? (
            <p className="text-ink-3" style={{ fontSize: 12 }}>No members yet.</p>
          ) : (
            <div className="flex flex-col" style={{ gap: 6 }}>
              {resolvedMembers.map(({ person, matched }, index) => (
                <div key={`${person.initials}-${index}`} className="flex items-center" style={{ gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--surface-2)" }}>
                  <Avatar initials={person.initials} bg={person.bg} fg={person.fg} size={28} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {matched?.name ?? person.initials}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`Remove ${matched?.name ?? person.initials}`}
                      onClick={() => removeMember(person)}
                      style={{ border: "none", background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
