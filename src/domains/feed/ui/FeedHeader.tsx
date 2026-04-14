import { Flex, theme, Typography } from "antd";
import { Menu } from "../../menu/Menu";

export function FeedHeader() {
  const { token } = theme.useToken();
  const bg = `color-mix(in srgb, ${token.colorBgLayout} 80%, transparent)`;

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)", background: bg }}>
      <Flex
        align="center"
        justify="space-between"
        style={{ width: "100%", maxWidth: 640, margin: "0 auto", padding: "16px 26px", marginBottom: 8 }}
      >
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Feed
          </Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Your feed is ready.
          </Typography.Title>
        </div>
        <Menu />
      </Flex>
    </div>
  );
}
