import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowUpRight, Plus } from "lucide-react";
import { Pill } from "../ui/Pill";
import { SquiggleUnderline } from "../doodles/SquiggleUnderline";
import { CelestialDivider } from "../doodles/CelestialDivider";
import { useAuth } from "../../context/AuthContext";

/* Strictly-additive celestial artwork layer (see the big comment at its
   render site below for the full rationale). Resolved via `new URL(...,
   import.meta.url)` — the same pattern Login.tsx already uses for
   reference/orbit-login.jpe — so Vite serves/bundles this non-standard
   ".jpe" file without needing an import declaration for the extension. */
const celestialArtwork = new URL("../../../reference/download (5).jpe", import.meta.url).href;

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
  /** Real workspace-manager + has-a-project gate — same isWorkspaceManager(workspaceRole) check Tasks.tsx/Kanban.tsx/Projects.tsx already use for their own "New Task"/"New Project" actions. Hidden entirely (not just gated) for anyone who genuinely can't create a task, same as those pages. */
  canCreateTask: boolean;
}

const TIME_OF_DAY = (hour: number): "morning" | "afternoon" | "evening" => {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

/* Scattered background dots around the RIGHT side of the hero — fully
   independent of the orbit <svg> below (which is locked: not read from,
   not positioned relative to, not touched by this list at all).
   Positioned as plain percentages of the card, deliberately irregular —
   no shared radius from any center point, no repeating spacing — so
   they read as loose scatter, never a ring or a path. Sizes/opacities
   are kept high enough to actually register at 100% zoom (blues around
   0.55–0.7, whites around 0.85–0.95) rather than disappearing. */
const HERO_SCATTER_DOTS: { left: string; top: string; size: number; color: string; opacity: number }[] = [
  { left: "58%", top: "8%", size: 4, color: "var(--text)", opacity: 0.55 },
  { left: "88%", top: "15%", size: 6, color: "#FFFFFF", opacity: 0.9 },
  { left: "70%", top: "23%", size: 3, color: "var(--blue-dark)", opacity: 0.6 },
  { left: "95%", top: "40%", size: 5, color: "var(--blue)", opacity: 0.6 },
  { left: "60%", top: "48%", size: 7, color: "#FFFFFF", opacity: 0.92 },
  { left: "80%", top: "58%", size: 4, color: "var(--text)", opacity: 0.5 },
  { left: "92%", top: "70%", size: 6, color: "var(--blue-dark)", opacity: 0.65 },
  { left: "65%", top: "78%", size: 3, color: "var(--blue)", opacity: 0.55 },
  { left: "85%", top: "88%", size: 5, color: "#FFFFFF", opacity: 0.88 },
  { left: "55%", top: "34%", size: 4, color: "var(--blue-dark)", opacity: 0.55 },
  { left: "98%", top: "60%", size: 8, color: "var(--text)", opacity: 0.5 },
  { left: "72%", top: "92%", size: 3, color: "var(--blue)", opacity: 0.55 },
];

/* Visible 4-point celestial stars around the same right-side area —
   independent of both the locked orbit <svg> and HERO_SCATTER_DOTS
   above (neither is read from or touched here). Uses the same slim
   4-point star path as the orbit's own riding stars, just scaled up
   and positioned by plain percentage so each one reads as an actual
   ✦-shaped star rather than a dot or a generic rounded sparkle icon.
   Positions deliberately avoid the orbit's own coordinates and any
   shared radius, so nothing lines up into a ring or a path. */
const HERO_SCATTER_STARS: { left: string; top: string; size: number; color: string; opacity: number }[] = [
  { left: "48%", top: "4%", size: 17, color: "var(--text)", opacity: 0.78 },
  { left: "76%", top: "33%", size: 19, color: "#FFFFFF", opacity: 0.95 },
  { left: "97%", top: "12%", size: 11, color: "var(--blue-dark)", opacity: 0.68 },
  { left: "63%", top: "63%", size: 10, color: "var(--blue)", opacity: 0.58 },
  { left: "90%", top: "82%", size: 12, color: "#FFFFFF", opacity: 0.88 },
  { left: "52%", top: "90%", size: 7, color: "var(--text)", opacity: 0.55 },
  { left: "99%", top: "50%", size: 6, color: "var(--blue-dark)", opacity: 0.5 },
];

export function GreetingCard({ tasksDueToday, activeProjectCount, hasAnyProjects, canCreateTask }: GreetingCardProps) {
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
      {/* ============================================================
          NEW — CELESTIAL ARTWORK LAYER (strictly additive)

          reference/download (5).jpe, rendered verbatim (not a CSS/SVG
          recreation) as a decorative background layer on the left/
          center of the card, behind everything else here. Nothing
          below this block was touched to make room for it.

          Placement guarantees it stays behind the greeting/buttons
          without needing to add z-index anywhere: it's the first
          child of this card, and every other child here (the orbit
          <svg>, the scatter dots/stars, and the text content div) is
          position:absolute/relative with no z-index of its own — such
          siblings paint strictly in DOM order, so being first means
          this is always the bottommost layer, under the orbit/stars
          and under "Good {time}, {name}." Just two treatments turn
          the source photo's plain cream-paper square into an
          embedded layer rather than a pasted-in image box:
            - mix-blend-mode: multiply knocks the paper's near-white
              background out against the card's own --surface-2 fill
              (multiply leaves white fully transparent-looking and
              only darkens the actual navy linework), so no rectangle
              edge is visible against the card background;
            - a radial mask fades the remaining square silhouette to
              nothing well before its corners, so what's left reads as
              a soft-edged illustration, not a photo cutout.
          Opacity is kept in the "clearly visible" 0.55–0.85 range the
          artwork asked for, not faded to near-nothing. */}
      {/* Mobile dark-mode fix: `transform` and `mix-blend-mode` on the
          SAME element is a known cross-browser inconsistency (notably
          iOS Safari) — the transform promotes the element onto its own
          compositing layer, and the multiply blend then composites
          against opaque white instead of this card's actual --surface-2
          background, leaving the "cream paper" square visible as a
          white rectangle instead of disappearing into the card. Same
          bug either theme, but invisible in light mode (wrong-white
          looks identical to right-white against a light card) and
          glaring in dark mode. Fix: the transform lives on this
          wrapper (for centering only); mix-blend-mode/mask stay on the
          <img>, which now has no transform of its own. */}
      <div
        className="w-[56%] sm:w-[46%] lg:w-[38%]"
        style={{
          position: "absolute",
          left: "-6%",
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: 340,
          aspectRatio: "1 / 1",
          pointerEvents: "none",
        }}
      >
        <img
          src={celestialArtwork}
          alt=""
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            mixBlendMode: "multiply",
            opacity: 0.82,
            WebkitMaskImage: "radial-gradient(circle at 46% 48%, black 52%, transparent 85%)",
            maskImage: "radial-gradient(circle at 46% 48%, black 52%, transparent 85%)",
          }}
        />
      </div>

      {/* ============================================================
          RIGHT-SIDE CELESTIAL COMPOSITION — compact corner orbit

          248×248 box anchored right:-34/top:-56 — every number here is
          the previous 220×220/right:-30/top:-50 version scaled up by
          exactly 248/220 ≈ 1.127× (~12.7%, mid-range of a requested
          10–15% enlargement). Shape, proportions, angles, colors,
          opacity, and every dot/star are otherwise identical — this is
          a uniform scale-up, not a redesign. Still genuinely a corner
          ornament, intentionally cropped by the card's own top/right
          edges, not a large mid-hero constellation.
      ============================================================ */}
      <svg
        width="248"
        height="248"
        viewBox="0 0 248 248"
        style={{
          position: "absolute",
          right: -34,
          top: -56,
        }}
      >
        {/* Ring 1 — inner orbit */}
        <g
          className="animate-spin"
          style={{
            transformOrigin: "124px 124px",
            transformBox: "view-box",
            animationDuration: "24s",
            animationTimingFunction: "linear",
          }}
        >
          <ellipse
            cx="124"
            cy="124"
            rx="87.9"
            ry="40.6"
            style={{ stroke: "var(--blue)", fill: "none" }}
            strokeWidth="1.2"
            opacity="0.55"
          />

          {/* Clearly-visible white star riding at 0° */}
          <g transform="translate(212,124) scale(0.38) translate(-12,-11)">
            <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" style={{ fill: "#FFFFFF" }} opacity="0.92" />
          </g>

          {/* Small blue dot riding at 180° */}
          <circle cx="36.1" cy="124" r="2.9" style={{ fill: "var(--blue-dark)" }} opacity="0.6" />

          {/* Small blue 4-point star riding at 270° (top of the ellipse) —
              travels around the orbit with it */}
          <g transform="translate(124,83.4) scale(0.26) translate(-12,-11)">
            <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" style={{ fill: "var(--blue-dark)" }} opacity="0.75" />
          </g>
        </g>

        {/* Ring 2 — outer orbit, gently tilted from ring 1. Its 0° mark
            sits right at the box's edge and is partly cropped by the
            card — intentional, matching the "some dots can be clipped"
            corner-orbit feel. */}
        <g
          className="animate-spin"
          style={{
            transformOrigin: "124px 124px",
            transformBox: "view-box",
            animationDuration: "39s",
            animationTimingFunction: "linear",
          }}
        >
          <g transform="rotate(32 124 124)">
            <ellipse
              cx="124"
              cy="124"
              rx="110.5"
              ry="54.1"
              style={{ stroke: "var(--blue-dark)", fill: "none" }}
              strokeWidth="1.2"
              opacity="0.4"
            />

            {/* Small white dot riding at 0° */}
            <circle cx="234.5" cy="124" r="2.7" style={{ fill: "#FFFFFF" }} opacity="0.85" />

            {/* Tiny light-blue star riding at 120° */}
            <g transform="translate(68.8,170.9) scale(0.25) translate(-12,-11)">
              <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" style={{ fill: "var(--blue)" }} opacity="0.55" />
            </g>

            {/* Small blue dot riding at 240° */}
            <circle cx="68.8" cy="77.1" r="2.3" style={{ fill: "var(--blue-dark)" }} opacity="0.55" />

            {/* White/light-blue dot riding at 60° — travels around the
                orbit with it */}
            <circle cx="179.25" cy="170.85" r="2.6" style={{ fill: "#FFFFFF" }} opacity="0.88" />
          </g>
        </g>

        {/* Ring 3 — faint dotted outer orbit, static */}
        <ellipse
          cx="124"
          cy="124"
          rx="99.2"
          ry="99.2"
          transform="rotate(-18 124 124)"
          style={{ stroke: "var(--blue)", fill: "none" }}
          strokeWidth="1.5"
          strokeDasharray="2.3 6.2"
          opacity="0.4"
        />

        {/* Subtle darker-blue (navy) star */}
        <g transform="translate(157.8,67.6) scale(0.23) translate(-12,-11)">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" style={{ fill: "var(--text)" }} opacity="0.55" />
        </g>

        {/* Tiny white star */}
        <g transform="translate(191.6,45.1) scale(0.2) translate(-12,-11)">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" style={{ fill: "#FFFFFF" }} opacity="0.8" />
        </g>

        {/* Clearly-visible white dot */}
        <circle cx="169.1" cy="112.7" r="2.5" style={{ fill: "#FFFFFF" }} opacity="0.85" />

        {/* Center point — subtle anchor at the orbit's shared center */}
        <circle cx="124" cy="124" r="4.5" style={{ fill: "var(--text)" }} opacity="0.5" />
      </svg>

      {/* Scattered background dots around the right side — see
          HERO_SCATTER_DOTS. Independent of the orbit above. */}
      {HERO_SCATTER_DOTS.map((d, i) => (
        <span
          key={`scatter-dot-${i}`}
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            opacity: d.opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Visible 4-point stars around the same right-side area — see
          HERO_SCATTER_STARS. Independent of the orbit and the dots
          above. */}
      {HERO_SCATTER_STARS.map((s, i) => (
        <svg
          key={`scatter-star-${i}`}
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          style={{ position: "absolute", left: s.left, top: s.top, opacity: s.opacity, pointerEvents: "none" }}
        >
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" fill={s.color} />
        </svg>
      ))}

      <div style={{ position: "relative", maxWidth: 480 }}>
        {/* Decorative lines flanking the date pill only — additive, and
            deliberately scoped to just this row (not the heading/subtitle
            below). Both copies are the same CelestialDivider, mirrored via
            `flip` so the fade points outward on each side; hidden below
            `sm` where there isn't reliably enough spare width next to the
            pill without crowding it. */}
        <div className="flex items-center" style={{ gap: 10 }}>
          <CelestialDivider className="hidden sm:block sm:w-[46px] lg:w-[84px]" />
          <Pill tone="blue">
            {dateLabel}
          </Pill>
          <CelestialDivider flip className="hidden sm:block sm:w-[46px] lg:w-[84px]" />
        </div>

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

        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          {/* Dashboard-mobile-audit follow-up: this page previously had
              no Create Task entry point at all (not a mobile
              regression — CreateTaskDrawer was never wired up here,
              only in Tasks.tsx/Kanban.tsx/ProjectWorkspace.tsx). Rather
              than duplicate that page's real create-task logic here,
              this deep-links to Tasks.tsx's own drawer via ?create=1
              (same convention ?due=Today below already uses) — the
              exact existing flow, unmodified, just opened from here.
              Gated by the same real isWorkspaceManager(workspaceRole)
              check those pages use for their own create actions — see
              Dashboard.tsx's canCreateTask. */}
          {canCreateTask && (
            <button
              type="button"
              onClick={() => navigate("/tasks?create=1")}
              style={{
                background: "var(--blue-dark)",
                color: "#FFFFFF",
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
              <Plus size={15} />
              Create task
            </button>
          )}

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
            type="button"
            className="bg-card nav-item"
            onClick={() => navigate("/projects")}
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
            Explore workspace
            <Sparkles size={15} color="#8EA7BF" />
          </button>
        </div>
      </div>
    </div>
  );
}
