import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

import type { Status, Task } from "../../data/taskData";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { canEditProjectContent } from "../../data/workspaceData";
import { generateId } from "../TaskDetailsDrawer";

const COLUMNS: { status: Status; label: string }[] = [
  { status: "To Do", label: "To Do" },
  { status: "In Progress", label: "In Progress" },
  { status: "Completed", label: "Completed" },
];

const PRIORITY_TONE: Record<Task["priority"], "surface" | "blue" | "dark"> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

function BoardCard({ task, index, canEdit }: { task: Task; index: number; canEdit: boolean }) {
  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-card border-soft shadow-float"
          style={{
            borderRadius: 14,
            padding: 14,
            cursor: canEdit ? (snapshot.isDragging ? "grabbing" : "grab") : "default",
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</div>
          <div className="flex items-center" style={{ justifyContent: "space-between", gap: 8 }}>
            <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
            {task.assignees.length > 0 && <AvatarStack people={task.assignees} />}
          </div>
          {task.due && (
            <div className="text-ink-3" style={{ fontSize: 11, marginTop: 8 }}>
              {task.due}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

/**
 * Status board for the project workspace. Drag-and-drop reuses the same
 * @hello-pangea/dnd setup as the main Kanban page, and writes through the
 * shared TaskContext so a status change made here shows up everywhere else
 * (Kanban, Tasks list, etc.) and persists via TaskContext's localStorage sync.
 */
export function ProjectBoardTab() {
  const { projectTasks: tasks, permission } = useProjectWorkspace();
  const { setTasks } = useTaskContext();
  const canEdit = canEditProjectContent(permission);

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination || !canEdit) {
      return;
    }

    const newStatus = destination.droppableId as Status;

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== draggableId || task.status === newStatus) {
          return task;
        }

        return {
          ...task,
          status: newStatus,
          activity: [
            ...(task.activity ?? []),
            {
              id: generateId("activity"),
              text: `Status changed to ${newStatus}`,
              timestamp: "Just now",
            },
          ],
        };
      })
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 16, alignItems: "start" }}>
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div key={column.status} className="bg-surface-2" style={{ borderRadius: 18, padding: 14 }}>
              <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>{column.label}</span>
                <span className="text-ink-3" style={{ fontSize: 11.5 }}>{columnTasks.length}</span>
              </div>
              <Droppable droppableId={column.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col"
                    style={{
                      gap: 8,
                      minHeight: 60,
                      borderRadius: 12,
                      background: snapshot.isDraggingOver ? "var(--card)" : "transparent",
                      transition: "background 160ms ease",
                    }}
                  >
                    {columnTasks.map((task, index) => (
                      <BoardCard key={task.id} task={task} index={index} canEdit={canEdit} />
                    ))}
                    {provided.placeholder}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-ink-3" style={{ fontSize: 11.5, padding: "8px 4px" }}>No tasks.</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
