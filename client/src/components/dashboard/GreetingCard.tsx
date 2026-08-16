import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Pill } from "../ui/Pill";
import { SquiggleUnderline } from "../doodles/SquiggleUnderline";
import { useAuth } from "../../context/AuthContext";

/* ============================================================
   GREETING CARD (Phase 35)

   Previously entirely hardcoded — "Good afternoon, Maya.", a fixed
   "Friday, 17 July" date, and a made-up "You have 6 tasks due today
   across 3 projects, and API v2 Migration is 90% complete" — shown
   verbatim to every signed-in user regardless of who they were or
   what was actually in their workspace. That's the first thing a
   brand-new account saw on landing at the Dashboard, which is why it
   looked like "old Demo/Maya Chen data": it wasn't real data at all,
   just static copy nobody had wired up. Now greets the real
   signed-in user (useAuth) with the real date and a summary built
   from Dashboard.tsx's already-live TaskContext/ProjectContext
   numbers — including an honest empty-state line for an account with
   no projects yet, instead of a fabricated one.
============================================================ */

export interface GreetingCardProps {
  tasksDueToday: number;
  activeProjectCount: number;
  hasAnyProjects: boolean;
}

const TIME_OF_DAY = (hour: number): "morning" | "afternoon" | "evening" => {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export function GreetingCard({ tasksDueToday, activeProjectCount, hasAnyProjects }: GreetingCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const now = new Date();
  const firstName = (user?.name ?? "there").trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const summary = !hasAnyProjects
    ? "Create your first project to get started."
    : tasksDueToday > 0
      ? `You have ${tasksDueToday} task${tasksDueToday === 1 ? "" : "s"} due today across ${activeProjectCount} active project${activeProjectCount === 1 ? "" : "s"}.`
      : "Nothing due today — you're all caught up.";

  return (
    <div
      className="bg-surface-2 shadow-float-lg fade-in p-5 sm:p-6 lg:p-[32px_36px]"
      style={{
        borderRadius: 24,
        position: "relative",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        style={{
          position: "absolute",
          right: -30,
          top: -50,
          opacity: 0.9,
        }}
      >
        {/* Ring 1 — inner orbit */}
        <g
          className="animate-spin"
          style={{
            transformOrigin: "110px 110px",
            transformBox: "view-box",
            animationDuration: "24s",
            animationTimingFunction: "linear",
          }}
        >
          <ellipse
            cx="110"
            cy="110"
            rx="78"
            ry="36"
            style={{ stroke: "var(--blue)", fill: "none" }}
            strokeWidth="1.1"
            opacity="0.55"
          />

          {/* Outlined sparkle at 0° */}
          <g transform="translate(188,110) scale(0.44) translate(-12,-11)">
            <path
              d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
              style={{ stroke: "var(--blue-dark)" }}
              strokeWidth="1.4"
              strokeLinejoin="round"
              fill="none"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          </g>

          {/* Solid dot at 180° */}
          <circle
            cx="32"
            cy="110"
            r="3"
            style={{ fill: "var(--blue-dark)" }}
            opacity="0.85"
          />
        </g>

        {/* Ring 2 — outer orbit, gently tilted from ring 1 */}
        <g
          className="animate-spin"
          style={{
            transformOrigin: "110px 110px",
            transformBox: "view-box",
            animationDuration: "39s",
            animationTimingFunction: "linear",
          }}
        >
          <g transform="rotate(32 110 110)">
            <ellipse
              cx="110"
              cy="110"
              rx="98"
              ry="48"
              style={{ stroke: "var(--blue-dark)", fill: "none" }}
              strokeWidth="1.1"
              opacity="0.4"
            />

            {/* Outlined circle at 0° */}
            <circle
              cx="208"
              cy="110"
              r="3"
              style={{ stroke: "var(--text)", fill: "none" }}
              strokeWidth="1.1"
              opacity="0.85"
            />

            {/* Solid sparkle at 120° */}
            <g transform="translate(61,151.6) scale(0.32) translate(-12,-11)">
              <path
                d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
                style={{ fill: "var(--text)", stroke: "var(--text)" }}
                strokeWidth="0.6"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.85"
              />
            </g>

            {/* Solid circle at 240° */}
            <circle
              cx="61"
              cy="68.4"
              r="2.6"
              style={{ fill: "var(--text)" }}
              opacity="0.85"
            />
          </g>
        </g>

        {/* Center point */}
        <circle
          cx="110"
          cy="110"
          r="4"
          style={{ fill: "var(--text)" }}
          opacity="0.5"
        />
      </svg>


      <div style={{ position: "relative", maxWidth: 480 }}>
        <Pill tone="blue">
          {dateLabel}
        </Pill>

        <h1
          className="font-display"
          style={{
            fontSize: 34,
            fontWeight: 560,
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          Good {TIME_OF_DAY(now.getHours())}, {firstName}.
        </h1>

        <div style={{ marginBottom: 14 }}>
          <SquiggleUnderline width={150} />
        </div>

        <p
          className="text-ink-2"
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {summary}
        </p>

        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/tasks?due=Today")}
            style={{
              background: "#20242B",
              color: "#F7F8FA",
              border: "none",
              borderRadius: 14,
              padding: "11px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            View today&rsquo;s tasks
            <ArrowUpRight size={15} />
          </button>

          <button
            className="bg-card"
            style={{
              border: "1px solid #E4E8ED",
              borderRadius: 14,
              padding: "11px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#20242B",
            }}
          >
            <Sparkles size={15} color="#8EA7BF" />
          </button>
        </div>
      </div>
    </div>
  );
}