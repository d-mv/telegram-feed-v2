import { useAtomValue } from "jotai/react";
import { useContext } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { notificationSettingsAtom } from "../../../atoms/notifications.atom";
import type { Channel } from "../../../types";
import { AppContext } from "../../app/AppContext";
import styles from "./ChannelNotifications.module.css";

export function ChannelNotifications() {
  const channels = useAtomValue(channelsAtom);

  const notificationSettings = useAtomValue(notificationSettingsAtom);

  const { onToggleChannelNotification } = useContext(AppContext);

  function renderChannel(channel: Channel) {
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
  }

  return <div className={styles.container}>{channels.map(renderChannel)}</div>;
}
