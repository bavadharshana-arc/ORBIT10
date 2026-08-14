import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  X,
  CalendarDays,
  ChevronDown,
  Check,
} from "lucide-react";

import type {
  Priority,
  Status,
} from "../data/taskData";

type AssigneeOption = {
  key: string;
  label: string;
  member: {
    initials: string;
  };
};

/* ============================================================
   TYPES
============================================================ */

export interface CreateTaskValues {
  title: string;
  description: string;
  project: string;
  due: string;
  dueDate: string;
  priority: Priority;
  status: Status;
  assigneeKeys: string[];
}

export interface CreateTaskDrawerProps {
  isOpen: boolean;

  statusOptions: Status[];

  projectOptions: string[];

  assigneeOptions: AssigneeOption[];

  allowMultipleAssignees?: boolean;

  onClose: () => void;

  onCreate: (
    values: CreateTaskValues
  ) => void;
}

/* ============================================================
   COMPONENT
============================================================ */

export function CreateTaskDrawer({
  isOpen,
  statusOptions,
  projectOptions,
  assigneeOptions,
  allowMultipleAssignees = false,
  onClose,
  onCreate,
}: CreateTaskDrawerProps) {
  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    project,
    setProject,
  ] = useState("");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  const [
    due,
    setDue,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] = useState<Priority>("Medium");

  const [
    status,
    setStatus,
  ] = useState<Status>(
    statusOptions[0] ?? "To Do"
  );

  const [
    assigneeKeys,
    setAssigneeKeys,
  ] = useState<string[]>([]);

  /* ==========================================================
     RESET FORM WHEN OPENED
  ========================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle("");

    setDescription("");

    setProject(
      projectOptions[0] ?? ""
    );

    setDueDate("");

    setDue("");

    setPriority("Medium");

    setStatus(
      statusOptions[0] ?? "To Do"
    );

    setAssigneeKeys([]);
  }, [
    isOpen,
    projectOptions,
    statusOptions,
  ]);

  /* ==========================================================
     ESCAPE KEY
  ========================================================== */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    onClose,
  ]);

  /* ==========================================================
     ASSIGNEE TOGGLE
  ========================================================== */

  function handleAssigneeToggle(
    key: string
  ) {
    setAssigneeKeys(
      (current) => {
        const isSelected =
          current.includes(key);

        /*
         * MULTIPLE ASSIGNEES
         */

        if (
          allowMultipleAssignees
        ) {
          if (isSelected) {
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
         * SINGLE ASSIGNEE
         */

        if (isSelected) {
          return [];
        }

        return [key];
      }
    );
  }

  /* ==========================================================
     FORM SUBMIT
  ========================================================== */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedTitle =
      title.trim();

    /*
     * TITLE IS REQUIRED
     */

    if (!trimmedTitle) {
      return;
    }

    onCreate({
      title:
        trimmedTitle,

      description:
        description.trim(),

      project:
        project.trim(),

      due:
        due.trim(),

      dueDate,

      priority,

      status,

      assigneeKeys,
    });
  }

  /* ==========================================================
     DO NOT RENDER
  ========================================================== */

  if (!isOpen) {
    return null;
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Create task"
    >
      {/* ======================================================
          BACKDROP
      ====================================================== */}

      <button
        type="button"
        aria-label="Close create task drawer"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/20 backdrop-blur-[2px]"
      />

      {/* ======================================================
          DRAWER
      ====================================================== */}

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-120 flex-col bg-card shadow-2xl"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-soft px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#20242B]">
              Create Task
            </h2>

            <p className="mt-1 text-xs text-[#667085]">
              Add a new task to your workspace.
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

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* ==================================================
              FORM CONTENT
          ================================================== */}

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* ==================================================
                TITLE
            ================================================== */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                Task title
              </label>

              <input
                autoFocus
                type="text"
                value={title}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="What needs to be done?"
                className="w-full rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* ==================================================
                DESCRIPTION
            ================================================== */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Add some details..."
                rows={4}
                className="w-full resize-none rounded-xl border border-soft bg-card px-3.5 py-3 text-sm text-[#20242B] outline-none transition placeholder:text-[#98A2B3] focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
              />
            </div>

            {/* ==================================================
                PROJECT
            ================================================== */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                Project
              </label>

              <div className="relative">
                <select
                  value={project}
                  onChange={(
                    event
                  ) =>
                    setProject(
                      event.target.value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-soft bg-card px-3.5 py-3 pr-10 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                >
                  {projectOptions.map(
                    (
                      option
                    ) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
                />
              </div>
            </div>

            {/* ==================================================
                DATE + TIME
            ================================================== */}

            <div className="grid grid-cols-2 gap-3">
              {/* DUE DATE */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                  Due date
                </label>

                <div className="relative">
                  <CalendarDays
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]"
                  />

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(
                      event
                    ) =>
                      setDueDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-soft bg-card px-3 py-3 pl-9 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                  />
                </div>
              </div>

              {/* DUE TIME */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                  Due time
                </label>

                <input
                  type="text"
                  value={due}
                  onChange={(
                    event
                  ) =>
                    setDue(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 5:00 PM"
                  className="w-full rounded-xl border border-soft bg-card px-3 py-3 text-sm text-[#20242B] outline-none transition placeholder:text-[#98A2B3] focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                />
              </div>
            </div>

            {/* ==================================================
                PRIORITY
            ================================================== */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                Priority
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "Low",
                    "Medium",
                    "High",
                  ] as Priority[]
                ).map(
                  (
                    option
                  ) => {
                    const selected =
                      priority ===
                      option;

                    return (
                      <button
                        key={
                          option
                        }
                        type="button"
                        onClick={() =>
                          setPriority(
                            option
                          )
                        }
                        className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[#20242B] bg-[#20242B] text-white"
                            : "border-soft bg-card text-[#667085] hover:bg-[#F7F8FA]"
                        }`}
                      >
                        {
                          option
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* ==================================================
                STATUS
            ================================================== */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#20242B]">
                Status
              </label>

              <div className="relative">
                <select
                  value={status}
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value as Status
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-soft bg-card px-3.5 py-3 pr-10 text-sm text-[#20242B] outline-none transition focus:border-[#8EA7BF] focus:ring-2 focus:ring-[#EEF2F6]"
                >
                  {statusOptions.map(
                    (
                      option
                    ) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {
                          option
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
                />
              </div>
            </div>

            {/* ==================================================
                ASSIGNEES
            ================================================== */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#20242B]">
                {allowMultipleAssignees
                  ? "Assignees"
                  : "Assignee"}
              </label>

              <div className="space-y-1.5">
                {assigneeOptions.length ===
                0 ? (
                  <p className="rounded-xl border border-dashed border-soft px-3 py-4 text-center text-xs text-[#98A2B3]">
                    No team members available.
                  </p>
                ) : (
                  assigneeOptions.map(
                    (
                      option
                    ) => {
                      const selected =
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
                            handleAssigneeToggle(
                              option.key
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            selected
                              ? "border-[#8EA7BF] bg-[#EEF2F6]"
                              : "border-soft bg-card hover:bg-[#F7F8FA]"
                          }`}
                        >
                          {/* AVATAR */}

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4E8ED] text-[10px] font-semibold text-[#20242B]">
                            {
                              option
                                .member
                                .initials
                            }
                          </span>

                          {/* USER INFO */}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-[#20242B]">
                              {
                                option.label
                              }
                            </span>

                            <span className="block truncate text-[10px] text-[#98A2B3]">
                              {
                                option
                                  .member
                                  .initials
                              }
                            </span>
                          </span>

                          {/* CHECK */}

                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#20242B] text-white">
                              <Check
                                size={12}
                              />
                            </span>
                          )}
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="flex items-center justify-end gap-2 border-t border-soft bg-card px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-soft px-4 py-2.5 text-xs font-semibold text-[#667085] transition hover:bg-[#F7F8FA] hover:text-[#20242B]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#20242B] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Create Task
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default CreateTaskDrawer;