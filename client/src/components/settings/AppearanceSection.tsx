import type { LucideIcon } from "lucide-react";
import { Moon, Palette, Sun, SunMoon } from "lucide-react";

import { ACCENTS, ACCENT_HEX, type AccentKey, type AppearanceSettings, type ThemePreference } from "../../data/settingsData";
import { SectionCard, ToggleRow } from "./shared";

interface AppearanceSectionProps {
  appearance: AppearanceSettings;
  onChange: (appearance: AppearanceSettings) => void;
}

const THEMES: { key: ThemePreference; label: string; icon: LucideIcon }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: SunMoon },
];

export function AppearanceSection({ appearance, onChange }: AppearanceSectionProps) {
  const accentHex = ACCENT_HEX[appearance.accent];

  function setTheme(theme: ThemePreference) {
    onChange({ ...appearance, theme });
  }

  function setAccent(accent: AccentKey) {
    onChange({ ...appearance, accent });
  }

  function setReduceMotion(reduceMotion: boolean) {
    onChange({ ...appearance, reduceMotion });
  }

  return (
    <SectionCard icon={Palette} title="Appearance" description="Theme, accent color, and motion preferences.">
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#667085" }}>Theme</p>

          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            {THEMES.map((option) => {
              const active = appearance.theme === option.key;
              const Icon = option.icon;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTheme(option.key)}
                  className="flex items-center"
                  style={{
                    gap: 7,
                    border: active ? `1px solid ${accentHex}` : "1px solid #E4E8ED",
                    borderRadius: 11,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: active ? "#F7F8FA" : "#FFFFFF",
                    color: active ? "#20242B" : "#98A2B3",
                    transition: "all 160ms ease",
                  }}
                >
                  <Icon size={14} color={active ? accentHex : "#98A2B3"} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#667085" }}>Accent color</p>

          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            {ACCENTS.map((option) => {
              const selected = appearance.accent === option.key;
              const hex = ACCENT_HEX[option.key];

              return (
                <button
                  key={option.key}
                  type="button"
                  aria-label={option.label}
                  onClick={() => setAccent(option.key)}
                  className="flex flex-col items-center"
                  style={{ gap: 5, border: "none", background: "transparent", cursor: "pointer" }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: hex,
                      display: "block",
                      border: selected ? "2px solid #20242B" : "2px solid transparent",
                      boxShadow: selected ? "none" : "0 0 0 1px #E4E8ED",
                    }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#98A2B3" }}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ToggleRow
          title="Reduce motion"
          description="Turn off hover lifts and fade-in transitions across Orbit."
          checked={appearance.reduceMotion}
          accent={accentHex}
          onChange={setReduceMotion}
        />
      </div>
    </SectionCard>
  );
}
