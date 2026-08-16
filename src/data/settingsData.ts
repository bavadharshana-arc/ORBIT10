/* ============================================================
   TYPES
============================================================ */

export type ThemePreference = "light" | "dark" | "system";

export type AccentKey = "dusk" | "sky" | "ink" | "slate";

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

export type WeekStart = "sunday" | "monday";

// Phase 18: profile is no longer part of OrbitSettings/localStorage —
// Settings -> Profile now reads/writes GET/PATCH /api/users/me directly
// (see lib/userApi.ts's UserProfile), so the API is the single source of
// truth for it rather than competing with a cached localStorage copy.
//
// Phase 19: same for workspace — Settings -> Workspace now reads/writes
// GET /api/workspaces + PATCH /api/workspaces/:id directly (see
// lib/workspaceApi.ts's WorkspaceRecord). DateFormat/WeekStart and the
// TIMEZONES/slugify/formatDatePreview helpers below stay here since
// WorkspaceSection.tsx still needs them for its dropdowns/preview text.

export interface NotificationSettings {
  emailTaskActivity: boolean;
  emailWeeklyDigest: boolean;
  emailProductUpdates: boolean;
  pushEnabled: boolean;
  pushTaskReminders: boolean;
  pushMentions: boolean;
}

export interface AppearanceSettings {
  theme: ThemePreference;
  accent: AccentKey;
  reduceMotion: boolean;
}

export interface SessionEntry {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordUpdatedAt: string | null;
  sessions: SessionEntry[];
}

export interface OrbitSettings {
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  security: SecuritySettings;
}

/* ============================================================
   AVATAR COLORS
   Same palette as the Team page (src/data/teamData.ts) so a
   recolored profile avatar stays visually consistent with the
   rest of the app.
============================================================ */

export const AVATAR_COLOR_OPTIONS: { bg: string; fg: string }[] = [
  { bg: "#AFC5DA", fg: "#20242B" },
  { bg: "#EEF2F6", fg: "#20242B" },
  { bg: "#20242B", fg: "#F7F8FA" },
  { bg: "#E4E8ED", fg: "#20242B" },
  { bg: "#8EA7BF", fg: "#20242B" },
];

/* ============================================================
   ACCENTS
============================================================ */

export const ACCENT_HEX: Record<AccentKey, string> = {
  dusk: "#8EA7BF",
  sky: "#AFC5DA",
  ink: "#20242B",
  slate: "#667085",
};

export const ACCENTS: { key: AccentKey; label: string }[] = [
  { key: "dusk", label: "Dusk" },
  { key: "sky", label: "Sky" },
  { key: "ink", label: "Ink" },
  { key: "slate", label: "Slate" },
];

/* ============================================================
   TIMEZONES
============================================================ */

export const TIMEZONES: string[] = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/* ============================================================
   DEFAULTS
============================================================ */

const DEFAULT_SETTINGS: OrbitSettings = {
  notifications: {
    emailTaskActivity: true,
    emailWeeklyDigest: true,
    emailProductUpdates: false,
    pushEnabled: true,
    pushTaskReminders: true,
    pushMentions: true,
  },
  appearance: {
    theme: "system",
    accent: "dusk",
    reduceMotion: false,
  },
  security: {
    twoFactorEnabled: false,
    passwordUpdatedAt: null,
    sessions: [
      {
        id: "session-1",
        device: "MacBook Pro",
        browser: "Chrome on macOS",
        location: "San Francisco, CA",
        lastActive: "Active now",
        current: true,
      },
      {
        id: "session-2",
        device: "iPhone 15",
        browser: "Safari on iOS",
        location: "San Francisco, CA",
        lastActive: "2 hours ago",
        current: false,
      },
      {
        id: "session-3",
        device: "Windows PC",
        browser: "Edge on Windows",
        location: "Austin, TX",
        lastActive: "3 days ago",
        current: false,
      },
    ],
  },
};

/* ============================================================
   PERSISTENCE
============================================================ */

const SETTINGS_STORAGE_KEY = "orbit-settings";

function mergeSettings(partial: Partial<OrbitSettings> | null): OrbitSettings {
  if (!partial) {
    return DEFAULT_SETTINGS;
  }

  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...partial.notifications },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...partial.appearance },
    security: {
      ...DEFAULT_SETTINGS.security,
      ...partial.security,
      sessions: partial.security?.sessions ?? DEFAULT_SETTINGS.security.sessions,
    },
  };
}

export function loadSettings(): OrbitSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    return mergeSettings(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: OrbitSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}



export function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyAppearance(appearance: AppearanceSettings): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = resolveTheme(appearance.theme);
  document.documentElement.dataset.motion = appearance.reduceMotion ? "reduced" : "full";
}



export function formatDatePreview(date: Date, format: DateFormat): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();

  switch (format) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}

export function formatSettingsDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}



export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


const ORBIT_DATA_KEYS = ["orbit-team-members", "orbit-team-activity", "orbit-tasks"];

export function resetWorkspaceData(): void {
  ORBIT_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function deleteAllOrbitData(): void {
  ORBIT_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
}
