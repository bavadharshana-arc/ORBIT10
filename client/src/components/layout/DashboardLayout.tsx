import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

import { navItems } from "../../data/dashboardData";
import { applyAppearance, loadSettings } from "../../data/settingsData";

/**
 * Persistent app shell for every authenticated route (Dashboard, Projects,
 * Tasks, Kanban, Calendar, Timeline, Team, Analytics, Settings).
 *
 * Sidebar and TopBar stay mounted across navigations; only the <Outlet />
 * content swaps as the route changes. Wire this up in router.tsx as the
 * element for a layout route wrapping those page routes.
 */
export default function DashboardLayout() {
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Keep the mobile/tablet drawer from also allowing the page behind it to
  // scroll while it's open.
  useEffect(() => {
    if (!isNavOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isNavOpen]);

  useEffect(() => {
    const { appearance } = loadSettings();

    applyAppearance(appearance);

    if (appearance.theme !== "system" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyAppearance(loadSettings().appearance);

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <div
      className="orbit-root overflow-x-hidden p-3 sm:p-4 lg:p-5"
      style={{ minHeight: "100vh" }}
    >
      <svg width="0" height="0">
        <filter id="paperNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.55  0 0 0 0 0.58  0 0 0 0 0.63  0 0 0 0.02 0"
          />
        </filter>
      </svg>
      <div className="paper-texture" style={{ filter: "url(#paperNoise)" }} />

      <div className="relative flex items-start gap-3 sm:gap-4 lg:gap-5">
        <Sidebar items={navItems} isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />

        <main className="w-full min-w-0 flex-1">
          <TopBar onMenuClick={() => setIsNavOpen(true)} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}