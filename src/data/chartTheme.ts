/* ============================================================
   CHART THEME
   Literal hex mirrors of the light/dark tokens in
   styles/globals.css, for the SVG-attribute consumers (Recharts
   marks, ProgressRing, raw lucide `color` props) that can't
   reliably resolve CSS custom properties. Cards, text, and borders
   should keep using var(--...) directly instead of this.

   Extracted from Analytics.tsx so the project workspace's
   Analytics tab renders with the exact same palette.
============================================================ */

export interface ThemeColors {
  surface: string;
  surface2: string;
  card: string;
  blue: string;
  blueDark: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
}

export const LIGHT_THEME: ThemeColors = {
  surface: "#F7F8FA",
  surface2: "#EEF2F6",
  card: "#FFFFFF",
  blue: "#AFC5DA",
  blueDark: "#8EA7BF",
  border: "#E4E8ED",
  text: "#20242B",
  text2: "#667085",
  text3: "#98A2B3",
};

export const DARK_THEME: ThemeColors = {
  surface: "#14171C",
  surface2: "#1B1F26",
  card: "#1E232B",
  blue: "#3F5064",
  blueDark: "#6F8AA3",
  border: "#2A2F38",
  text: "#EDEFF3",
  text2: "#A7AEBB",
  text3: "#6B7280",
};
