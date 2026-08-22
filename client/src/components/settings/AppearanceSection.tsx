import type { LucideIcon } from "lucide-react";
import { Check, Moon, Sun, SunMoon } from "lucide-react";

import { ACCENTS, ACCENT_HEX, type AccentKey, type AppearanceSettings, type ThemePreference } from "../../data/settingsData";
import { Switch } from "../ui/Switch";
import { SettingsGroup, SettingsGroupHeader, SettingsRow, SettingsSection } from "./shared";

interface AppearanceSectionProps {
  appearance: AppearanceSettings;
  onChange: (appearance: AppearanceSettings) => void;
}

const THEMES: { key: ThemePreference; label: string; description: string; icon: LucideIcon }[] = [
  { key: "light", label: "Light", description: "Bright and clean", icon: Sun },
  { key: "dark", label: "Dark", description: "Easy on the eyes", icon: Moon },
  { key: "system", label: "System", description: "Match your device", icon: SunMoon },
];

/** Checkmark color with reasonable contrast against each accent swatch — the palette runs light (sky) to near-black (ink), so one fixed check color would wash out on half of them. */
const ACCENT_CHECK_COLOR: Record<AccentKey, string> = {
  dusk: "#20242B",
  sky: "#20242B",
  ink: "#F7F8FA",
  slate: "#F7F8FA",
};

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
    <SettingsSection title="Appearance" description="Theme, accent color, and motion preferences.">
      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Theme" />

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
          {THEMES.map((option) => {
            const active = appearance.theme === option.key;
            const Icon = option.icon;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setTheme(option.key)}
                aria-pressed={active}
                className="focus-ring settings-option-card flex flex-col"
                style={{
                  gap: 10,
                  padding: 14,
                  borderRadius: 10,
                  border: active ? `1.5px solid ${accentHex}` : "1px solid var(--border)",
                  background: active ? "var(--surface)" : "var(--card)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} strokeWidth={1.8} color={active ? accentHex : "var(--text-3)"} />
                  </div>
                  {active && <Check size={14} strokeWidth={2.6} color={accentHex} />}
                </div>

                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: active ? "var(--text)" : "var(--text-2)" }}>
                    {option.label}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)" }}>{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Accent color" />

        <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
          {ACCENTS.map((option) => {
            const selected = appearance.accent === option.key;
            const hex = ACCENT_HEX[option.key];

            return (
              <button
                key={option.key}
                type="button"
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => setAccent(option.key)}
                className="focus-ring settings-swatch flex flex-col items-center"
                style={{ gap: 6, border: "none", background: "transparent", cursor: "pointer" }}
              >
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: hex,
                    border: selected ? "2px solid var(--text)" : "2px solid transparent",
                    boxShadow: selected ? "none" : "0 0 0 1px var(--border)",
                  }}
                >
                  {selected && <Check size={13} strokeWidth={3} color={ACCENT_CHECK_COLOR[option.key]} />}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <SettingsGroup>
        <SettingsRow label="Reduce motion" description="Turn off hover lifts and fade-in transitions across Orbit.">
          <Switch checked={appearance.reduceMotion} accent={accentHex} onChange={setReduceMotion} label="Reduce motion" />
        </SettingsRow>
      </SettingsGroup>
    </SettingsSection>
  );
}
