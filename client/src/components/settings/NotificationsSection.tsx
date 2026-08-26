import type { NotificationSettings } from "../../data/settingsData";
import { Switch } from "../ui/Switch";
import { SettingsGroup, SettingsGroupHeader, SettingsRow, SettingsSection } from "./shared";

interface NotificationsSectionProps {
  notifications: NotificationSettings;
  accent: string;
  onChange: (notifications: NotificationSettings) => void;
}

export function NotificationsSection({ notifications, accent, onChange }: NotificationsSectionProps) {
  function set<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    onChange({ ...notifications, [key]: value });
  }

  return (
    <SettingsSection title="Notifications" description="Choose what you hear about, and how.">
      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Email" />
        <SettingsGroup>
          <SettingsRow label="Task activity" description="Assignments, due dates, and status changes on your tasks.">
            <Switch
              checked={notifications.emailTaskActivity}
              onChange={(value) => set("emailTaskActivity", value)}
              accent={accent}
              label="Task activity"
            />
          </SettingsRow>

          <SettingsRow label="Weekly digest" description="A summary of your team's progress every Monday.">
            <Switch
              checked={notifications.emailWeeklyDigest}
              onChange={(value) => set("emailWeeklyDigest", value)}
              accent={accent}
              label="Weekly digest"
            />
          </SettingsRow>

          <SettingsRow label="Product updates" description="News about new Orbit features and improvements.">
            <Switch
              checked={notifications.emailProductUpdates}
              onChange={(value) => set("emailProductUpdates", value)}
              accent={accent}
              label="Product updates"
            />
          </SettingsRow>
        </SettingsGroup>
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Push" />
        <SettingsGroup>
          <SettingsRow label="Push notifications" description="Enable alerts on your desktop and mobile devices.">
            <Switch
              checked={notifications.pushEnabled}
              onChange={(value) => set("pushEnabled", value)}
              accent={accent}
              label="Push notifications"
            />
          </SettingsRow>

          <SettingsRow label="Task reminders" description="A nudge shortly before a task is due.">
            <Switch
              checked={notifications.pushTaskReminders}
              disabled={!notifications.pushEnabled}
              onChange={(value) => set("pushTaskReminders", value)}
              accent={accent}
              label="Task reminders"
            />
          </SettingsRow>

          <SettingsRow label="Mentions & comments" description="When someone @mentions you or replies to a thread.">
            <Switch
              checked={notifications.pushMentions}
              disabled={!notifications.pushEnabled}
              onChange={(value) => set("pushMentions", value)}
              accent={accent}
              label="Mentions & comments"
            />
          </SettingsRow>
        </SettingsGroup>
      </div>
    </SettingsSection>
  );
}
