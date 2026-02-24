import styles from "./ChannelNotifications.module.css";

type Props = {
  channels: Array<{ key: string; label: string }>;
  notificationSettings: Record<string, boolean>;
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
};
export function ChannelNotifications({
  channels,
  notificationSettings,
  onToggleChannelNotification,
}: Props) {
  return (
    <div className={styles.container}>
      {channels.map((channel) => {
        const enabled = notificationSettings[channel.key] === true;
        return (
          <div key={channel.key} className={styles.row}>
            <div className={styles["label-wrapper"]}>
              <p className={styles.label}>{channel.label}</p>
            </div>
            <button
              type="button"
              className={`toggle ${enabled ? "toggle-on" : ""}`}
              aria-pressed={enabled}
              aria-label={`Notifications for ${channel.label}`}
              onClick={() => onToggleChannelNotification(channel.key, !enabled)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
