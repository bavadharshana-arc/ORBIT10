import { Bell } from "lucide-react";

import type { NotificationSettings } from "../../data/settingsData";
import { SectionCard, ToggleRow } from "./shared";

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
    <SectionCard icon={Bell} title="Notifications" description="Choose what you hear about, and how.">
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Email
          </p>

          <ToggleRow
            title="Task activity"
            description="Assignments, due dates, and status changes on your tasks."
            checked={notifications.emailTaskActivity}
            accent={accent}
            onChange={(value) => set("emailTaskActivity", value)}
          />

          <ToggleRow
            title="Weekly digest"
            description="A summary of your team's progress every Monday."
            checked={notifications.emailWeeklyDigest}
            accent={accent}
            onChange={(value) => set("emailWeeklyDigest", value)}
          />

          <ToggleRow
            title="Product updates"
            description="News about new Orbit features and improvements."
            checked={notifications.emailProductUpdates}
            accent={accent}
            onChange={(value) => set("emailProductUpdates", value)}
          />
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#98A2B3", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Push
          </p>

          <ToggleRow
            title="Push notifications"
            description="Enable alerts on your desktop and mobile devices."
            checked={notifications.pushEnabled}
            accent={accent}
            onChange={(value) => set("pushEnabled", value)}
          />

          <ToggleRow
            title="Task reminders"
            description="A nudge shortly before a task is due."
            checked={notifications.pushTaskReminders}
            disabled={!notifications.pushEnabled}
            accent={accent}
            onChange={(value) => set("pushTaskReminders", value)}
          />

          <ToggleRow
            title="Mentions & comments"
            description="When someone @mentions you or replies to a thread."
            checked={notifications.pushMentions}
            disabled={!notifications.pushEnabled}
            accent={accent}
            onChange={(value) => set("pushMentions", value)}
          />
        </div>
      </div>
    </SectionCard>
  );
}
