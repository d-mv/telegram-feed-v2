import { Flex, Switch, Typography } from "antd";
import { useAtomValue } from "jotai/react";
import { useContext } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { notificationSettingsAtom } from "../../../atoms/notifications.atom";
import type { Channel } from "../../../types";
import { AppContext } from "../../app/AppContext";

export function ChannelNotifications() {
  const channels = useAtomValue(channelsAtom);
  const notificationSettings = useAtomValue(notificationSettingsAtom);
  const { onToggleChannelNotification } = useContext(AppContext);

  function renderChannel(channel: Channel) {
    const enabled = notificationSettings[channel.key] === true;

    return (
      <Flex key={channel.key} align="center" justify="space-between" style={{ padding: "8px 0" }}>
        <Typography.Text>{channel.label}</Typography.Text>
        <Switch
          checked={enabled}
          onChange={(checked) => onToggleChannelNotification(channel.key, checked)}
          aria-label={`Notifications for ${channel.label}`}
          size="small"
        />
      </Flex>
    );
  }

  return <div>{channels.map(renderChannel)}</div>;
}
