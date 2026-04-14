import { Flex, Switch, Typography } from "antd";
import { useAtomValue } from "jotai/react";
import { useContext } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import type { Channel } from "../../../types";
import { AppContext } from "../../app/AppContext";

export function ChannelFilters() {
  const channels = useAtomValue(channelsAtom);
  const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
  const { onToggleChannelFilter } = useContext(AppContext);

  function renderChannel(channel: Channel) {
    const enabled = feedFilterSettings[channel.key] !== false;

    return (
      <Flex key={channel.key} align="center" justify="space-between" style={{ padding: "8px 0" }}>
        <Typography.Text>{channel.label}</Typography.Text>
        <Switch
          checked={enabled}
          onChange={(checked) => onToggleChannelFilter(channel.key, checked)}
          aria-label={`Feed visibility for ${channel.label}`}
          size="small"
        />
      </Flex>
    );
  }

  return <div>{channels.map(renderChannel)}</div>;
}
