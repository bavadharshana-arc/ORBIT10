import type { TeamMember } from "../types/dashboard";
import type { WorkspaceActor } from "../types/workspace";


export type Status =
  | "To Do"
  | "In Progress"
  | "Completed";


export type Priority =
  | "Low"
  | "Medium"
  | "High";



export interface TaskComment {
  id: string;
  text: string;
  author: WorkspaceActor;
  createdAt: number;
  editedAt?: number;
}



export interface TaskActivityEntry {
  id: string;
  text: string;
  timestamp: string;
}


export type DueGroup =
  | "Overdue"
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Later"
  | "No Due Date";



export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  due: string;
  dueDate?: string;
  startDate?: string;
  isMilestone?: boolean;
  dueGroup: DueGroup;
  priority: Priority;
  status: Status;
  assignee?: TeamMember;
  assignees: TeamMember[];
  /** Real assignee userId, straight from the backend's Task.assigneeId column (Stage 2) — `assignee`/`assignees` are display-only and carry no id, so this is the one place a caller can get a real, sendable recipient/actor id off a Task. Undefined when unassigned. */
  assigneeId?: string;
  comments: TaskComment[];
  activity: TaskActivityEntry[];
}


function toLocalDateString(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


export const initialTasks: Task[] = [
  {
    id: "task-1",

    title:
      "Finalize onboarding flow copy",

    description:
      "Review and finalize the onboarding content for the new user experience.",

    project:
      "Orbit Mobile App",

    due:
      "Today, 11:00 AM",

    dueDate:
      toLocalDateString(
        new Date()
      ),

    startDate:
      getDateOffset(-4),

    dueGroup:
      "Today",

    priority:
      "High",

    status:
      "In Progress",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [
      {
        id:
          "activity-1",

        text:
          "Task created",

        timestamp:
          "Recently",
      },
    ],
  },

  {
    id: "task-2",

    title:
      "Design dashboard empty state",

    description:
      "Create a clean empty state for dashboards that do not have any data yet.",

    project:
      "Orbit Web",

    due:
      "Today, 3:00 PM",

    dueDate:
      toLocalDateString(
        new Date()
      ),

    startDate:
      getDateOffset(-1),

    dueGroup:
      "Today",

    priority:
      "Medium",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-3",

    title:
      "Implement notification preferences",

    description:
      "Add notification preference controls for email and in-app notifications.",

    project:
      "Orbit Web",

    due:
      "Tomorrow",

    dueDate:
      getDateOffset(1),

    startDate:
      getDateOffset(-2),

    dueGroup:
      "Tomorrow",

    priority:
      "Medium",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-4",

    title:
      "Fix authentication redirect",

    description:
      "Resolve the redirect issue after users complete the login flow.",

    project:
      "Orbit Platform",

    due:
      "Yesterday",

    dueDate:
      getDateOffset(-1),

    startDate:
      getDateOffset(-4),

    dueGroup:
      "Overdue",

    priority:
      "High",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-5",

    title:
      "Create analytics dashboard",

    description:
      "Build the first version of the project analytics dashboard.",

    project:
      "Orbit Analytics",

    due:
      "This Friday",

    dueDate:
      getDateOffset(5),

    startDate:
      getDateOffset(1),

    dueGroup:
      "This Week",

    priority:
      "High",

    status:
      "In Progress",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-6",

    title:
      "Review API documentation",

    description:
      "Review backend API documentation and identify missing endpoints.",

    project:
      "Orbit Platform",

    due:
      getDateOffset(8),

    dueDate:
      getDateOffset(8),

    isMilestone:
      true,

    dueGroup:
      "Later",

    priority:
      "Low",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-7",

    title:
      "Complete project settings",

    description:
      "Finish project settings including member permissions and visibility.",

    project:
      "Orbit Web",

    due:
      "No due date",

    dueDate:
      undefined,

    dueGroup:
      "No Due Date",

    priority:
      "Low",

    status:
      "Completed",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-8",

    title:
      "Prepare product demo",

    description:
      "Prepare the product demo and presentation for the upcoming review.",

    project:
      "Orbit Platform",

    due:
      getDateOffset(10),

    dueDate:
      getDateOffset(10),

    startDate:
      getDateOffset(6),

    dueGroup:
      "Later",

    priority:
      "Medium",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-9",

    title:
      "Build push notification service",

    description:
      "Implement push notification delivery for iOS and Android via the new messaging backend.",

    project:
      "Orbit Mobile App",

    due:
      getDateOffset(-2),

    dueDate:
      getDateOffset(-2),

    startDate:
      getDateOffset(-6),

    dueGroup:
      "Overdue",

    priority:
      "High",

    status:
      "Completed",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-10",

    title:
      "Polish app icon set",

    description:
      "Refine app icon variants for light and dark mode and verify export sizes for both app stores.",

    project:
      "Orbit Mobile App",

    due:
      getDateOffset(3),

    dueDate:
      getDateOffset(3),

    startDate:
      getDateOffset(1),

    dueGroup:
      "This Week",

    priority:
      "Low",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-11",

    title:
      "Migrate settings page to new design system",

    description:
      "Rebuild the settings page using the new component library and updated spacing tokens.",

    project:
      "Orbit Web",

    due:
      "Next Week",

    dueDate:
      getDateOffset(7),

    startDate:
      getDateOffset(2),

    dueGroup:
      "This Week",

    priority:
      "Medium",

    status:
      "In Progress",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-12",

    title:
      "Upgrade CI pipeline to new runners",

    description:
      "Migrate build and test jobs to the new self-hosted runners to cut CI time.",

    project:
      "Orbit Platform",

    due:
      getDateOffset(2),

    dueDate:
      getDateOffset(2),

    startDate:
      getDateOffset(-5),

    dueGroup:
      "This Week",

    priority:
      "High",

    status:
      "In Progress",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-13",

    title:
      "Set up event tracking schema",

    description:
      "Define the canonical event schema for product analytics tracking across web and mobile.",

    project:
      "Orbit Analytics",

    due:
      getDateOffset(2),

    dueDate:
      getDateOffset(2),

    startDate:
      getDateOffset(0),

    dueGroup:
      "This Week",

    priority:
      "Medium",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },

  {
    id: "task-14",

    title:
      "Ship weekly digest email report",

    description:
      "Build and schedule the weekly analytics digest email sent to project stakeholders.",

    project:
      "Orbit Analytics",

    due:
      getDateOffset(14),

    dueDate:
      getDateOffset(14),

    startDate:
      getDateOffset(9),

    dueGroup:
      "Later",

    priority:
      "Low",

    status:
      "To Do",

    assignee:
      undefined,

    assignees:
      [],

    comments:
      [],

    activity: [],
  },
];


function getDateOffset(
  days: number
): string {
  const date =
    new Date();

  date.setDate(
    date.getDate() + days
  );

  return toLocalDateString(
    date
  );
}

export function getDueGroup(
  dueDate?: string
): DueGroup {
  if (!dueDate) {
    return "No Due Date";
  }

  const [year, month, day] =
    dueDate
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "No Due Date";
  }

  const target =
    new Date(
      year,
      month - 1,
      day
    );

  const today =
    new Date();

  const todayStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const tomorrow =
    new Date(
      todayStart
    );

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const difference =
    Math.round(
      (
        target.getTime() -
        todayStart.getTime()
      ) /
        (1000 *
          60 *
          60 *
          24)
    );

  
  if (
    target <
    todayStart
  ) {
    return "Overdue";
  }

  
  if (
    target.getTime() ===
    todayStart.getTime()
  ) {
    return "Today";
  }

  if (
    target.getTime() ===
    tomorrow.getTime()
  ) {
    return "Tomorrow";
  }


  if (
    difference <= 7
  ) {
    return "This Week";
  }


  return "Later";
}



export function getUpcomingTasks(
  tasks: Task[],
  limit?: number
): Task[] {
  const upcoming = tasks
    .filter((task) => {
      if (task.status === "Completed") return false;

      const group = getDueGroup(task.dueDate);
      return (
        group === "Today" ||
        group === "Tomorrow" ||
        group === "This Week"
      );
    })
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    );

  return limit !== undefined
    ? upcoming.slice(0, limit)
    : upcoming;
}



const TASK_STORAGE_KEY =
  "orbit-tasks";


const TASK_SEED_VERSION = 2;

const TASK_SEED_VERSION_KEY =
  "orbit-tasks-seed-version";

const initialStartDateById = new Map(
  initialTasks.map((task) => [task.id, task.startDate])
);


const initialIsMilestoneById = new Map(
  initialTasks.map((task) => [task.id, task.isMilestone])
);



function normalizeComment(
  raw: unknown
): TaskComment | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const candidate =
    raw as Partial<TaskComment> & {
      authorLabel?: string;
      timestamp?: string;
    };

  if (!candidate.text) {
    return null;
  }

  
  if (
    candidate.author &&
    typeof candidate.createdAt ===
      "number"
  ) {
    return {
      id:
        candidate.id ??
        generateTaskId(),

      text: candidate.text,

      author: candidate.author,

      createdAt:
        candidate.createdAt,

      editedAt:
        candidate.editedAt,
    };
  }


  const label =
    candidate.authorLabel ??
    "Unknown";

  return {
    id:
      candidate.id ??
      generateTaskId(),

    text: candidate.text,

    author: {
      id: `legacy-${label}`,
      name: label,
      initials: label
        .slice(0, 2)
        .toUpperCase(),
      bg: "#E9EDF2",
      fg: "#20242B",
    },

    createdAt: Date.now(),
  };
}


export function loadTasks(): Task[] {
  try {
    const storedSeedVersion =
      localStorage.getItem(
        TASK_SEED_VERSION_KEY
      );

    if (
      storedSeedVersion !==
      String(TASK_SEED_VERSION)
    ) {
      
      localStorage.setItem(
        TASK_SEED_VERSION_KEY,
        String(TASK_SEED_VERSION)
      );

      return initialTasks;
    }

    const stored =
      localStorage.getItem(
        TASK_STORAGE_KEY
      );

    if (!stored) {
      return initialTasks;
    }

    const parsed =
      JSON.parse(stored);

    if (
      !Array.isArray(parsed)
    ) {
      return initialTasks;
    }

    return parsed.map(
      (
        task: Partial<Task>
      ): Task => {
        const dueDate =
          task.dueDate;

        return {
          id:
            task.id ??
            generateTaskId(),

          title:
            task.title ??
            "",

          description:
            task.description ??
            "",

          project:
            task.project ??
            "",

          due:
            task.due ??
            "No due date",

          dueDate,

          startDate:
            task.startDate ??
            (task.id
              ? initialStartDateById.get(task.id)
              : undefined),

          isMilestone:
            task.isMilestone ??
            (task.id
              ? initialIsMilestoneById.get(task.id)
              : undefined),

          dueGroup:
            task.dueGroup ??
            getDueGroup(
              dueDate
            ),

          priority:
            task.priority ??
            "Medium",

          status:
            task.status ??
            "To Do",

          
          assignee:
            task.assignee,

          assignees:
            task.assignees ??
            (
              task.assignee
                ? [
                    task.assignee,
                  ]
                : []
            ),

          comments:
            Array.isArray(
              task.comments
            )
              ? task.comments
                  .map(
                    normalizeComment
                  )
                  .filter(
                    (
                      comment
                    ): comment is TaskComment =>
                      comment !==
                      null
                  )
              : [],

          activity:
            Array.isArray(
              task.activity
            )
              ? task.activity
              : [],
        };
      }
    );
  } catch (error) {
    console.error(
      "Failed to load tasks:",
      error
    );

    return initialTasks;
  }
}


export function saveTasks(
  tasks: Task[]
): void {
  try {
    localStorage.setItem(
      TASK_STORAGE_KEY,
      JSON.stringify(tasks)
    );
  } catch (error) {
    console.error(
      "Failed to save tasks:",
      error
    );
  }
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}