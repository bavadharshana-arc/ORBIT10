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

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordUpdatedAt: string | null;
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
    // Mobile responsiveness audit: this used to be "system", so any
    // visitor with no saved settings (localStorage's "orbit-settings" key
    // absent — every fresh visit, mobile or desktop) had their theme
    // silently follow the OS/browser's prefers-color-scheme via
    // resolveTheme() below. On a phone set to dark mode that flips the
    // *entire* app dark on first load, contradicting this file's own
    // globals.css comment ("the light theme... stays the default and
    // untouched when no preference is set") and leaving anything styled
    // with hardcoded (non --token) colors elsewhere in the app illegible
    // against the swapped dark surface. "system" stays fully selectable
    // in Settings -> Appearance — this only changes what an
    // unconfigured visitor gets by default, matching Orbit's established
    // light appearance until someone deliberately opts into System/Dark.
    theme: "light",
    accent: "dusk",
    reduceMotion: false,
  },
  security: {
    twoFactorEnabled: false,
    passwordUpdatedAt: null,
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
    security: { ...DEFAULT_SETTINGS.security, ...partial.security },
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



/* ============================================================
   CURRENT SESSION (Settings -> Security -> Active sessions)

   Orbit's auth is stateless JWT with no server-side session/device
   store (no Session model, no login-history table) — there is no real
   backend data source for "other devices signed in". Rather than
   display a fabricated multi-device list (the previous implementation
   hardcoded a MacBook/iPhone/Windows PC trio that never reflected
   anything real), this derives a best-effort label for the one session
   Orbit actually knows about — the browser it's running in right now —
   from navigator.userAgent. Not persisted: it isn't a preference, it's
   a live fact about the current browser, recomputed on every read.
============================================================ */

export interface CurrentSession {
  device: string;
  browser: string;
}

export function getCurrentSession(): CurrentSession {
  if (typeof navigator === "undefined" || !navigator.userAgent) {
    return { device: "This device", browser: "Unknown browser" };
  }

  const ua = navigator.userAgent;

  const browserName = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua) && !/Chromium\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua) && !/Chrome\//.test(ua)
            ? "Safari"
            : "your browser";

  const platformName = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown platform";

  const device = /iPad/.test(ua)
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? "Android device"
        : "This device";

  return { device, browser: `${browserName} on ${platformName}` };
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

// resetWorkspaceData/deleteAllOrbitData/ORBIT_DATA_KEYS (Phase 19
// Frontend Integration audit fix, Priority 3 & 7) were removed —
// DangerZoneSection.tsx's "Reset workspace data"/"Delete account"
// buttons only ever cleared these localStorage keys, none of which the
// real app still writes (orbit-tasks and orbit-team-activity have zero
// writers at all; orbit-team-members is a stale key from before Team.tsx
// went real in Stage 1), so both actions silently did nothing to real
// backend data while claiming to. "Delete account" now calls the real
// DELETE /api/users/me (see DangerZoneSection.tsx); "Reset workspace
// data" was removed outright — there's no safe backend equivalent for
// resetting a *shared* workspace's real data from one member's session.
