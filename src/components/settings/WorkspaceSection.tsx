import { useState } from "react";
import { Building2 } from "lucide-react";

import { formatDatePreview, slugify, TIMEZONES, type DateFormat, type WeekStart, type WorkspaceSettings } from "../../data/settingsData";
import { resolveCurrentMemberRole, canManageWorkspaceSettings } from "../../data/teamData";
import { useAuth } from "../../context/AuthContext";
import { canManageWorkspace, resolveEffectiveRole } from "../../lib/permissions";
import { Field, SavedBadge, SectionCard } from "./shared";
import { inputStyle, primaryButtonStyle, secondaryButtonStyle, selectStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

interface WorkspaceSectionProps {
  workspace: WorkspaceSettings;
  onSave: (workspace: WorkspaceSettings) => void;
}

const DATE_FORMATS: DateFormat[] = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

const WEEK_STARTS: { key: WeekStart; label: string }[] = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
];

export function WorkspaceSection({ workspace, onSave }: WorkspaceSectionProps) {
  // Shared across everyone in Orbit (see the SectionCard description
  // below) — Admin only, same threshold as the rest of workspace
  // management (Team.tsx, Danger Zone).
  const { role } = useAuth();
  const canManage =
    canManageWorkspaceSettings(resolveCurrentMemberRole(role)) && canManageWorkspace(resolveEffectiveRole(role));

  const [workspaceName, setWorkspaceName] = useState(workspace.workspaceName);
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace.workspaceSlug);
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [dateFormat, setDateFormat] = useState<DateFormat>(workspace.dateFormat);
  const [weekStart, setWeekStart] = useState<WeekStart>(workspace.weekStart);

  const [saved, flashSaved] = useSavedFlash();

  const isDirty =
    workspaceName !== workspace.workspaceName ||
    workspaceSlug !== workspace.workspaceSlug ||
    timezone !== workspace.timezone ||
    dateFormat !== workspace.dateFormat ||
    weekStart !== workspace.weekStart;

  function handleDiscard() {
    setWorkspaceName(workspace.workspaceName);
    setWorkspaceSlug(workspace.workspaceSlug);
    setTimezone(workspace.timezone);
    setDateFormat(workspace.dateFormat);
    setWeekStart(workspace.weekStart);
  }

  function handleSave() {
    if (!canManage) return;

    const trimmedName = workspaceName.trim();

    if (!trimmedName) {
      return;
    }

    const slug = slugify(workspaceSlug) || slugify(trimmedName);

    onSave({
      workspaceName: trimmedName,
      workspaceSlug: slug,
      timezone,
      dateFormat,
      weekStart,
    });

    setWorkspaceSlug(slug);
    flashSaved();
  }

  return (
    <SectionCard icon={Building2} title="Workspace" description="Preferences shared across everyone in Orbit.">
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Workspace name">
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              disabled={!canManage}
              style={inputStyle}
            />
          </Field>

          <Field label="Workspace URL" hint="Lowercase letters, numbers, and dashes only.">
            <div className="flex items-center" style={{ ...inputStyle, gap: 4, padding: "9px 12px" }}>
              <span style={{ color: "#98A2B3" }}>orbit.io/</span>
              <input
                value={workspaceSlug}
                onChange={(event) => setWorkspaceSlug(event.target.value)}
                onBlur={() => setWorkspaceSlug((current) => slugify(current))}
                disabled={!canManage}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, color: "#20242B" }}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Time zone">
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} disabled={!canManage} style={selectStyle}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date format" hint={`Preview: ${formatDatePreview(new Date(), dateFormat)}`}>
            <select
              value={dateFormat}
              onChange={(event) => setDateFormat(event.target.value as DateFormat)}
              disabled={!canManage}
              style={selectStyle}
            >
              {DATE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Week starts on">
          <div className="flex items-center" style={{ gap: 2, background: "#EEF2F6", borderRadius: 10, padding: 3, width: "fit-content" }}>
            {WEEK_STARTS.map((option) => {
              const active = weekStart === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setWeekStart(option.key)}
                  disabled={!canManage}
                  style={{
                    border: "none",
                    borderRadius: 7,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: canManage ? "pointer" : "default",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#20242B" : "#98A2B3",
                    boxShadow: active ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {canManage && (
        <div className="flex items-center" style={{ gap: 10, marginTop: 20 }}>
          <button type="button" onClick={handleSave} className="lift" style={primaryButtonStyle}>
            Save changes
          </button>

          {isDirty && (
            <button type="button" onClick={handleDiscard} style={secondaryButtonStyle}>
              Discard
            </button>
          )}

          <SavedBadge visible={saved} />
        </div>
      )}
    </SectionCard>
  );
}
