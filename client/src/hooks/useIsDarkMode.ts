import { useEffect, useState } from "react";

/**
 * Tracks html[data-theme] so SVG-attribute colors (Recharts marks,
 * raw stroke/fill) can follow the active theme — CSS custom
 * properties resolve fine in `style`/className, but not reliably
 * inside SVG paint attributes across engines, so those consumers
 * need a plain boolean to pick literal hex from chartTheme.ts.
 *
 * Extracted from Analytics.tsx so the project workspace's Analytics
 * tab can share the exact same light/dark detection.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.dataset.theme === "dark");
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
