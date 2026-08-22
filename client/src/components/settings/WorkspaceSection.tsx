import { useState } from "react";

import { formatDatePreview, slugify, TIMEZONES, type DateFormat, type WeekStart } from "../../data/settingsData";
import { useWorkspace } from "../../context/workspaceContextValue";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";
import { ApiError } from "../../lib/api";
import { updateWorkspaceSettings, type WorkspaceRecord } from "../../lib/workspaceApi";
import { SavedBadge, SettingsGroup, SettingsGroupHeader, SettingsRow, SettingsSection } from "./shared";
import { inputStyle, selectStyle, settingsPrimaryButtonStyle, settingsSecondaryButtonStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

const DATE_FORMATS: DateFormat[] = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

const WEEK_STARTS: { key: WeekStart; label: string }[] = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
];

const DEFAULT_TIMEZONE = "America/Los_Angeles";
const DEFAULT_DATE_FORMAT: DateFormat = "MM/DD/YYYY";
const DEFAULT_WEEK_START: WeekStart = "monday";

/* ============================================================
   FORM STATE

   Mirrors ProfileSection.tsx's shape: form fields normalized away from
   the API's nullable columns (an existing workspace has none of these
   set until someone saves this tab) so inputs stay controlled.
============================================================ */

interface WorkspaceForm {
  name: string;
  slug: string;
  timezone: string;
  dateFormat: DateFormat;
  weekStart: WeekStart;
}

function toForm(workspace: WorkspaceRecord): WorkspaceForm {
  return {
    name: workspace.name,
    slug: workspace.slug ?? slugify(workspace.name),
    timezone: workspace.timezone ?? DEFAULT_TIMEZONE,
    dateFormat: (workspace.dateFormat as DateFormat | null) ?? DEFAULT_DATE_FORMAT,
    weekStart: (workspace.weekStart as WeekStart | null) ?? DEFAULT_WEEK_START,
  };
}

export function WorkspaceSection() {
  // Stage 6 (Permissions Alignment): real WorkspaceRole — matches
  // PATCH /workspaces/:id's actual gate (requireWorkspaceRole("OWNER",
  // "ADMIN"), workspace.routes.ts), same threshold Team.tsx's own real
  // permission gating and the rest of workspace management already use.
  const workspaceRole = useWorkspaceRole();
  const canManage = isWorkspaceManager(workspaceRole);

  // Phase 24: workspace discovery (GET /workspaces, take the current
  // one) is no longer this component's own concern — WorkspaceProvider
  // fetches it once for the whole app. This component keeps only its
  // own editable draft (`form`), reset from `workspace` whenever the
  // shared current workspace changes.
  const { currentWorkspace: workspace, isLoading: loading, error: loadError, refetch } = useWorkspace();

  const [form, setForm] = useState<WorkspaceForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Tracks which workspace `form` was last synced from, so it only
  // resets when the *identity* of the current workspace changes (e.g.
  // on load, or a future workspace switch) — not on every render. Set
  // directly during render (React's documented pattern for "adjust
  // state when a prop changes") rather than in a useEffect, since a
  // useEffect here would set state synchronously on its very first run
  // whenever `workspace` loads in, which is exactly what
  // react-hooks/set-state-in-effect flags.
  const [syncedWorkspaceId, setSyncedWorkspaceId] = useState<string | null>(null);

  const [saved, flashSaved] = useSavedFlash();

  if (workspace && workspace.id !== syncedWorkspaceId) {
    setSyncedWorkspaceId(workspace.id);
    setForm(toForm(workspace));
  }

  if (loading) {
    return (
      <SettingsSection title="Workspace" description="Preferences shared across everyone in Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-3)" }}>Loading workspace settings…</p>
      </SettingsSection>
    );
  }

  if (loadError || !workspace || !form) {
    return (
      <SettingsSection title="Workspace" description="Preferences shared across everyone in Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "#B3564B" }}>
          {loadError ?? "No workspace found for your account."}
        </p>
      </SettingsSection>
    );
  }

  const isDirty =
    form.name !== workspace.name ||
    form.slug !== (workspace.slug ?? slugify(workspace.name)) ||
    form.timezone !== (workspace.timezone ?? DEFAULT_TIMEZONE) ||
    form.dateFormat !== ((workspace.dateFormat as DateFormat | null) ?? DEFAULT_DATE_FORMAT) ||
    form.weekStart !== ((workspace.weekStart as WeekStart | null) ?? DEFAULT_WEEK_START);

  function set<K extends keyof WorkspaceForm>(key: K, value: WorkspaceForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleDiscard() {
    if (!workspace) return;
    setForm(toForm(workspace));
    setSaveError(null);
  }

  async function handleSave() {
    if (!canManage || !workspace || !form) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setSaveError("Workspace name can't be empty.");
      return;
    }

    const slug = slugify(form.slug) || slugify(trimmedName);

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateWorkspaceSettings(workspace.id, {
        name: trimmedName,
        slug,
        timezone: form.timezone,
        dateFormat: form.dateFormat,
        weekStart: form.weekStart,
      });
      setForm(toForm(updated));
      // Re-syncs the shared WorkspaceContext (name/slug/etc. just
      // changed) so every other consumer — not just this form — reflects
      // the save, rather than only this component's own local draft.
      refetch();
      flashSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setSaveError("You don't have permission to edit workspace settings.");
      } else if (error instanceof ApiError && error.status === 401) {
        setSaveError("Sign in to save workspace settings.");
      } else if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError("Couldn't save workspace settings. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection title="Workspace" description="Preferences shared across everyone in Orbit.">
      {!canManage && (
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-3)" }}>
          Only workspace owners and admins can edit these settings — you can view them, but Save is hidden.
        </p>
      )}

      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Workspace identity" />
        <SettingsGroup>
          <SettingsRow label="Workspace name" description="Shown throughout Orbit and in notifications.">
            <input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              disabled={!canManage}
              className="focus-ring settings-input"
              style={inputStyle}
            />
          </SettingsRow>

          <SettingsRow label="Workspace URL" description="Lowercase letters, numbers, and dashes only.">
            <div className="flex items-center focus-ring settings-input" style={{ ...inputStyle, gap: 3, padding: "8px 12px" }}>
              <span style={{ color: "var(--text-3)", flexShrink: 0 }}>orbit.io/</span>
              <input
                value={form.slug}
                onChange={(event) => set("slug", event.target.value)}
                onBlur={() => set("slug", slugify(form.slug))}
                disabled={!canManage}
                className="focus-ring"
                style={{ border: "none", background: "transparent", fontSize: 12.5, flex: 1, minWidth: 0, color: "var(--text)", padding: 0 }}
              />
            </div>
          </SettingsRow>
        </SettingsGroup>
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Regional preferences" />
        <SettingsGroup>
          <SettingsRow label="Time zone">
            <select
              value={form.timezone}
              onChange={(event) => set("timezone", event.target.value)}
              disabled={!canManage}
              className="focus-ring settings-input"
              style={selectStyle}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Date format" description={`Preview: ${formatDatePreview(new Date(), form.dateFormat)}`}>
            <select
              value={form.dateFormat}
              onChange={(event) => set("dateFormat", event.target.value as DateFormat)}
              disabled={!canManage}
              className="focus-ring settings-input"
              style={selectStyle}
            >
              {DATE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Week starts on">
            <div
              className="flex items-center"
              style={{ gap: 2, background: "var(--surface-2)", borderRadius: 8, padding: 3, width: "fit-content", marginLeft: "auto" }}
            >
              {WEEK_STARTS.map((option) => {
                const active = form.weekStart === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => set("weekStart", option.key)}
                    disabled={!canManage}
                    aria-pressed={active}
                    className="focus-ring"
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: canManage ? "pointer" : "default",
                      background: active ? "var(--card)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-3)",
                      boxShadow: active ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </SettingsRow>
        </SettingsGroup>
      </div>

      {saveError && <p style={{ margin: 0, fontSize: 11.5, color: "#B3564B" }}>{saveError}</p>}

      {canManage && (
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="settings-btn settings-btn-primary focus-ring"
            style={{
              ...settingsPrimaryButtonStyle,
              cursor: saving || !isDirty ? "default" : "pointer",
              // See ProfileSection.tsx's identical comment: opacity must
              // stay unset at rest, or it permanently overrides the CSS
              // hover rule regardless of hover state.
              ...(saving || !isDirty ? { opacity: 0.5 } : {}),
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {isDirty && !saving && (
            <button
              type="button"
              onClick={handleDiscard}
              className="settings-btn settings-btn-secondary focus-ring"
              style={settingsSecondaryButtonStyle}
            >
              Discard
            </button>
          )}

          <SavedBadge visible={saved} />
        </div>
      )}
    </SettingsSection>
  );
}
