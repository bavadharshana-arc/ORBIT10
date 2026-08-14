import type { MemberStatus } from "../../data/teamData";
import type { PillTone } from "../../types/dashboard";

interface StatusMeta {
  tone: PillTone;
  dot: string;
}

export const STATUS_META: Record<MemberStatus, StatusMeta> = {
  Active: { tone: "blue", dot: "#8EA7BF" },
  Away: { tone: "surface", dot: "#98A2B3" },
  Offline: { tone: "surface", dot: "#E4E8ED" },
  Invited: { tone: "dark", dot: "#20242B" },
};
