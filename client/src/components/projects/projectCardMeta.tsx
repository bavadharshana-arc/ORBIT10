import type { LucideIcon } from "lucide-react";
import { Package, Palette, Code2, Megaphone, Settings2, FolderKanban } from "lucide-react";

/**
 * Project card visuals — purely presentational, same "meta map" pattern
 * notificationMeta.tsx already uses for notification icons. Keyed off
 * `Project.tag`, a real, already-persisted field (see projectData.ts's
 * PROJECT_TAGS) — never a new field, never fabricated.
 */
const TAG_ICONS: Record<string, LucideIcon> = {
  Product: Package,
  Design: Palette,
  Engineering: Code2,
  Marketing: Megaphone,
  Ops: Settings2,
};

/**
 * Falls back to the generic folder icon for a blank/unrecognized tag
 * (e.g. an older project created before tags existed). Returns
 * `{ icon }` rather than the component directly and is meant to be
 * destructured at the call site (`const { icon: Icon } = ...`) — same
 * shape as notificationMeta.tsx's resolveNotificationIcon, which keeps
 * react-hooks' "no components created during render" check from
 * mistaking this lookup for a new component definition.
 */
export function resolveProjectIcon(tag: string): { icon: LucideIcon } {
  return { icon: TAG_ICONS[tag] ?? FolderKanban };
}

/**
 * A soft, low-alpha tint of the project's own real `color` (the same hex
 * a card's status dot already uses) — the icon container's background.
 * Falls back to Orbit's existing --blue-tint token when a project has no
 * color set, matching every other "no color yet" fallback on this page.
 */
export function softTint(hex: string | undefined, alpha = 0.16): string {
  if (!hex) return "var(--blue-tint)";
  const parsed = hex.replace("#", "");
  if (parsed.length !== 6) return "var(--blue-tint)";

  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "var(--blue-tint)";

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
