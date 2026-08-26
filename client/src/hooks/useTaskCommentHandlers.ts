import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { Task, TaskComment } from "../data/taskData";
import type { WorkspaceActor } from "../types/workspace";
import type { NewNotification } from "../data/notificationData";
import { truncateText } from "../data/workspaceData";
import { getInitials } from "../data/teamData";
import { withTaskParam } from "../data/systemNotifications";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/workspaceContextValue";
import { useProjectContext } from "../context/projectContextValue";
import { ApiError } from "../lib/api";
import {
  listComments,
  createComment as createCommentRequest,
  updateComment as updateCommentRequest,
  deleteComment as deleteCommentRequest,
  type CommentRecord,
} from "../lib/commentApi";
import { listWorkspaceMembers, type WorkspaceMemberRecord } from "../lib/workspaceApi";

/* ============================================================
   TASK COMMENT HANDLERS (Phase 27)

   Builds the add/edit/delete comment handlers TaskDetailsDrawer needs,
   plus loads a task's real comments when it becomes selected. Every
   page that renders the drawer (Tasks, Timeline, ProjectListTab,
   ProjectCalendarTab, ProjectTimelineTab) shares this one
   implementation, so this is the one place comment persistence lives —
   none of those 5 call sites needed to change, since this hook's own
   props/return shape (mostly) stayed the same; see commentsLoading/
   commentsError below for the one addition.

   Comments are no longer read off `task.comments` as pre-loaded mock
   data — they're fetched here, per selected task, from
   GET .../tasks/:taskId/comments, and written into that one task's
   `comments` field via setTasks (TaskContext.tsx's real Task list from
   Phase 26). Author identity is resolved from the real workspace
   members list (Phase 20's widened endpoint) — not the mock roster.
============================================================ */

interface UseTaskCommentHandlersArgs {
  setTasks: Dispatch<SetStateAction<Task[]>>;

  /** The task currently open in TaskDetailsDrawer, or null when it's closed. */
  selectedTask: Task | null;

  currentActor: WorkspaceActor;

  /** Whether currentActor may comment on `selectedTask` — Commenter+ on its project. */
  canComment: boolean;

  /** Whether currentActor may edit `selectedTask` — Editor+ on its project. Also lets them delete anyone's comment, for moderation. */
  canEdit: boolean;

  addNotification: (input: NewNotification) => void;

  /** In-app path the "New comment" notification navigates to when clicked (page-level — matches the granularity every other seeded notification uses). */
  notificationHref: string;
}

interface TaskCommentHandlers {
  handleAddComment: (text: string) => void;
  handleEditComment: (commentId: string, text: string) => void;
  handleDeleteComment: (commentId: string) => void;
  /** True while the selected task's comments are being fetched. */
  commentsLoading: boolean;
  /** Set on a genuine load/save failure — surfaced by TaskDetailsDrawer, never swallowed into a silent mock fallback. */
  commentsError: string | null;
}

const NEUTRAL_AVATAR = { bg: "var(--surface-2)", fg: "var(--text)" };

function resolveAuthor(
  authorId: string,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: WorkspaceActor,
): WorkspaceActor {
  const member = membersById.get(authorId);
  if (!member) {
    // Author is no longer a workspace member (or lookup failed) — fall
    // back to the current viewer's own identity shape rather than
    // fabricating a name, matching the "no fabrication" rule elsewhere.
    return fallback;
  }

  const name = member.user.name ?? member.user.email;
  return {
    id: authorId,
    name,
    initials: getInitials(name),
    bg: member.user.avatarBg ?? NEUTRAL_AVATAR.bg,
    fg: member.user.avatarFg ?? NEUTRAL_AVATAR.fg,
  };
}

function mapComment(
  record: CommentRecord,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallbackAuthor: WorkspaceActor,
): TaskComment {
  return {
    id: record.id,
    text: record.text,
    author: resolveAuthor(record.authorId, membersById, fallbackAuthor),
    createdAt: new Date(record.createdAt).getTime(),
    editedAt: record.editedAt ? new Date(record.editedAt).getTime() : undefined,
  };
}

export function useTaskCommentHandlers({
  setTasks,
  selectedTask,
  currentActor,
  canComment,
  canEdit,
  addNotification,
  notificationHref,
}: UseTaskCommentHandlersArgs): TaskCommentHandlers {
  const { currentWorkspaceId } = useWorkspace();
  const { projects } = useProjectContext();
  // Real authenticated user id — NOT currentActor.id, which can resolve
  // to a mock-roster id instead of the real one (resolveCurrentActor's
  // email-match fallback in workspaceData.ts) and would silently defeat
  // the self-notify guard below.
  const { user } = useAuth();

  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const project = selectedTask ? projects.find((candidate) => candidate.name === selectedTask.project) : undefined;
  const projectId = project?.id;
  const taskId = selectedTask?.id;

  useEffect(() => {
    if (!taskId || !currentWorkspaceId || !projectId) {
      return;
    }

    let cancelled = false;

    // Deferred into the promise chain (never synchronous in the effect
    // body) — same reasoning as every other Phase 24–26 fetch effect.
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setCommentsLoading(true);
        setCommentsError(null);
        return Promise.all([
          listWorkspaceMembers(currentWorkspaceId),
          listComments(currentWorkspaceId, projectId, taskId),
        ]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [members, records] = result;
        const membersById = new Map(members.map((member) => [member.userId, member] as const));
        const mapped = records.map((record) => mapComment(record, membersById, currentActor));
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, comments: mapped } : task)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCommentsError(err instanceof ApiError ? err.message : "Couldn't load comments. Try again.");
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // currentActor/setTasks intentionally omitted — currentActor is only
    // used as a display fallback (not a refetch trigger) and setTasks is
    // a stable setState setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, currentWorkspaceId, projectId]);

  async function handleAddComment(text: string) {
    if (!selectedTask || !canComment || !currentWorkspaceId || !projectId) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    try {
      const record = await createCommentRequest(currentWorkspaceId, projectId, selectedTask.id, trimmed);
      const newComment: TaskComment = {
        id: record.id,
        text: record.text,
        author: currentActor,
        createdAt: new Date(record.createdAt).getTime(),
      };

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === selectedTask.id ? { ...task, comments: [...(task.comments ?? []), newComment] } : task,
        ),
      );

      // Stage 4 (Real Notifications): the task's real assignee is the
      // natural recipient — skipped when there isn't one, or when the
      // commenter is commenting on their own assigned task (no one else
      // to tell).
      if (selectedTask.assigneeId && selectedTask.assigneeId !== user?.id) {
        addNotification({
          type: "comment",
          title: `New comment on "${selectedTask.title}"`,
          message: `${currentActor.name} commented: "${truncateText(trimmed, 80)}"`,
          actionHref: withTaskParam(notificationHref, selectedTask.id),
          recipientId: selectedTask.assigneeId,
        });
      }
    } catch (error) {
      setCommentsError(error instanceof ApiError ? error.message : "Couldn't post your comment. Try again.");
    }
  }

  async function handleEditComment(commentId: string, text: string) {
    if (!selectedTask || !canComment || !currentWorkspaceId || !projectId) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    try {
      const record = await updateCommentRequest(currentWorkspaceId, projectId, selectedTask.id, commentId, trimmed);

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                comments: task.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        text: record.text,
                        editedAt: record.editedAt ? new Date(record.editedAt).getTime() : comment.editedAt,
                      }
                    : comment,
                ),
              }
            : task,
        ),
      );
    } catch (error) {
      setCommentsError(error instanceof ApiError ? error.message : "Couldn't save your edit. Try again.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!selectedTask || !currentWorkspaceId || !projectId) {
      return;
    }

    if (!canComment && !canEdit) {
      return;
    }

    try {
      await deleteCommentRequest(currentWorkspaceId, projectId, selectedTask.id, commentId);

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === selectedTask.id
            ? { ...task, comments: task.comments.filter((comment) => comment.id !== commentId) }
            : task,
        ),
      );
    } catch (error) {
      setCommentsError(error instanceof ApiError ? error.message : "Couldn't delete the comment. Try again.");
    }
  }

  return {
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    commentsLoading,
    commentsError,
  };
}
