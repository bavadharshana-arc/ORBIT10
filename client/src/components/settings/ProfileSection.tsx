import { useEffect, useState } from "react";
import { User } from "lucide-react";

import { AVATAR_COLOR_OPTIONS } from "../../data/settingsData";
import { getInitials } from "../../data/teamData";
import { ApiError } from "../../lib/api";
import { getMyProfile, updateMyProfile, type ProfileUpdate, type UserProfile } from "../../lib/userApi";
import { Avatar } from "../ui/Avatar";
import { Field, SavedBadge, SectionCard } from "./shared";
import { inputStyle, primaryButtonStyle, secondaryButtonStyle, textareaStyle } from "./styles";
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
      <SectionCard icon={User} title="Profile" description="Your personal details and how you appear across Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "#98A2B3" }}>Loading your profile…</p>
      </SectionCard>
    );
  }

  if (loadError || !profile || !form) {
    return (
      <SectionCard icon={User} title="Profile" description="Your personal details and how you appear across Orbit.">
        <p style={{ margin: 0, fontSize: 12.5, color: "#B3564B" }}>{loadError ?? "Couldn't load your profile."}</p>
      </SectionCard>
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
    <SectionCard icon={User} title="Profile" description="Your personal details and how you appear across Orbit.">
      {/* AVATAR */}
      <div className="flex items-center flex-wrap" style={{ gap: 16, marginBottom: 22 }}>
        <Avatar initials={getInitials(form.name || "?")} bg={form.avatarBg} fg={form.avatarFg} size={56} />

        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#667085" }}>Avatar color</p>
          <div className="flex items-center" style={{ gap: 7 }}>
            {AVATAR_COLOR_OPTIONS.map((option) => {
              const selected = option.bg === form.avatarBg;

              return (
                <button
                  key={option.bg}
                  type="button"
                  aria-label={`Use ${option.bg} avatar color`}
                  onClick={() => {
                    set("avatarBg", option.bg);
                    set("avatarFg", option.fg);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: option.bg,
                    border: selected ? "2px solid #20242B" : "2px solid transparent",
                    boxShadow: selected ? "none" : "0 0 0 1px #E4E8ED",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* FIELDS */}
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Full name">
            <input value={form.name} onChange={(event) => set("name", event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Job title">
            <input value={form.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Phone">
            <input value={form.phone} onChange={(event) => set("phone", event.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Location">
          <input value={form.location} onChange={(event) => set("location", event.target.value)} style={inputStyle} />
        </Field>

        <Field label="Bio" hint="A short line shown on your profile card.">
          <textarea value={form.bio} onChange={(event) => set("bio", event.target.value)} style={textareaStyle} />
        </Field>
      </div>

      {saveError && (
        <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#B3564B" }}>{saveError}</p>
      )}

      {/* FOOTER */}
      <div className="flex items-center" style={{ gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="lift"
          style={{ ...primaryButtonStyle, opacity: saving || !isDirty ? 0.6 : 1, cursor: saving || !isDirty ? "default" : "pointer" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {isDirty && !saving && (
          <button type="button" onClick={handleDiscard} style={secondaryButtonStyle}>
            Discard
          </button>
        )}

        <SavedBadge visible={saved} />
      </div>
    </SectionCard>
  );
}
