import type { Dispatch, SetStateAction } from "react";

import type { Task } from "../data/taskData";
import type { WorkspaceActor } from "../types/workspace";
import type { NewNotification } from "../data/notificationData";
import { truncateText } from "../data/workspaceData";
import {
  addCommentToTask,
  editCommentInTask,
  deleteCommentFromTask,
} from "../components/TaskDetailsDrawer";

/* ============================================================
   TYPES
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
}

/* ============================================================
   HOOK
============================================================ */

/**
 * Builds the add/edit/delete comment handlers TaskDetailsDrawer needs,
 * on top of the addCommentToTask/editCommentInTask/deleteCommentFromTask
 * mutators. Every page that renders the drawer (Tasks, Timeline,
 * ProjectListTab, ProjectCalendarTab, ProjectTimelineTab) used to
 * hand-roll its own copy of these three setTasks()+addNotification()
 * blocks — this is the one place that logic lives now, so a fix here
 * reaches every call site instead of needing five identical edits.
 */
export function useTaskCommentHandlers({
  setTasks,
  selectedTask,
  currentActor,
  canComment,
  canEdit,
  addNotification,
  notificationHref,
}: UseTaskCommentHandlersArgs): TaskCommentHandlers {
  function handleAddComment(text: string) {
    if (!selectedTask || !canComment) {
      return;
    }

    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === selectedTask.id
          ? addCommentToTask(task, trimmed, currentActor)
          : task
      )
    );

    addNotification({
      type: "comment",
      title: `New comment on "${selectedTask.title}"`,
      message: `${currentActor.name} commented: "${truncateText(trimmed, 80)}"`,
      avatar: {
        initials: currentActor.initials,
        bg: currentActor.bg,
        fg: currentActor.fg,
      },
      actionHref: notificationHref,
    });
  }

  function handleEditComment(commentId: string, text: string) {
    if (!selectedTask || !canComment) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === selectedTask.id
          ? editCommentInTask(task, commentId, text, currentActor.id)
          : task
      )
    );
  }

  function handleDeleteComment(commentId: string) {
    if (!selectedTask) {
      return;
    }

    if (!canComment && !canEdit) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === selectedTask.id
          ? deleteCommentFromTask(task, commentId, currentActor.id, canEdit)
          : task
      )
    );
  }

  return {
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
  };
}
