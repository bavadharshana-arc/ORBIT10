import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { AVATAR_COLOR_OPTIONS } from "../../data/settingsData";
import { getInitials } from "../../data/teamData";
import { ApiError } from "../../lib/api";
import { getMyProfile, updateMyProfile, type ProfileUpdate, type UserProfile } from "../../lib/userApi";
import { Avatar } from "../ui/Avatar";
import { SavedBadge, SettingsGroup, SettingsRow, SettingsSection } from "./shared";
import { inputStyle, settingsPrimaryButtonStyle, settingsSecondaryButtonStyle, textareaStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

/* ============================================================
   FORM STATE

   Every UserProfile column the form edits, normalized to "" for the
   nullable string columns (jobTitle/phone/location/bio) so inputs stay
   controlled — the API is free to return null for a column nobody has
   set yet.
============================================================ */

interface ProfileForm {
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  location: string;
  bio: string;
  avatarBg: string;
  avatarFg: string;
}

const FALLBACK_AVATAR = AVATAR_COLOR_OPTIONS[0]!;

function toForm(profile: UserProfile): ProfileForm {
  return {
    name: profile.name ?? "",
    email: profile.email,
    jobTitle: profile.jobTitle ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    avatarBg: profile.avatarBg ?? FALLBACK_AVATAR.bg,
    avatarFg: profile.avatarFg ?? FALLBACK_AVATAR.fg,
  };
}

export function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [saved, flashSaved] = useSavedFlash();

  useEffect(() => {
    // No setLoading(true)/setLoadError(null) here — `loading`/`loadError`
    // already start at (true, null), and this effect only ever runs once
    // (empty deps), so re-asserting them on mount would just be a
    // synchronous setState-in-effect for no behavioral change.
    let cancelled = false;

    getMyProfile()
      .then((fetched) => {
        if (cancelled) return;
        setProfile(fetched);
        setForm(toForm(fetched));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setLoadError("Sign in to view and edit your profile.");
        } else {
          setLoadError("Couldn't load your profile. Try again in a moment.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SettingsSection title="Profile" description="Your personal details and how you appear across Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-3)" }}>Loading your profile…</p>
      </SettingsSection>
    );
  }

  if (loadError || !profile || !form) {
    return (
      <SettingsSection title="Profile" description="Your personal details and how you appear across Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "#B3564B" }}>{loadError ?? "Couldn't load your profile."}</p>
      </SettingsSection>
    );
  }

  const isDirty =
    form.name !== (profile.name ?? "") ||
    form.email !== profile.email ||
    form.jobTitle !== (profile.jobTitle ?? "") ||
    form.phone !== (profile.phone ?? "") ||
    form.location !== (profile.location ?? "") ||
    form.bio !== (profile.bio ?? "") ||
    form.avatarBg !== (profile.avatarBg ?? FALLBACK_AVATAR.bg);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleDiscard() {
    if (!profile) return;
    setForm(toForm(profile));
    setSaveError(null);
  }

  async function handleSave() {
    if (!profile || !form) return;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setSaveError("Name can't be empty.");
      return;
    }

    // Partial update — only the fields that actually changed, exercising
    // PATCH /api/users/me's partial-update support rather than always
    // resending every column.
    const patch: ProfileUpdate = {};
    if (trimmedName !== (profile.name ?? "")) patch.name = trimmedName;
    if (form.email.trim() !== profile.email) patch.email = form.email.trim();
    if (form.jobTitle.trim() !== (profile.jobTitle ?? "")) patch.jobTitle = form.jobTitle.trim();
    if (form.phone.trim() !== (profile.phone ?? "")) patch.phone = form.phone.trim();
    if (form.location.trim() !== (profile.location ?? "")) patch.location = form.location.trim();
    if (form.bio.trim() !== (profile.bio ?? "")) patch.bio = form.bio.trim();
    if (form.avatarBg !== (profile.avatarBg ?? FALLBACK_AVATAR.bg)) {
      patch.avatarBg = form.avatarBg;
      patch.avatarFg = form.avatarFg;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateMyProfile(patch);
      setProfile(updated);
      setForm(toForm(updated));
      flashSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSaveError("That email is already in use.");
      } else if (error instanceof ApiError && error.status === 401) {
        setSaveError("Sign in to save changes to your profile.");
      } else if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError("Couldn't save your profile. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection title="Profile" description="Your personal details and how you appear across Orbit.">
      {/* IDENTITY — compact avatar/name/email strip, not its own boxed card */}
      <div className="flex items-center flex-wrap" style={{ gap: 16 }}>
        <Avatar initials={getInitials(form.name || "?")} bg={form.avatarBg} fg={form.avatarFg} size={60} />
        <div style={{ minWidth: 0 }}>
          <p className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
            {form.name || "Unnamed"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-3)" }}>
            {form.email}
            {form.jobTitle ? ` · ${form.jobTitle}` : ""}
          </p>
        </div>
      </div>

      <SettingsGroup>
        <SettingsRow label="Avatar color" description="Shown across Orbit wherever your initials appear.">
          <div className="flex items-center" style={{ gap: 8, justifyContent: "flex-end" }}>
            {AVATAR_COLOR_OPTIONS.map((option, index) => {
              const selected = option.bg === form.avatarBg;

              return (
                <button
                  key={option.bg}
                  type="button"
                  aria-label={`Avatar color ${index + 1}`}
                  aria-pressed={selected}
                  onClick={() => {
                    set("avatarBg", option.bg);
                    set("avatarFg", option.fg);
                  }}
                  className="focus-ring settings-swatch flex items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: option.bg,
                    border: selected ? "2px solid var(--text)" : "2px solid transparent",
                    boxShadow: selected ? "none" : "0 0 0 1px var(--border)",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {selected && <Check size={11} strokeWidth={3} color={option.fg} />}
                </button>
              );
            })}
          </div>
        </SettingsRow>

        <SettingsRow label="Full name" description="Your name shown across Orbit.">
          <input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            className="focus-ring settings-input"
            style={inputStyle}
          />
        </SettingsRow>

        <SettingsRow label="Email" description="Your account email.">
          <input
            type="email"
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            className="focus-ring settings-input"
            style={inputStyle}
          />
        </SettingsRow>

        <SettingsRow label="Job title" description="Shown on your profile card.">
          <input
            value={form.jobTitle}
            onChange={(event) => set("jobTitle", event.target.value)}
            placeholder="Add a job title"
            className="focus-ring settings-input"
            style={inputStyle}
          />
        </SettingsRow>

        <SettingsRow label="Phone" description="Optional — visible to your workspace.">
          <input
            value={form.phone}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="Add a phone number"
            className="focus-ring settings-input"
            style={inputStyle}
          />
        </SettingsRow>

        <SettingsRow label="Location" description="Optional — city or region.">
          <input
            value={form.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder="Add your location"
            className="focus-ring settings-input"
            style={inputStyle}
          />
        </SettingsRow>

        <SettingsRow label="Bio" description="A short line shown on your profile card." stack>
          <textarea
            value={form.bio}
            onChange={(event) => set("bio", event.target.value)}
            placeholder="Write a short bio"
            className="focus-ring settings-input"
            style={textareaStyle}
          />
        </SettingsRow>
      </SettingsGroup>

      {saveError && <p style={{ margin: 0, fontSize: 11.5, color: "#B3564B" }}>{saveError}</p>}

      <div className="flex items-center" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="settings-btn settings-btn-primary focus-ring"
          style={{
            ...settingsPrimaryButtonStyle,
            cursor: saving || !isDirty ? "default" : "pointer",
            // Only set inline when actually disabled — an inline `opacity`
            // present at rest would always beat .settings-btn-primary:hover's
            // CSS rule (inline declarations win the cascade regardless of
            // :hover), silently killing the hover feedback while enabled.
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
    </SettingsSection>
  );
}
