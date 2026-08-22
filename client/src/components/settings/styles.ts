import type { CSSProperties } from "react";

/* ============================================================
   Shared Settings form tokens.

   Colors are the same CSS custom properties the rest of the app reads
   from styles/globals.css (--card/--border/--text/etc.) rather than
   literal hex, so Settings itself re-themes when Appearance's own
   theme picker changes --text/--border/--card under html[data-theme].
   Destructive/danger red stays literal (#B3564B family) — that's the
   same literal convention used app-wide (Tasks, Kanban, Projects, etc.
   all reuse this exact red with no CSS var), so keeping it literal here
   is what actually stays consistent with the rest of Orbit.

   `primaryButtonStyle`/`secondaryButtonStyle`/`labelStyle` below are
   NOT Settings-exclusive — ProjectSettingsTab.tsx (Projects page) also
   imports them, so their look stays exactly as it already was rather
   than picking up the premium-refresh pass below. The new
   `settingsPrimaryButtonStyle`/`settingsSecondaryButtonStyle`/
   `settingsDangerGhostButtonStyle` tokens are the Settings-only versions of
   those, used everywhere in src/components/settings/* instead — same
   idea as `inputStyle`/`selectStyle`/`textareaStyle`, which only
   Settings ever consumed in the first place and so were safe to refine
   in place.

   IMPORTANT — why `background`/`border-color`/`color` are mostly absent
   below even though the old version set them: an inline style always
   wins the cascade over an external stylesheet rule for the same
   property, hover or not. A token that hardcodes `background` inline
   would permanently block its own `.settings-btn-secondary:hover`
   (etc.) CSS rule in globals.css from ever visually applying, since the
   inline value never yields. So each `settings-*` token below only
   carries structural properties (padding/radius/font/border *width*);
   the actual resting-state color, plus every hover/focus/disabled
   variant, lives entirely in the matching `.settings-*` CSS class in
   globals.css instead — same reasoning as `.focus-ring` needing
   `outline` left out of `inputStyle` altogether.
============================================================ */

// `border` intentionally split into width/style here (structural,
// inline) with color left for `.settings-input` in globals.css to own
// — see the file-level note above for why. Background is CSS-owned for
// the same reason (hover/focus need to change it).
export const inputStyle: CSSProperties = {
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 9,
  padding: "8px 12px",
  fontSize: 12.5,
  color: "var(--text)",
  fontFamily: "inherit",
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  fontWeight: 600,
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 76,
  lineHeight: 1.55,
};

/** Unchanged — reused by ProjectSettingsTab.tsx (Projects page) via Field; do not restyle. */
export const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-2)",
  display: "block",
  marginBottom: 5,
};

/** Unchanged — reused by ProjectSettingsTab.tsx (Projects page); do not restyle. Settings pages use settingsPrimaryButtonStyle instead. */
export const primaryButtonStyle: CSSProperties = {
  background: "var(--text)",
  color: "var(--surface)",
  border: "none",
  borderRadius: 11,
  padding: "10px 18px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

/** Unchanged — reused by ProjectSettingsTab.tsx (Projects page); do not restyle. Settings pages use settingsSecondaryButtonStyle instead. */
export const secondaryButtonStyle: CSSProperties = {
  background: "var(--surface)",
  color: "var(--text-2)",
  border: "1px solid var(--border)",
  borderRadius: 11,
  padding: "10px 16px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

/* ============================================================
   SETTINGS-ONLY BUTTONS
   More compact and restrained than the tokens above. Pair with
   className="settings-btn settings-btn-primary" (etc.) — resting-state
   background/color plus every hover/disabled variant for -secondary
   and -ghost-danger live in globals.css (see the file header note);
   -primary keeps its background/color inline below since nothing ever
   needs to override those two specifically (its hover feedback is a
   plain opacity dip, not a color swap).
============================================================ */

export const settingsPrimaryButtonStyle: CSSProperties = {
  background: "var(--text)",
  color: "var(--surface)",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const settingsSecondaryButtonStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

/** A restrained, low-emphasis trigger for a destructive flow — the strong solid red is reserved for the confirm step itself, not this opener. */
export const settingsDangerGhostButtonStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#E9CCC6",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
