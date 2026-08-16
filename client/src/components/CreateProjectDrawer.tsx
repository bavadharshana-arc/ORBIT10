import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, CalendarDays, Check } from "lucide-react";

import { getInitials } from "../data/teamData";
import { PROJECT_COLORS, PROJECT_TAGS, DEFAULT_PROJECT_COLOR } from "../data/projectData";
import type { Project } from "../types/dashboard";
import type { WorkspaceMemberRecord } from "../lib/workspaceApi";

/* ============================================================
   TYPES
============================================================ */

export interface CreateProjectValues {
  name: string;
  description: string;
  tag: string;
  color: string;
  startDate: string;
  dueDate: string;
  /**
   * Real workspace userIds picked as this project's initial members —
   * the caller adds them via the real ProjectMember API
   * (ProjectContext.tsx's addProjectMember) after the project itself is
   * created. The creator is always auto-added as Owner by the backend
   * and never appears in this list. Only meaningful on create; edit mode
   * leaves this empty — member management for an existing project
   * happens on its Team tab (see ProjectSettingsTab.tsx), not here, so
   * there's exactly one real UI surface that mutates membership.
   */
  memberUserIds: string[];
}

export interface CreateProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Create mode (default). Ignored when `project` is set. */
  onCreate?: (values: CreateProjectValues) => void;
  /** Editing an existing project — prefills the form and switches copy/labels to "Edit". */
  project?: Project | null;
  onUpdate?: (values: CreateProjectValues) => void;
  /** Real workspace roster to pick initial members from (create mode only) — typically the caller's own `workspaceMembers` (lib/workspaceApi.ts), already excluding the current user (auto-added as Owner). */
  workspaceMembers?: WorkspaceMemberRecord[];
}

/* ============================================================
   COMPONENT
============================================================ */

export function CreateProjectDrawer({ isOpen, onClose, onCreate, project, onUpdate, workspaceMembers = [] }: CreateProjectDrawerProps) {
  const isEditMode = project != null;

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState(PROJECT_TAGS[0]);
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  /* ==========================================================
     RESET FORM WHEN OPENED
     Adjusted during render (React's recommended pattern for
     resetting state in response to a prop change) rather than in
     an effect, so the reset happens in the same commit the drawer
     becomes visible instead of one render later.
  ========================================================== */

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      if (project) {
        setName(project.name);
        setDescription(project.description ?? "");
        setTag(project.tag || PROJECT_TAGS[0]);
        setColor(project.color ?? DEFAULT_PROJECT_COLOR);
        setStartDate(project.startDate ?? "");
        setDueDate(project.dueDate ?? "");
        setSelectedUserIds([]);
      } else {
        setName("");
        setDescription("");
        setTag(PROJECT_TAGS[0]);
        setColor(DEFAULT_PROJECT_COLOR);
        setStartDate("");
        setDueDate("");
        setSelectedUserIds([]);
      }
    }
  }

  /* ==========================================================
     ESCAPE KEY
  ========================================================== */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  /* ==========================================================
     MEMBER TOGGLE
  ========================================================== */

  function handleMemberToggle(userId: string) {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]));
  }

  /* ==========================================================
     FORM SUBMIT
  ========================================================== */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const values: CreateProjectValues = {
      name: trimmedName,
      description: description.trim(),
      tag,
      color,
      startDate,
      dueDate,
      memberUserIds: selectedUserIds,
    };

    if (isEditMode) {
      onUpdate?.(values);
    } else {
      onCreate?.(values);
    }
  }

  const memberCandidates = useMemo(
    () =>
      workspaceMembers.map((record) => ({
        userId: record.userId,
        name: record.user.name ?? record.user.email,
        jobTitle: record.user.jobTitle ?? "Team member",
        initials: getInitials(record.user.name ?? record.user.email),
        bg: record.user.avatarBg ?? "#AFC5DA",
        fg: record.user.avatarFg ?? "#20242B",
      })),
    [workspaceMembers],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={isEditMode ? "Edit project" : "Create project"}>
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close create project drawer"
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
            <h2 className="font-display text-xl font-semibold text-[#20242B]">{isEditMode ? "Edit Project" : "Create Project"}</h2>
            <p className="mt-1 text-xs text-[#667085]">
              {isEditMode ? "Update this project's details." : "Start a new initiative in your workspace."}
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
            {/* NAME */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Project name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Orbit Mobile App"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project about?"
                rows={4}
                className="w-full resize-none rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition placeholder:text-[#98A2B3] focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {PROJECT_TAGS.map((option) => {
                  const selected = tag === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTag(option)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                        selected ? "border-[#20242B] bg-[#20242B] text-white" : "border-soft bg-card text-[#667085] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLOR */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((option) => {
                  const selected = color === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={option.name}
                      title={option.name}
                      onClick={() => setColor(option.value)}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition"
                      style={{
                        background: option.value,
                        boxShadow: selected ? "0 0 0 2px #FFFFFF, 0 0 0 3.5px #8EA7BF" : "none",
                      }}
                    >
                      {selected && <Check size={13} color="#FFFFFF" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Start date</label>
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-soft bg-card px-3 py-3 pl-9 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">Due date</label>
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-xl border border-soft bg-card px-3 py-3 pl-9 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                  />
                </div>
              </div>
            </div>

            {/* TEAM MEMBERS — create mode only; an existing project's
                membership is managed for real on its Team tab, so this
                drawer doesn't offer a second way to change it. */}
            {!isEditMode && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#20242B]">Team members</label>
                <div className="space-y-1.5">
                  {memberCandidates.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-soft px-3 py-4 text-center text-xs text-[#98A2B3]">
                      No other workspace members to add yet.
                    </p>
                  ) : (
                    memberCandidates.map((member) => {
                      const selected = selectedUserIds.includes(member.userId);
                      return (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => handleMemberToggle(member.userId)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            selected ? "border-[#8EA7BF] bg-[#EEF2F6]" : "border-soft bg-card hover:bg-[#F7F8FA]"
                          }`}
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{ background: member.bg, color: member.fg }}
                          >
                            {member.initials}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-[#20242B]">{member.name}</span>
                            <span className="block truncate text-[10px] text-[#98A2B3]">{member.jobTitle}</span>
                          </span>

                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#20242B] text-white">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
            <button type="submit" className="rounded-xl bg-[#20242B] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90">
              {isEditMode ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default CreateProjectDrawer;
