import type { TeamMember } from "../../types/dashboard";
import { Avatar } from "./Avatar";

interface AvatarStackProps {
  people: TeamMember[];
}

/** A row of overlapping avatars, used to show who's assigned to a project. */
export function AvatarStack({ people }: AvatarStackProps) {
  return (
    <div className="flex items-center" style={{ paddingLeft: 8 }}>
      {people.map((p) => (
        <div key={p.initials} style={{ marginLeft: -8 }}>
          <Avatar initials={p.initials} bg={p.bg} ring size={30} />
        </div>
      ))}
    </div>
  );
}