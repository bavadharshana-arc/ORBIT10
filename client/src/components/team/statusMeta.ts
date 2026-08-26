import type { MemberStatus } from "../../data/teamData";
import type { PillTone } from "../../types/dashboard";

interface StatusMeta {
  tone: PillTone;
  dot: string;
}

export const STATUS_META: Record<MemberStatus, StatusMeta> = {
  Active: { tone: "blue", dot: "var(--blue-dark)" },
  Away: { tone: "surface", dot: "var(--text-3)" },
  Offline: { tone: "surface", dot: "var(--border)" },
  Invited: { tone: "dark", dot: "var(--text)" },
};
