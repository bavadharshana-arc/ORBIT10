import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Flag,
  Users,
  CheckCircle2,
  Milestone,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";

import { useTaskContext } from "../context/taskContextValue";

// ============================================================================
// Types
// ============================================================================

type EventType = "task" | "meeting" | "deadline" | "milestone";
type ViewMode = "month" | "week" | "day" | "year";

interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD, local date (no time component) */
  date: string;
  type: EventType;
  time?: string;
  project?: string;
  /** id of the Person this event belongs to, used by the People filter */
  assigneeId?: string;
}

interface Person {
  id: string;
  name: string;
  email: string;
  initials: string;
}

// ============================================================================
// Date helpers
// ============================================================================

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_MINI = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Builds a full 7-column grid (in weeks) covering the given month, including
 * the leading/trailing days needed to fill out complete weeks. */
function getMonthMatrix(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridStart = addDays(firstOfMonth, -startOffset);

  const days: Date[] = Array.from({ length: totalCells }, (_, i) =>
    addDays(gridStart, i)
  );

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// ============================================================================
// Mock data
// ============================================================================
// Dates are generated relative to "today" (at load time) so the page always
// reads as populated and realistic, whenever it's actually opened.

const PEOPLE: Person[] = [
  { id: "p1", name: "Eddie Mutisya", email: "mutisya@orbit.com", initials: "EM" },
  { id: "p2", name: "Alex Otieno", email: "alex@orbit.com", initials: "AO" },
  { id: "p3", name: "Antony Kelvin", email: "antony@orbit.com", initials: "AK" },
  { id: "p4", name: "Priya Nair", email: "priya@orbit.com", initials: "PN" },
];

function buildMockEvents(): CalendarEvent[] {
  const today = new Date();
  const at = (offsetDays: number) => toDateKey(addDays(today, offsetDays));

  return [
    {
      id: "evt-1",
      title: "Design review",
      date: at(0),
      type: "meeting",
      time: "10:30 AM",
      project: "Orbit Redesign",
      assigneeId: "p1",
    },
    {
      id: "evt-2",
      title: "API deadline",
      date: at(0),
      type: "deadline",
      time: "5:00 PM",
      project: "Core API",
      assigneeId: "p2",
    },
    {
      id: "evt-3",
      title: "Sprint planning",
      date: at(1),
      type: "meeting",
      time: "9:00 AM",
      project: "Orbit Redesign",
      assigneeId: "p1",
    },
    {
      id: "evt-4",
      title: "Write onboarding copy",
      date: at(1),
      type: "task",
      time: "1:00 PM",
      project: "Growth",
      assigneeId: "p4",
    },
    {
      id: "evt-5",
      title: "Beta launch",
      date: at(3),
      type: "milestone",
      project: "Core API",
      assigneeId: "p2",
    },
    {
      id: "evt-6",
      title: "1:1 with manager",
      date: at(4),
      time: "11:00 AM",
      type: "meeting",
      assigneeId: "p3",
    },
    {
      id: "evt-7",
      title: "QA pass on Kanban",
      date: at(5),
      type: "task",
      time: "2:00 PM",
      project: "Orbit Redesign",
      assigneeId: "p3",
    },
    {
      id: "evt-8",
      title: "Client feedback due",
      date: at(5),
      type: "deadline",
      time: "6:00 PM",
      project: "Client Portal",
      assigneeId: "p2",
    },
    {
      id: "evt-9",
      title: "Team standup",
      date: at(-1),
      type: "meeting",
      time: "9:15 AM",
    },
    {
      id: "evt-10",
      title: "Analytics dashboard v1",
      date: at(-2),
      type: "milestone",
      project: "Core API",
      assigneeId: "p1",
    },
    {
      id: "evt-11",
      title: "Prep quarterly review",
      date: at(8),
      type: "task",
      time: "3:00 PM",
      project: "Leadership",
      assigneeId: "p4",
    },
    {
      id: "evt-12",
      title: "Security audit deadline",
      date: at(10),
      type: "deadline",
      time: "5:00 PM",
      project: "Core API",
      assigneeId: "p2",
    },
    {
      id: "evt-13",
      title: "Design system sync",
      date: at(12),
      type: "meeting",
      time: "10:00 AM",
      project: "Orbit Redesign",
      assigneeId: "p1",
    },
    {
      id: "evt-14",
      title: "Marketing site launch",
      date: at(14),
      type: "milestone",
      project: "Growth",
      assigneeId: "p4",
    },
    {
      id: "evt-15",
      title: "Team offsite",
      date: at(15),
      type: "meeting",
      project: "Team",
    },
  ];
}

// ============================================================================
// Event visual treatment
// ============================================================================

const EVENT_META: Record<
  EventType,
  { label: string; dot: string; pill: string; icon: typeof CheckCircle2 }
> = {
  task: {
    label: "Task",
    dot: "bg-[#8EA7BF]",
    pill: "bg-[#EEF2F6] text-[#20242B]",
    icon: CheckCircle2,
  },
  meeting: {
    label: "Meeting",
    dot: "bg-[#AFC5DA]",
    pill: "bg-[#EEF2F6] text-[#20242B]",
    icon: Users,
  },
  deadline: {
    label: "Deadline",
    dot: "bg-[#667085]",
    pill: "bg-[#E4E8ED] text-[#20242B]",
    icon: Flag,
  },
  milestone: {
    label: "Milestone",
    dot: "bg-[#20242B]",
    pill: "bg-[#E4E8ED] text-[#20242B]",
    icon: Milestone,
  },
};

// ============================================================================
// Shared subcomponents
// ============================================================================

function EventPill({ event }: { event: CalendarEvent }) {
  const meta = EVENT_META[event.type];
  return (
    <div
      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight ${meta.pill}`}
      title={`${event.title}${event.time ? ` · ${event.time}` : ""}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function EventDetailRow({ event }: { event: CalendarEvent }) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-soft bg-card px-3 py-2.5">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.pill}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#20242B]">
          {event.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#667085]">
          <span>{meta.label}</span>
          {event.time && (
            <>
              <span className="text-[#98A2B3]">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.time}
              </span>
            </>
          )}
          {event.project && (
            <>
              <span className="text-[#98A2B3]">·</span>
              <span className="truncate">{event.project}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Left sidebar — Create Schedule button
// ============================================================================

function CreateScheduleButton() {
  return (
    <button
      type="button"
      title="Event creation isn't wired up yet"
      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#20242B] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      <Plus className="h-4 w-4" />
      Create Schedule
    </button>
  );
}

// ============================================================================
// Left sidebar — Mini calendar
// ============================================================================

interface MiniCalendarProps {
  weeks: Date[][];
  currentMonth: number;
  monthLabel: string;
  today: Date;
  selectedDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}

function MiniCalendar({
  weeks,
  currentMonth,
  monthLabel,
  today,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: MiniCalendarProps) {
  return (
    <div className="rounded-xl border border-soft bg-card p-3 shadow-float">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#20242B]">
          {monthLabel}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-5 w-5 items-center justify-center rounded text-[#667085] hover:bg-surface hover:text-[#20242B]"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-5 w-5 items-center justify-center rounded text-[#667085] hover:bg-surface hover:text-[#20242B]"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS_MINI.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="flex h-6 items-center justify-center text-[10px] font-medium text-[#98A2B3]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map((date) => {
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              return (
                <div
                  key={date.toISOString()}
                  className="flex items-center justify-center py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                      isToday
                        ? "bg-[#20242B] text-white"
                        : isSelected
                        ? "bg-[#EEF2F6] text-[#20242B] ring-1 ring-inset ring-[#8EA7BF]"
                        : isCurrentMonth
                        ? "text-[#20242B] hover:bg-surface"
                        : "text-[#98A2B3] hover:bg-surface"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Left sidebar — Selected day panel
// ============================================================================

function SelectedDayPanel({
  date,
  events,
}: {
  date: Date;
  events: CalendarEvent[];
}) {
  return (
    <div className="rounded-xl border border-soft bg-card p-3 shadow-float">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-3.5 w-3.5 text-[#8EA7BF]" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
          Selected Day
        </h2>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#20242B]">
        {formatLongDate(date)}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-soft px-3 py-4 text-center text-xs text-[#98A2B3]">
            No events scheduled for this day.
          </p>
        ) : (
          events.map((event) => <EventDetailRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Left sidebar — People
// ============================================================================

interface PeopleListProps {
  people: Person[];
  searchQuery: string;
  selectedPersonId: string | null;
  onSearchChange: (value: string) => void;
  onSelectPerson: (id: string) => void;
  onResetToMySchedule: () => void;
}

function PeopleList({
  people,
  searchQuery,
  selectedPersonId,
  onSearchChange,
  onSelectPerson,
  onResetToMySchedule,
}: PeopleListProps) {
  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) =>
      person.name.toLowerCase().includes(query)
    );
  }, [people, searchQuery]);

  return (
    <div className="rounded-xl border border-soft bg-card p-3 shadow-float">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#667085]">
        People
      </h2>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search for people"
          className="w-full rounded-lg border border-soft bg-surface py-1.5 pl-8 pr-3 text-xs text-[#20242B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#AFC5DA]"
        />
      </div>

      <div className="flex flex-col gap-1">
        {filteredPeople.length === 0 ? (
          <p className="px-1 py-2 text-xs text-[#98A2B3]">No people found.</p>
        ) : (
          filteredPeople.map((person) => {
            const isSelected = person.id === selectedPersonId;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelectPerson(person.id)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  isSelected ? "bg-[#EEF2F6]" : "hover:bg-surface"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E4E8ED] text-[10px] font-semibold text-[#20242B]">
                  {person.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[#20242B]">
                    {person.name}
                  </span>
                  <span className="block truncate text-[10px] text-[#98A2B3]">
                    {person.email}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={onResetToMySchedule}
        className={`mt-3 w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
          selectedPersonId === null
            ? "border-[#8EA7BF] bg-[#EEF2F6] text-[#20242B]"
            : "border-soft text-[#667085] hover:bg-surface"
        }`}
      >
        My Schedule
      </button>
    </div>
  );
}

// ============================================================================
// Main workspace — toolbar
// ============================================================================

interface CalendarToolbarProps {
  monthLabel: string;
  viewMode: ViewMode;
  searchQuery: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (value: string) => void;
}

function CalendarToolbar({
  monthLabel,
  viewMode,
  searchQuery,
  onPrevMonth,
  onNextMonth,
  onToday,
  onViewModeChange,
  onSearchChange,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-soft bg-card p-3 shadow-float sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-soft px-3 py-1.5 text-sm font-medium text-[#20242B] transition-colors hover:bg-surface"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-surface hover:text-[#20242B]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-surface hover:text-[#20242B]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="font-display text-base font-semibold text-[#20242B] sm:text-lg">
          {monthLabel}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events"
            className="w-full rounded-lg border border-soft bg-surface py-1.5 pl-8 pr-3 text-sm text-[#20242B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#AFC5DA] sm:w-48"
          />
        </div>

        <div className="flex items-center rounded-lg border border-soft bg-surface p-0.5">
          {(["month", "week", "day", "year"] as ViewMode[]).map((mode) => {
            const isActive = viewMode === mode;
            const isDisabled = mode !== "month";
            return (
              <button
                key={mode}
                type="button"
                disabled={isDisabled}
                onClick={() => onViewModeChange(mode)}
                title={isDisabled ? "Coming soon" : undefined}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  isActive
                    ? "bg-card text-[#20242B] shadow-float"
                    : isDisabled
                    ? "cursor-not-allowed text-[#98A2B3]"
                    : "text-[#667085] hover:text-[#20242B]"
                }`}
              >
                {mode}
                {isDisabled && (
                  <span className="ml-1 text-[9px] uppercase tracking-wide text-[#98A2B3]">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main workspace — month grid
// ============================================================================

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  onSelect: (date: Date) => void;
}

function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  events,
  onSelect,
}: CalendarDayCellProps) {
  const visibleEvents = events.slice(0, 2);
  const overflowCount = events.length - visibleEvents.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`group flex min-h-23 flex-col items-stretch gap-1 border-b border-r border-soft p-1.5 text-left transition-colors last:border-r-0 hover:bg-surface sm:min-h-30 sm:p-2 ${
        isSelected ? "bg-[#EEF2F6]" : "bg-card"
      } ${!isCurrentMonth ? "opacity-45" : ""}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm ${
          isToday
            ? "bg-[#20242B] text-white"
            : isSelected
            ? "border border-[#8EA7BF] text-[#20242B]"
            : "text-[#20242B]"
        }`}
      >
        {date.getDate()}
      </span>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        {visibleEvents.map((event) => (
          <EventPill key={event.id} event={event} />
        ))}
        {overflowCount > 0 && (
          <span className="px-1 text-[10px] font-medium text-[#667085]">
            +{overflowCount} more
          </span>
        )}
      </div>
    </button>
  );
}

interface CalendarGridProps {
  weeks: Date[][];
  currentMonth: number;
  today: Date;
  selectedDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
}

function CalendarGrid({
  weeks,
  currentMonth,
  today,
  selectedDate,
  eventsByDate,
  onSelectDate,
}: CalendarGridProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-soft bg-card shadow-float">
      <div className="grid grid-cols-7 border-b border-soft bg-surface">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#667085] sm:text-xs"
          >
            {label}
          </div>
        ))}
      </div>
      <div>
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map((date) => (
              <CalendarDayCell
                key={date.toISOString()}
                date={date}
                isCurrentMonth={date.getMonth() === currentMonth}
                isToday={isSameDay(date, today)}
                isSelected={isSameDay(date, selectedDate)}
                events={eventsByDate.get(toDateKey(date)) ?? []}
                onSelect={onSelectDate}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function Calendar() {
  const today = useMemo(() => new Date(), []);
  const mockEvents = useMemo(() => buildMockEvents(), []);

  const { tasks } = useTaskContext();

  // Tasks with a due date, mapped into the same CalendarEvent shape used
  // by the rest of the calendar so they render through the existing
  // grid/pill/detail-panel UI without any new components.
  const taskEvents = useMemo<CalendarEvent[]>(
    () =>
      tasks.flatMap((task) =>
        task.dueDate
          ? [
              {
                id: task.id,
                title: task.title,
                date: task.dueDate,
                type: "task" as const,
                project: task.project,
              },
            ]
          : []
      ),
    [tasks]
  );

  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [peopleSearchQuery, setPeopleSearchQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const monthLabel = `${MONTH_LABELS[month]} ${year}`;

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = (event: CalendarEvent) =>
      !query ||
      event.title.toLowerCase().includes(query) ||
      event.project?.toLowerCase().includes(query);

    // Real tasks have no `assigneeId` — there's no real link between
    // TaskContext's assignees and this page's mock People list — so the
    // People filter (which only mock events can honestly satisfy) is
    // scoped to mock events only. Otherwise selecting any person here
    // would wipe every real task off the calendar, since none of them
    // could ever match a mock person id.
    const matchesPerson = (event: CalendarEvent) =>
      !selectedPersonId || event.assigneeId === selectedPersonId;

    return [
      ...mockEvents.filter((event) => matchesQuery(event) && matchesPerson(event)),
      ...taskEvents.filter((event) => matchesQuery(event)),
    ];
  }, [mockEvents, taskEvents, searchQuery, selectedPersonId]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const existing = map.get(event.date);
      if (existing) {
        existing.push(event);
      } else {
        map.set(event.date, [event]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }
    return map;
  }, [filteredEvents]);

  const selectedDayEvents = useMemo(
    () => eventsByDate.get(toDateKey(selectedDate)) ?? [],
    [eventsByDate, selectedDate]
  );

  function goToPrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(today);
    setSelectedDate(today);
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function handleSelectPerson(id: string) {
    setSelectedPersonId((current) => (current === id ? null : id));
  }

  function handleResetToMySchedule() {
    setSelectedPersonId(null);
  }

  return (
    <div className="fade-in flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Left calendar sidebar */}
      <div className="flex flex-col gap-4 lg:w-65 lg:shrink-0">
        <CreateScheduleButton />
        <MiniCalendar
          weeks={weeks}
          currentMonth={month}
          monthLabel={monthLabel}
          today={today}
          selectedDate={selectedDate}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onSelectDate={handleSelectDate}
        />
        <SelectedDayPanel date={selectedDate} events={selectedDayEvents} />
        <PeopleList
          people={PEOPLE}
          searchQuery={peopleSearchQuery}
          selectedPersonId={selectedPersonId}
          onSearchChange={setPeopleSearchQuery}
          onSelectPerson={handleSelectPerson}
          onResetToMySchedule={handleResetToMySchedule}
        />
      </div>

      {/* Main calendar workspace */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#20242B]">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Stay on top of deadlines, meetings, and upcoming work.
          </p>
        </div>

        <CalendarToolbar
          monthLabel={monthLabel}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchQuery}
        />

        <CalendarGrid
          weeks={weeks}
          currentMonth={month}
          today={today}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelectDate={handleSelectDate}
        />
      </div>
    </div>
  );
}