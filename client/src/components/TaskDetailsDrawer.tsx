import { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  History,
  Send,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";

import type { TeamMember } from "../types/dashboard";
import type { WorkspaceActor } from "../types/workspace";

import type {
  Task,
  TaskComment,
  TaskActivityEntry,
  Priority,
  Status,
} from "../data/taskData";

import { formatRelativeTime } from "../data/workspaceData";
import { getInitials } from "../data/teamData";
import type { WorkspaceMemberRecord } from "../lib/workspaceApi";

import { Avatar } from "../components/ui/Avatar";

/* ================================================================
   ASSIGNEE OPTION
================================================================ */

export interface AssigneeOption {
  key: string;
  label: string;
  member: TeamMember;
}

/* ================================================================
   ASSIGNEE HELPERS

   buildAssigneeOptions (the mock team-record version) was removed once
   its last caller migrated to buildWorkspaceAssigneeOptions below in
   Stage 2 (Real Task Assignees) — confirmed via a zero-results grep.
================================================================ */

const NEUTRAL_ASSIGNEE_AVATAR = { bg: "var(--blue)", fg: "var(--text)" };

/**
 * Stage 2 (Real Task Assignees) — same AssigneeOption shape as
 * buildAssigneeOptions above, but sourced from the real workspace
 * roster (TaskContext's workspaceMembers, itself from Stage 1's
 * listWorkspaceMembers) instead of the mock team record. Critically,
 * `key` here is the option's real userId — exactly what
 * task.controller.ts's assigneeId column expects, so a selection from
 * this picker can be sent straight through, unlike buildAssigneeOptions'
 * keys (mock team-record labels with no backend meaning at all).
 */
export function buildWorkspaceAssigneeOptions(
  members: WorkspaceMemberRecord[]
): AssigneeOption[] {
  return members.map((member) => {
    const name = member.user.name ?? member.user.email;
    return {
      key: member.userId,
      label: name,
      member: {
        initials: getInitials(name),
        bg: member.user.avatarBg ?? NEUTRAL_ASSIGNEE_AVATAR.bg,
        fg: member.user.avatarFg ?? NEUTRAL_ASSIGNEE_AVATAR.fg,
      },
    };
  });
}

/**
 * Finds the assignee key for a TeamMember.
 */
export function getAssigneeKey(
  options: AssigneeOption[],
  member: TeamMember | undefined | null
): string | undefined {
  if (!member) {
    return undefined;
  }

  return options.find(
    (option) =>
      option.member.initials ===
      member.initials
  )?.key;
}

/**
 * Converts assignee keys back into TeamMember objects.
 */
export function getMembersForKeys(
  options: AssigneeOption[],
  keys: string[]
): TeamMember[] {
  return keys
    .map(
      (key) =>
        options.find(
          (option) =>
            option.key === key
        )?.member
    )
    .filter(
      (
        member
      ): member is TeamMember =>
        Boolean(member)
    );
}

/* ================================================================
   TASK DETAILS SAVE VALUES
================================================================ */

export interface TaskDetailsSaveValues {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due: string;
  /** YYYY-MM-DD, the same format CreateTaskDrawer's date input produces. */
  dueDate?: string;
  assigneeKeys: string[];
}

/* ================================================================
   DESCRIBE CHANGES
================================================================ */

export interface TaskChangeSummary {
  /** Human-readable log lines, pushed onto Task.activity — same shape callers already relied on before this returned a richer object. */
  messages: string[];

  /** Display labels (via labelForKey) of assignees newly added by this change — lets callers fire an assignment notification without re-diffing assigneeKeys a second time. */
  newlyAssigned: string[];

  /** True only when status transitioned *into* "Completed" this change (not merely "still Completed" on an unrelated re-save). */
  justCompleted: boolean;
}

export function describeChanges(
  before: {
    status: Status;
    priority: Priority;
    assigneeKeys: string[];
  },
  after: {
    status: Status;
    priority: Priority;
    assigneeKeys: string[];
  },
  labelForKey: (
    key: string
  ) => string
): TaskChangeSummary {
  const messages: string[] = [];

  const newlyAssigned: string[] = [];

  /* ============================================================
     STATUS
  ============================================================ */

  if (
    before.status !==
    after.status
  ) {
    messages.push(
      `Status changed to ${after.status}`
    );
  }

  const justCompleted =
    before.status !== "Completed" &&
    after.status === "Completed";

  /* ============================================================
     PRIORITY
  ============================================================ */

  if (
    before.priority !==
    after.priority
  ) {
    messages.push(
      `Priority changed to ${after.priority}`
    );
  }

  /* ============================================================
     ASSIGNEES
  ============================================================ */

  const beforeSet =
    new Set(
      before.assigneeKeys
    );

  const afterSet =
    new Set(
      after.assigneeKeys
    );

  /* Newly assigned */

  after.assigneeKeys
    .filter(
      (key) =>
        !beforeSet.has(key)
    )
    .forEach(
      (key) => {
        const label =
          labelForKey(key);

        messages.push(
          `${label} assigned`
        );

        newlyAssigned.push(
          label
        );
      }
    );

  /* Unassigned */

  before.assigneeKeys
    .filter(
      (key) =>
        !afterSet.has(key)
    )
    .forEach(
      (key) =>
        messages.push(
          `${labelForKey(
            key
          )} unassigned`
        )
    );

  return {
    messages,
    newlyAssigned,
    justCompleted,
  };
}

/* ================================================================
   ID GENERATOR
================================================================ */

export function generateId(
  prefix: string
): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* ================================================================
   COMMENT HELPERS

   Centralize comment create/edit/delete plus the matching
   "Added/Edited/Deleted a comment" Task.activity entry, so every
   call site that renders this drawer (Tasks, Timeline,
   ProjectListTab, ProjectCalendarTab, ProjectTimelineTab) shares one
   implementation instead of five hand-rolled setTasks() blocks that
   can silently drift out of sync with each other.
================================================================ */

/** Appends a new comment (trimmed) authored by `author`, and logs "Added a comment". No-ops on an empty/whitespace-only `text`. */
export function addCommentToTask(
  task: Task,
  text: string,
  author: WorkspaceActor
): Task {
  const trimmed = text.trim();

  if (!trimmed) {
    return task;
  }

  return {
    ...task,

    comments: [
      ...(task.comments ?? []),
      {
        id: generateId("comment"),
        text: trimmed,
        author,
        createdAt: Date.now(),
      },
    ],

    activity: [
      ...(task.activity ?? []),
      {
        id: generateId("activity"),
        text: "Added a comment",
        timestamp: "Just now",
      },
    ],
  };
}

/**
 * Edits an existing comment's text and stamps `editedAt`, then logs
 * "Edited a comment". Only the original author may edit their own
 * comment — this is defense in depth, the UI should already be
 * hiding the edit control for anyone else. No-ops on an
 * empty/whitespace-only `text`, a missing comment, or a mismatched
 * author.
 */
export function editCommentInTask(
  task: Task,
  commentId: string,
  text: string,
  actorId: string
): Task {
  const trimmed = text.trim();

  if (!trimmed) {
    return task;
  }

  const target = task.comments.find(
    (comment) => comment.id === commentId
  );

  if (!target || target.author.id !== actorId) {
    return task;
  }

  return {
    ...task,

    comments: task.comments.map(
      (comment) =>
        comment.id === commentId
          ? {
              ...comment,
              text: trimmed,
              editedAt: Date.now(),
            }
          : comment
    ),

    activity: [
      ...(task.activity ?? []),
      {
        id: generateId("activity"),
        text: "Edited a comment",
        timestamp: "Just now",
      },
    ],
  };
}

/**
 * Removes a comment and logs "Deleted a comment". The original
 * author can always delete their own comment; `canModerate` (task
 * Editor+) additionally allows deleting anyone's comment, mirroring
 * task deletion's own permission tier. No-ops when neither applies,
 * or the comment doesn't exist.
 */
export function deleteCommentFromTask(
  task: Task,
  commentId: string,
  actorId: string,
  canModerate: boolean
): Task {
  const target = task.comments.find(
    (comment) => comment.id === commentId
  );

  if (!target) {
    return task;
  }

  if (
    target.author.id !== actorId &&
    !canModerate
  ) {
    return task;
  }

  return {
    ...task,

    comments: task.comments.filter(
      (comment) => comment.id !== commentId
    ),

    activity: [
      ...(task.activity ?? []),
      {
        id: generateId("activity"),
        text: "Deleted a comment",
        timestamp: "Just now",
      },
    ],
  };
}

/* ================================================================
   PROPS
================================================================ */

interface TaskDetailsDrawerProps {
  task: Task | null;

  isOpen: boolean;

  statusOptions: Status[];

  assigneeOptions: AssigneeOption[];

  allowMultipleAssignees?: boolean;

  /** Whether the current user can edit fields, save, and delete this task. Defaults to true so callers outside a permission-aware context (Tasks.tsx, Kanban.tsx) keep today's behavior unchanged. */
  canEdit?: boolean;

  /** Whether the current user can post a new comment. Defaults to true for the same reason as canEdit — existing comments always stay visible regardless. */
  canComment?: boolean;

  /** The signed-in identity, used to attribute new comments and to decide which existing comments this viewer may edit/delete (own comments only — canEdit additionally allows deleting anyone's, for moderation). */
  currentActor: WorkspaceActor;

  onClose: () => void;

  onSave: (
    values: TaskDetailsSaveValues
  ) => void;

  onAddComment: (
    text: string
  ) => void;

  onEditComment: (
    commentId: string,
    text: string
  ) => void;

  onDeleteComment: (
    commentId: string
  ) => void;

  /** True while this task's real comments are being fetched (Phase 27) — defaults to false so callers that don't pass it (none should exist, but kept optional to avoid a breaking prop) keep today's behavior. */
  commentsLoading?: boolean;

  /** Set on a genuine comment load/save failure — surfaced here rather than silently falling back to whatever was already in `task.comments`. */
  commentsError?: string | null;

  onDelete: () => void;
}

/* ================================================================
   COMPONENT
================================================================ */

export function TaskDetailsDrawer({
  task,
  isOpen,
  statusOptions,
  assigneeOptions,
  allowMultipleAssignees = true,
  canEdit = true,
  canComment = true,
  currentActor,
  onClose,
  onSave,
  onAddComment,
  onEditComment,
  onDeleteComment,
  commentsLoading = false,
  commentsError = null,
  onDelete,
}: TaskDetailsDrawerProps) {
  /* ============================================================
     LOCAL FORM STATE
  ============================================================ */

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<Status>("To Do");

  const [
    priority,
    setPriority,
  ] = useState<Priority>(
    "Medium"
  );

  const [
    due,
    setDue,
  ] = useState("");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    assigneeKeys,
    setAssigneeKeys,
  ] = useState<string[]>(
    []
  );

  const [
    commentDraft,
    setCommentDraft,
  ] = useState("");

  /* Id of the comment currently being edited inline, or null when none is. */
  const [
    editingCommentId,
    setEditingCommentId,
  ] = useState<string | null>(
    null
  );

  const [
    editDraft,
    setEditDraft,
  ] = useState("");

  /* ============================================================
     SYNC FORM WHEN TASK CHANGES
  ============================================================ */

  useEffect(() => {
    if (!task) {
      return;
    }

    setTitle(
      task.title
    );

    setDescription(
      task.description
    );

    setStatus(
      task.status
    );

    setPriority(
      task.priority
    );

    setDue(
      task.due
    );

    setDueDate(
      task.dueDate ?? ""
    );

    /*
     * Unified task model:
     *
     * task.assignees
     *
     * Convert TeamMember[] into
     * assignee option keys.
     */
    const keys =
      task.assignees
        .map(
          (member) =>
            getAssigneeKey(
              assigneeOptions,
              member
            )
        )
        .filter(
          (
            key
          ): key is string =>
            Boolean(key)
        );

    setAssigneeKeys(
      keys
    );

    setCommentDraft("");
    setEditingCommentId(null);
    setEditDraft("");
  }, [
    task,
    assigneeOptions,
  ]);

  /* ============================================================
     ASSIGNEE TOGGLE
  ============================================================ */

  function toggleAssignee(
    key: string
  ) {
    setAssigneeKeys(
      (current) => {
        const isSelected =
          current.includes(
            key
          );

        /*
         * Multiple assignees
         */
        if (
          allowMultipleAssignees
        ) {
          if (
            isSelected
          ) {
            return current.filter(
              (item) =>
                item !== key
            );
          }

          return [
            ...current,
            key,
          ];
        }

        /*
         * Single assignee
         */
        return isSelected
          ? []
          : [key];
      }
    );
  }

  /* ============================================================
     SAVE
  ============================================================ */

  function handleSave() {
    if (!task || !canEdit) {
      return;
    }

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      return;
    }

    onSave({
      title:
        trimmedTitle,

      description:
        description.trim(),

      status,

      priority,

      due:
        due.trim(),

      dueDate:
        dueDate || undefined,

      assigneeKeys,
    });
  }

  /* ============================================================
     ADD COMMENT
  ============================================================ */

  function handleSubmitComment() {
    if (!canComment) {
      return;
    }

    const trimmed =
      commentDraft.trim();

    if (!trimmed) {
      return;
    }

    onAddComment(
      trimmed
    );

    setCommentDraft("");
  }

  /* ============================================================
     EDIT COMMENT
  ============================================================ */

  function handleStartEditComment(
    comment: TaskComment
  ) {
    setEditingCommentId(
      comment.id
    );

    setEditDraft(
      comment.text
    );
  }

  function handleCancelEditComment() {
    setEditingCommentId(null);
    setEditDraft("");
  }

  function handleSaveEditComment() {
    if (!editingCommentId) {
      return;
    }

    const trimmed =
      editDraft.trim();

    if (!trimmed) {
      return;
    }

    onEditComment(
      editingCommentId,
      trimmed
    );

    setEditingCommentId(null);
    setEditDraft("");
  }

  /* ============================================================
     DELETE COMMENT
  ============================================================ */

  function handleDeleteCommentClick(
    comment: TaskComment
  ) {
    const confirmed =
      window.confirm(
        "Delete this comment? This cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    onDeleteComment(
      comment.id
    );
  }

  /* ============================================================
     DELETE
  ============================================================ */

  function handleDeleteClick() {
    if (!task || !canEdit) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${task.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    onDelete();
  }

  /* ============================================================
     DO NOT RENDER
  ============================================================ */

  if (!isOpen) {
    return null;
  }

  /*
   * `isOpen` and `task` are the same boolean at every existing call site
   * (each passes `isOpen={selectedTask !== null}`), so this never fires
   * there — kept for a caller that instead opens on "a task id was
   * selected" (`isOpen={selectedTaskId !== null}`), where the id can
   * point at a task that's since been deleted, or hasn't loaded yet.
   * Rather than rendering a blank drawer in that case, show a small,
   * explicit fallback instead of nothing.
   */
  if (!task) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
        <div
          onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "rgba(32,36,43,0.32)" }}
        />
        <div
          className="bg-card shadow-float-lg fade-in flex flex-col items-center justify-center"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: "100%",
            maxWidth: 460,
            padding: 24,
            textAlign: "center",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-2)",
            }}
          >
            <X size={15} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>Task not found</span>
          <span className="text-ink-3" style={{ fontSize: 12, maxWidth: 260 }}>
            This task may have been deleted, or it isn't available anymore.
          </span>
        </div>
      </div>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
      }}
    >
      {/* ======================================================
          OVERLAY
      ====================================================== */}

      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "rgba(32,36,43,0.32)",
        }}
      />

      {/* ======================================================
          DRAWER
      ====================================================== */}

      <div
        className="bg-card shadow-float-lg fade-in flex flex-col"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "100%",
          maxWidth: 460,
          overflowY: "auto",
          padding: 24,
        }}
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div
          className="flex items-center justify-between"
          style={{
            marginBottom: 18,
          }}
        >
          <span
            className="text-ink-3"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              textTransform:
                "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {task.project}
          </span>

          <div
            className="flex items-center"
            style={{
              gap: 8,
            }}
          >
            {canEdit && (
              <button
                type="button"
                onClick={
                  handleDeleteClick
                }
                aria-label="Delete task"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background:
                    "var(--surface-2)",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor: "pointer",
                  color: "var(--text-2)",
                }}
              >
                <Trash2 size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background:
                  "var(--surface-2)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                cursor: "pointer",
                color: "var(--text-2)",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ====================================================
            TITLE
        ==================================================== */}

        <input
          value={title}
          onChange={(event) =>
            setTitle(
              event.target.value
            )
          }
          disabled={!canEdit}
          className="font-display"
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: "var(--text)",
            border: "none",
            outline: "none",
            background:
              "transparent",
            marginBottom: 16,
            padding: 0,
          }}
        />

        {/* ====================================================
            TASK FIELDS
        ==================================================== */}

        <div
          className="flex flex-col"
          style={{
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* STATUS + PRIORITY */}

          <div
            className="grid grid-cols-2"
            style={{
              gap: 12,
            }}
          >
            {/* STATUS */}

            <div
              className="flex flex-col"
              style={{
                gap: 5,
              }}
            >
              <label
                className="text-ink-3"
                style={{
                  fontSize: 11,
                }}
              >
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as Status
                  )
                }
                disabled={!canEdit}
                style={selectStyle}
              >
                {statusOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PRIORITY */}

            <div
              className="flex flex-col"
              style={{
                gap: 5,
              }}
            >
              <label
                className="text-ink-3"
                style={{
                  fontSize: 11,
                }}
              >
                Priority
              </label>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target
                      .value as Priority
                  )
                }
                disabled={!canEdit}
                style={selectStyle}
              >
                <option value="Low">
                  Low
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="High">
                  High
                </option>
              </select>
            </div>
          </div>

          {/* DUE DATE + DUE */}

          <div
            className="grid grid-cols-2"
            style={{
              gap: 12,
            }}
          >
            {/* DUE DATE */}

            <div
              className="flex flex-col"
              style={{
                gap: 5,
              }}
            >
              <label
                className="text-ink-3"
                style={{
                  fontSize: 11,
                }}
              >
                Due date
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value
                  )
                }
                disabled={!canEdit}
                style={inputStyle}
              />
            </div>

            {/* DUE */}

            <div
              className="flex flex-col"
              style={{
                gap: 5,
              }}
            >
              <label
                className="text-ink-3"
                style={{
                  fontSize: 11,
                }}
              >
                Due
              </label>

              <input
                value={due}
                onChange={(event) =>
                  setDue(
                    event.target.value
                  )
                }
                disabled={!canEdit}
                style={inputStyle}
              />
            </div>
          </div>

          {/* ASSIGNEES */}

          <div
            className="flex flex-col"
            style={{
              gap: 6,
            }}
          >
            <label
              className="text-ink-3"
              style={{
                fontSize: 11,
              }}
            >
              {allowMultipleAssignees
                ? "Assignees"
                : "Assignee"}
            </label>

            <div
              className="flex flex-wrap"
              style={{
                gap: 8,
              }}
            >
              {assigneeOptions.map(
                (option) => {
                  const isSelected =
                    assigneeKeys.includes(
                      option.key
                    );

                  return (
                    <button
                      key={
                        option.key
                      }
                      type="button"
                      onClick={() =>
                        toggleAssignee(
                          option.key
                        )
                      }
                      disabled={!canEdit}
                      className="flex items-center"
                      style={{
                        gap: 6,
                        padding:
                          "5px 10px 5px 5px",
                        borderRadius:
                          999,
                        border:
                          isSelected
                            ? "1px solid var(--blue-dark)"
                            : "1px solid var(--border)",
                        background:
                          isSelected
                            ? "var(--surface-2)"
                            : "var(--card)",
                        cursor:
                          canEdit ? "pointer" : "default",
                      }}
                    >
                      <Avatar
                        initials={
                          option
                            .member
                            .initials
                        }
                        bg={
                          option
                            .member
                            .bg
                        }
                        fg={
                          option
                            .member
                            .fg
                        }
                        size={22}
                      />

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            "var(--text)",
                        }}
                      >
                        {
                          option.label
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* DESCRIPTION */}

          <div
            className="flex flex-col"
            style={{
              gap: 5,
            }}
          >
            <label
              className="text-ink-3"
              style={{
                fontSize: 11,
              }}
            >
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              disabled={!canEdit}
              rows={4}
              style={{
                ...inputStyle,
                lineHeight: 1.5,
                resize:
                  "vertical",
                fontFamily:
                  "inherit",
              }}
            />
          </div>

          {/* SAVE */}

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              className="lift"
              style={{
                background:
                  "var(--text)",
                color:
                  "var(--surface)",
                border: "none",
                borderRadius: 12,
                padding:
                  "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  "pointer",
                alignSelf:
                  "flex-start",
              }}
            >
              Save changes
            </button>
          )}
        </div>

        {/* ====================================================
            COMMENTS
        ==================================================== */}

        <div
          style={{
            borderTop:
              "1px solid var(--border)",
            paddingTop: 16,
            marginBottom: 16,
          }}
        >
          <div
            className="flex items-center text-ink-2"
            style={{
              gap: 6,
              marginBottom: 10,
            }}
          >
            <MessageSquare
              size={14}
            />

            <span
              style={{
                fontSize: 12.5,
                fontWeight: 650,
              }}
            >
              Comments{" "}
              {task.comments
                .length > 0 &&
                `(${task.comments.length})`}
            </span>
          </div>

          {/* COMMENT LIST */}

          <div
            className="flex flex-col"
            style={{
              gap: 8,
              marginBottom: 10,
            }}
          >
            {commentsLoading ? (
              <p className="text-ink-3" style={{ fontSize: 12 }}>
                Loading comments…
              </p>
            ) : commentsError ? (
              <p style={{ fontSize: 12, color: "#B3564B" }}>{commentsError}</p>
            ) : task.comments
              .length === 0 ? (
              <p
                className="text-ink-3"
                style={{
                  fontSize: 12,
                }}
              >
                No comments yet.
              </p>
            ) : (
              task.comments.map(
                (
                  comment: TaskComment
                ) => {
                  const isOwnComment =
                    comment.author
                      .id ===
                    currentActor.id;

                  const isEditingThisComment =
                    editingCommentId ===
                    comment.id;

                  const canEditThisComment =
                    canComment &&
                    isOwnComment;

                  const canDeleteThisComment =
                    (canComment &&
                      isOwnComment) ||
                    canEdit;

                  return (
                    <div
                      key={
                        comment.id
                      }
                      className="border-soft"
                      style={{
                        borderRadius: 12,
                        padding:
                          "10px 12px",
                        background:
                          "var(--surface)",
                      }}
                    >
                      <div
                        className="flex items-center justify-between"
                        style={{
                          marginBottom: 6,
                          gap: 8,
                        }}
                      >
                        <div
                          className="flex items-center"
                          style={{
                            gap: 7,
                            minWidth: 0,
                          }}
                        >
                          <Avatar
                            initials={
                              comment
                                .author
                                .initials
                            }
                            bg={
                              comment
                                .author
                                .bg
                            }
                            fg={
                              comment
                                .author
                                .fg
                            }
                            size={20}
                          />

                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 650,
                              color:
                                "var(--text)",
                            }}
                          >
                            {
                              comment
                                .author
                                .name
                            }
                          </span>

                          <span
                            className="text-ink-3"
                            style={{
                              fontSize: 10.5,
                              flexShrink: 0,
                            }}
                          >
                            {formatRelativeTime(
                              comment.createdAt
                            )}
                            {comment.editedAt
                              ? " · edited"
                              : ""}
                          </span>
                        </div>

                        {!isEditingThisComment &&
                          (canEditThisComment ||
                            canDeleteThisComment) && (
                            <div
                              className="flex items-center"
                              style={{
                                gap: 4,
                                flexShrink: 0,
                              }}
                            >
                              {canEditThisComment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartEditComment(
                                      comment
                                    )
                                  }
                                  aria-label="Edit comment"
                                  style={
                                    commentIconButtonStyle
                                  }
                                >
                                  <Pencil
                                    size={12}
                                  />
                                </button>
                              )}

                              {canDeleteThisComment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCommentClick(
                                      comment
                                    )
                                  }
                                  aria-label="Delete comment"
                                  style={
                                    commentIconButtonStyle
                                  }
                                >
                                  <Trash2
                                    size={12}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                      </div>

                      {isEditingThisComment ? (
                        <div
                          className="flex flex-col"
                          style={{
                            gap: 6,
                          }}
                        >
                          <textarea
                            value={
                              editDraft
                            }
                            onChange={(
                              event
                            ) =>
                              setEditDraft(
                                event
                                  .target
                                  .value
                              )
                            }
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                  "Enter" &&
                                !event.shiftKey
                              ) {
                                event.preventDefault();

                                handleSaveEditComment();
                              } else if (
                                event.key ===
                                "Escape"
                              ) {
                                event.preventDefault();

                                handleCancelEditComment();
                              }
                            }}
                            rows={2}
                            autoFocus
                            style={{
                              ...inputStyle,
                              lineHeight: 1.5,
                              resize:
                                "vertical",
                              fontFamily:
                                "inherit",
                              background:
                                "var(--card)",
                            }}
                          />

                          <div
                            className="flex items-center"
                            style={{
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              onClick={
                                handleSaveEditComment
                              }
                              className="flex items-center"
                              style={{
                                gap: 4,
                                border: "none",
                                borderRadius: 8,
                                padding:
                                  "5px 10px",
                                background:
                                  "var(--text)",
                                color:
                                  "var(--surface)",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor:
                                  "pointer",
                              }}
                            >
                              <Check
                                size={12}
                              />
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={
                                handleCancelEditComment
                              }
                              style={{
                                border:
                                  "1px solid var(--border)",
                                borderRadius: 8,
                                padding:
                                  "5px 10px",
                                background:
                                  "var(--card)",
                                color:
                                  "var(--text-2)",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor:
                                  "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color:
                              "var(--text)",
                            lineHeight: 1.5,
                          }}
                        >
                          {
                            comment.text
                          }
                        </p>
                      )}
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* COMMENT INPUT */}

          {canComment && (
            <div
              className="flex items-center"
              style={{
                gap: 8,
              }}
            >
              <input
                value={
                  commentDraft
                }
                onChange={(
                  event
                ) =>
                  setCommentDraft(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    handleSubmitComment();
                  }
                }}
                placeholder="Add a comment…"
                style={{
                  ...inputStyle,
                  flex: 1,
                }}
              />

              <button
                type="button"
                onClick={
                  handleSubmitComment
                }
                aria-label="Submit comment"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "none",
                  background:
                    "var(--text)",
                  color:
                    "var(--surface)",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor:
                    "pointer",
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ====================================================
            ACTIVITY
        ==================================================== */}

        <div>
          <div
            className="flex items-center text-ink-2"
            style={{
              gap: 6,
              marginBottom: 10,
            }}
          >
            <History size={14} />

            <span
              style={{
                fontSize: 12.5,
                fontWeight: 650,
              }}
            >
              Activity
            </span>
          </div>

          <div
            className="flex flex-col"
            style={{
              gap: 8,
            }}
          >
            {task.activity
              .length === 0 ? (
              <p
                className="text-ink-3"
                style={{
                  fontSize: 12,
                }}
              >
                No activity yet.
              </p>
            ) : (
              task.activity.map(
                (
                  entry: TaskActivityEntry
                ) => (
                  <div
                    key={
                      entry.id
                    }
                    className="flex items-center justify-between"
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color:
                          "var(--text)",
                      }}
                    >
                      {
                        entry.text
                      }
                    </span>

                    <span
                      className="text-ink-3"
                      style={{
                        fontSize: 10.5,
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {
                        entry.timestamp
                      }
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   STYLES
================================================================ */

const inputStyle = {
  border:
    "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12.5,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  fontWeight: 600,
};

const commentIconButtonStyle = {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--text-3)",
  flexShrink: 0,
};