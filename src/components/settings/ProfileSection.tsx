import { useState } from "react";
import { User } from "lucide-react";

import { AVATAR_COLOR_OPTIONS, type ProfileSettings } from "../../data/settingsData";
import { getInitials } from "../../data/teamData";
import { Avatar } from "../ui/Avatar";
import { Field, SavedBadge, SectionCard } from "./shared";
import { inputStyle, primaryButtonStyle, secondaryButtonStyle, textareaStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

interface ProfileSectionProps {
  profile: ProfileSettings;
  onSave: (profile: ProfileSettings) => void;
}

export function ProfileSection({ profile, onSave }: ProfileSectionProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [phone, setPhone] = useState(profile.phone);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [avatarBg, setAvatarBg] = useState(profile.avatarBg);
  const [avatarFg, setAvatarFg] = useState(profile.avatarFg);

  const [saved, flashSaved] = useSavedFlash();

  const isDirty =
    name !== profile.name ||
    email !== profile.email ||
    jobTitle !== profile.jobTitle ||
    phone !== profile.phone ||
    location !== profile.location ||
    bio !== profile.bio ||
    avatarBg !== profile.avatarBg;

  function handleDiscard() {
    setName(profile.name);
    setEmail(profile.email);
    setJobTitle(profile.jobTitle);
    setPhone(profile.phone);
    setLocation(profile.location);
    setBio(profile.bio);
    setAvatarBg(profile.avatarBg);
    setAvatarFg(profile.avatarFg);
  }

  function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    onSave({
      name: trimmedName,
      email: email.trim(),
      jobTitle: jobTitle.trim(),
      phone: phone.trim(),
      location: location.trim(),
      bio: bio.trim(),
      avatarBg,
      avatarFg,
    });

    flashSaved();
  }

  return (
    <SectionCard icon={User} title="Profile" description="Your personal details and how you appear across Orbit.">
      {/* AVATAR */}
      <div className="flex items-center flex-wrap" style={{ gap: 16, marginBottom: 22 }}>
        <Avatar initials={getInitials(name || "?")} bg={avatarBg} fg={avatarFg} size={56} />

        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#667085" }}>Avatar color</p>
          <div className="flex items-center" style={{ gap: 7 }}>
            {AVATAR_COLOR_OPTIONS.map((option) => {
              const selected = option.bg === avatarBg;

              return (
                <button
                  key={option.bg}
                  type="button"
                  aria-label={`Use ${option.bg} avatar color`}
                  onClick={() => {
                    setAvatarBg(option.bg);
                    setAvatarFg(option.fg);
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
            <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Job title">
            <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} style={inputStyle} />
          </Field>

          <Field label="Phone">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} style={inputStyle} />
          </Field>
        </div>

        <Field label="Location">
          <input value={location} onChange={(event) => setLocation(event.target.value)} style={inputStyle} />
        </Field>

        <Field label="Bio" hint="A short line shown on your profile card.">
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} style={textareaStyle} />
        </Field>
      </div>

      {/* FOOTER */}
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
    </SectionCard>
  );
}
