import { Users2 } from "lucide-react";

import type { Member, OrbitTeam } from "../../data/teamData";
import { AvatarStack } from "../ui/AvatarStack";

interface TeamsPanelProps {
  teams: OrbitTeam[];
  members: Member[];
}

export function TeamsPanel({ teams, members }: TeamsPanelProps) {
  return (
    <div
      className="fade-in"
      style={{
        borderRadius: 16,
        padding: 16,
        background: "#FFFFFF",
        border: "1px solid #E4E8ED",
        boxShadow: "0 2px 8px rgba(32, 36, 43, 0.04)",
      }}
    >
      {/* HEADER */}
      <div
        className="flex items-center"
        style={{
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <span
            className="font-display"
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#20242B",
            }}
          >
            Teams
          </span>

          <p
            style={{
              margin: "3px 0 0",
              fontSize: 11,
              color: "#98A2B3",
            }}
          >
            Your organization teams
          </p>
        </div>

        {/* TEAM COUNT */}
        <span
          style={{
            minWidth: 26,
            height: 26,
            padding: "0 7px",
            borderRadius: 8,
            background: "#EEF2F6",
            color: "#667085",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 650,
          }}
        >
          {teams.length}
        </span>
      </div>

      {/* TEAM LIST */}
      <div
        className="flex flex-col"
        style={{
          gap: 8,
        }}
      >
        {teams.map((team) => {
          const teamMembers = members.filter(
            (member) => member.department === team.name
          );

          return (
            <div
              key={team.id}
              className="border-soft"
              style={{
                padding: 11,
                borderRadius: 11,
                background: "#F7F8FA",
                border: "1px solid #E4E8ED",
                transition: "all 0.2s ease",
              }}
            >
              {/* TEAM TOP ROW */}
              <div
                className="flex items-center"
                style={{
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  {/* TEAM ICON */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#EEF2F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Users2
                      size={14}
                      color="#8EA7BF"
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* TEAM NAME */}
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 12.5,
                        fontWeight: 650,
                        color: "#20242B",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {team.name}
                    </span>

                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontSize: 10.5,
                        color: "#98A2B3",
                      }}
                    >
                      {teamMembers.length}{" "}
                      {teamMembers.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>

                {/* AVATARS */}
                {teamMembers.length > 0 && (
                  <AvatarStack
                    people={teamMembers.slice(0, 4)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}