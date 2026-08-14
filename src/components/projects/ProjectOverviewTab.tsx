import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Circle, Target, Diamond, Plus, X, ArrowRight, Paperclip, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ProjectMilestone, ProjectObjective } from "../../types/dashboard";
import type { Status } from "../../data/taskData";
import { getDueGroup } from "../../data/taskData";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useProjectContext } from "../../context/projectContextValue";
import {
  generateId,
  buildProjectActivityFeed,
  readProjectActivity,
  readProjectDiscussions,
  readProjectFiles,
  formatRelativeTime,
  canEditProjectContent,
} from "../../data/workspaceData";
import { ACTIVITY_META } from "./activityMeta";

const STATUS_META: { status: Status; label: string; icon: LucideIcon; color: string }[] = [
  { status: "To Do", label: "To Do", icon: Circle, color: "var(--text-3)" },
  { status: "In Progress", label: "In Progress", icon: Clock3, color: "var(--blue-dark)" },
  { status: "Completed", label: "Completed", icon: CheckCircle2, color: "var(--text)" },
];

const PRIORITY_TONE: Record<"Low" | "Medium" | "High", "surface" | "blue" | "dark"> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-card border-soft flex items-center" style={{ gap: 10, borderRadius: 14, padding: "12px 14px", flex: 1, minWidth: 120 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} strokeWidth={1.8} color="var(--blue-dark)" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="font-display" style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
        <div className="text-ink-3" style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

/* ============================================================
   OBJECTIVES
============================================================ */

function ObjectivesCard({ objectives, canEdit, onToggle, onAdd, onRemove }: {
  objectives: ProjectObjective[];
  canEdit: boolean;
  onToggle: (id: string) => void;
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  const doneCount = objectives.filter((o) => o.done).length;

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Target size={15} strokeWidth={1.8} color="var(--blue-dark)" />
          <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>Objectives</h3>
        </div>
        {objectives.length > 0 && (
          <span className="text-ink-3" style={{ fontSize: 11.5 }}>{doneCount} / {objectives.length}</span>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: 6, marginBottom: 10 }}>
        {objectives.length === 0 ? (
          <p className="text-ink-3" style={{ fontSize: 12.5 }}>No objectives set yet — add the goals this project is working toward.</p>
        ) : (
          objectives.map((objective) => (
            <div key={objective.id} className="group flex items-center" style={{ gap: 10, padding: "7px 8px", borderRadius: 10 }}>
              <button
                type="button"
                onClick={() => onToggle(objective.id)}
                disabled={!canEdit}
                aria-label={objective.done ? "Mark incomplete" : "Mark complete"}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  border: `1.5px solid ${objective.done ? "var(--text)" : "var(--border)"}`,
                  background: objective.done ? "var(--text)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canEdit ? "pointer" : "default",
                  flexShrink: 0,
                }}
              >
                {objective.done && <CheckCircle2 size={12} color="var(--surface)" strokeWidth={2.4} />}
              </button>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12.5,
                  color: objective.done ? "var(--text-3)" : "var(--text)",
                  textDecoration: objective.done ? "line-through" : "none",
                }}
              >
                {objective.text}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(objective.id)}
                  aria-label="Remove objective"
                  className="group-hover:opacity-100"
                  style={{ opacity: 0, transition: "opacity 120ms ease", border: "none", background: "transparent", color: "var(--text-3)", cursor: "pointer", display: "flex" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <div className="flex items-center" style={{ gap: 6 }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Add an objective…"
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "7px 10px", fontSize: 12, background: "var(--surface-2)", color: "var(--text)", outline: "none" }}
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Add objective"
            style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "var(--text)", color: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MILESTONES
============================================================ */

function MilestonesCard({ milestones, canEdit, onToggle, onAdd, onRemove }: {
  milestones: ProjectMilestone[];
  canEdit: boolean;
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Diamond size={13} strokeWidth={1.8} color="var(--blue-dark)" />
          <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>Milestones</h3>
        </div>
        {milestones.length > 0 && (
          <span className="text-ink-3" style={{ fontSize: 11.5 }}>{doneCount} / {milestones.length}</span>
        )}
      </div>

      <div className="flex flex-col" style={{ gap: 6, marginBottom: 10 }}>
        {milestones.length === 0 ? (
          <p className="text-ink-3" style={{ fontSize: 12.5 }}>No milestones yet — mark the key checkpoints on the way to done.</p>
        ) : (
          milestones.map((milestone) => (
            <div key={milestone.id} className="group flex items-center" style={{ gap: 10, padding: "7px 8px", borderRadius: 10 }}>
              <button
                type="button"
                onClick={() => onToggle(milestone.id)}
                disabled={!canEdit}
                aria-label={milestone.done ? "Mark incomplete" : "Mark complete"}
                style={{ border: "none", background: "transparent", cursor: canEdit ? "pointer" : "default", display: "flex", flexShrink: 0, color: milestone.done ? "var(--blue-dark)" : "var(--text-3)" }}
              >
                <Diamond size={12} strokeWidth={2.2} fill={milestone.done ? "currentColor" : "none"} />
              </button>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: milestone.done ? "var(--text-3)" : "var(--text)", textDecoration: milestone.done ? "line-through" : "none" }}>
                {milestone.title}
              </span>
              {milestone.dueDate && (
                <span className="text-ink-3" style={{ fontSize: 11, flexShrink: 0 }}>
                  {new Date(`${milestone.dueDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(milestone.id)}
                  aria-label="Remove milestone"
                  style={{ opacity: 0, transition: "opacity 120ms ease", border: "none", background: "transparent", color: "var(--text-3)", cursor: "pointer", display: "flex" }}
                  className="group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <div className="flex items-center" style={{ gap: 6 }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Add a milestone…"
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "7px 10px", fontSize: 12, background: "var(--surface-2)", color: "var(--text)", outline: "none" }}
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Add milestone"
            style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "var(--text)", color: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   OVERVIEW TAB
============================================================ */

export function ProjectOverviewTab() {
  const { project, projectTasks: tasks, openNewTaskDrawer, permission } = useProjectWorkspace();
  const { setProjects } = useProjectContext();
  const canEdit = canEditProjectContent(permission);

  const total = tasks.length;
  const recentTasks = tasks.slice(0, 5);

  const upcomingDeadlines = tasks
    .filter((task) => task.status !== "Completed" && task.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  const activityFeed = buildProjectActivityFeed(project, tasks, readProjectActivity(project.id)).slice(0, 5);
  const filesCount = readProjectFiles(project.id).length;
  const discussionsCount = readProjectDiscussions(project.id).length;
  const openCount = tasks.filter((task) => task.status !== "Completed").length;
  const commentsCount = tasks.reduce((sum, task) => sum + (task.comments?.length ?? 0), 0);

  function updateProject(updater: (objectives: ProjectObjective[], milestones: ProjectMilestone[]) => Partial<{ objectives: ProjectObjective[]; milestones: ProjectMilestone[] }>) {
    setProjects((current) =>
      current.map((p) => (p.id === project.id ? { ...p, ...updater(p.objectives ?? [], p.milestones ?? []) } : p))
    );
  }

  function toggleObjective(id: string) {
    if (!canEdit) return;
    updateProject((objectives) => ({
      objectives: objectives.map((o) => (o.id === id ? { ...o, done: !o.done } : o)),
    }));
  }

  function addObjective(text: string) {
    if (!canEdit) return;
    updateProject((objectives) => ({ objectives: [...objectives, { id: generateId("objective"), text, done: false }] }));
  }

  function removeObjective(id: string) {
    if (!canEdit) return;
    updateProject((objectives) => ({ objectives: objectives.filter((o) => o.id !== id) }));
  }

  function toggleMilestone(id: string) {
    if (!canEdit) return;
    updateProject((_objectives, milestones) => ({
      milestones: milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
    }));
  }

  function addMilestone(title: string) {
    if (!canEdit) return;
    updateProject((_objectives, milestones) => ({ milestones: [...milestones, { id: generateId("milestone"), title, done: false }] }));
  }

  function removeMilestone(id: string) {
    if (!canEdit) return;
    updateProject((_objectives, milestones) => ({ milestones: milestones.filter((m) => m.id !== id) }));
  }

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      {/* HEADER ROW — description + New Task */}
      <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 620 }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 6 }}>
            Overview
          </h2>
          <p className="text-ink-2" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {project.description ?? "No description yet — add one from Settings to give the team context on what this project is about."}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openNewTaskDrawer}
            className="lift"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--text)",
              color: "var(--surface)",
              border: "none",
              borderRadius: 13,
              padding: "10px 16px",
              fontSize: 12.5,
              fontWeight: 650,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            New Task
          </button>
        )}
      </div>

      {/* QUICK STATS */}
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <MiniStat icon={CheckCircle2} label="Open tasks" value={openCount} />
        <MiniStat icon={Paperclip} label="Files" value={filesCount} />
        <MiniStat icon={MessagesSquare} label="Discussions" value={discussionsCount} />
        <MiniStat icon={Clock3} label="Comments" value={commentsCount} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3" style={{ gap: 16 }}>
        {/* LEFT COLUMN */}
        <div className="flex flex-col" style={{ gap: 16, gridColumn: "span 2" }}>
          <ObjectivesCard objectives={project.objectives ?? []} canEdit={canEdit} onToggle={toggleObjective} onAdd={addObjective} onRemove={removeObjective} />
          <MilestonesCard milestones={project.milestones ?? []} canEdit={canEdit} onToggle={toggleMilestone} onAdd={addMilestone} onRemove={removeMilestone} />

          {/* STATUS BREAKDOWN */}
          <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, marginBottom: 14, color: "var(--text)" }}>
              Task progress
            </h3>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {STATUS_META.map((meta) => {
                const count = tasks.filter((task) => task.status === meta.status).length;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={meta.status}>
                    <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                      <div className="flex items-center" style={{ gap: 7 }}>
                        <meta.icon size={13} strokeWidth={1.8} style={{ color: meta.color }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{meta.label}</span>
                      </div>
                      <span className="text-ink-3" style={{ fontSize: 11.5 }}>
                        {count} &middot; {percent}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: meta.color, borderRadius: 999, transition: "width 400ms ease" }} />
                    </div>
                  </div>
                );
              })}
              {total === 0 && <p className="text-ink-3" style={{ fontSize: 12.5 }}>No tasks in this project yet.</p>}
            </div>
          </div>

          {/* RECENT TASKS */}
          <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, marginBottom: 12, color: "var(--text)" }}>
              Recent tasks
            </h3>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {recentTasks.length === 0 ? (
                <p className="text-ink-3" style={{ fontSize: 12.5 }}>No tasks yet.</p>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center border-soft" style={{ gap: 10, padding: "10px 12px", borderRadius: 12 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.title}
                    </span>
                    <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
                    <Pill tone="surface">{task.status}</Pill>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* RECENT ACTIVITY */}
          <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>Recent activity</h3>
              <Link to={`/projects/${project.id}/activity`} className="flex items-center text-ink-3" style={{ gap: 3, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="flex flex-col" style={{ gap: 12 }}>
              {activityFeed.length === 0 ? (
                <p className="text-ink-3" style={{ fontSize: 12.5 }}>Nothing has happened here yet.</p>
              ) : (
                activityFeed.map((item) => {
                  const meta = ACTIVITY_META[item.type];
                  return (
                    <div key={item.id} className="flex items-start" style={{ gap: 9 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <meta.icon size={11} strokeWidth={1.8} color="var(--blue-dark)" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4, margin: 0 }}>{item.text}</p>
                        <span className="text-ink-3" style={{ fontSize: 10.5 }}>{formatRelativeTime(item.timestampMs)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* UPCOMING DEADLINES */}
          <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, marginBottom: 12, color: "var(--text)" }}>
              Upcoming deadlines
            </h3>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-ink-3" style={{ fontSize: 12.5 }}>Nothing due soon.</p>
              ) : (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.title}
                    </div>
                    <div className="text-ink-3" style={{ fontSize: 11, marginTop: 2 }}>
                      {task.due} &middot; {getDueGroup(task.dueDate)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TEAM MEMBERS */}
          <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <h3 className="font-display" style={{ fontSize: 15.5, fontWeight: 560, marginBottom: 12, color: "var(--text)" }}>
              Team members
            </h3>
            {project.people.length === 0 ? (
              <p className="text-ink-3" style={{ fontSize: 12.5 }}>No members assigned yet.</p>
            ) : (
              <div className="flex items-center" style={{ gap: 10 }}>
                <AvatarStack people={project.people} />
                <span className="text-ink-3" style={{ fontSize: 12 }}>
                  {project.people.length} member{project.people.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
