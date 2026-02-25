import { useAtomValue } from "jotai/react";
import { useContext } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import type { Channel } from "../../../types";
import { AppContext } from "../../app/AppContext";
import styles from "./ChannelNotifications.module.css";

export function ChannelFilters() {
  const channels = useAtomValue(channelsAtom);
  const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
  const { onToggleChannelFilter } = useContext(AppContext);

  function renderChannel(channel: Channel) {
    const enabled = feedFilterSettings[channel.key] !== false;

    return (
      <div key={channel.key} className={styles.row}>
        <div className={styles["label-wrapper"]}>
          <p className={styles.label}>{channel.label}</p>
        </div>
        <button
          type="button"
          className={`toggle ${enabled ? "toggle-on" : ""}`}
          aria-pressed={enabled}
          aria-label={`Feed visibility for ${channel.label}`}
          onClick={() => onToggleChannelFilter(channel.key, !enabled)}
        >
          <span className="toggle-knob" />
        </button>
      </div>
    );
  }

  return <div className={styles.container}>{channels.map(renderChannel)}</div>;
}

