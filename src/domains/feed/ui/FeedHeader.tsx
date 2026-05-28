import { Flex, theme, Typography } from "antd";
import { useAtomValue } from "jotai/react";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { Menu } from "../../menu/Menu";

export function FeedHeader() {
	const { token } = theme.useToken();
	const feedItems = useAtomValue(feedItemsAtom);
	const unreadCount = feedItems.filter((item) => item.isRead === false).length;
	const bg = `color-mix(in srgb, ${token.colorBgLayout} 80%, transparent)`;

	return (
		<div
			style={{
				position: "sticky",
				top: 0,
				zIndex: 10,
				backdropFilter: "blur(12px)",
				background: bg,
			}}
		>
			<Flex
				align="center"
				justify="space-between"
				style={{
					width: "100%",
					maxWidth: 640,
					margin: "0 auto",
					padding: "16px 26px",
					marginBottom: 8,
				}}
			>
				<div>
					<Typography.Text
						type="secondary"
						style={{
							fontSize: 12,
							textTransform: "uppercase",
							letterSpacing: 1,
						}}
					>
						Feed
					</Typography.Text>
					<Flex align="center" gap={8}>
						<Typography.Title level={4} style={{ margin: 0 }}>
							Your feed is ready.
						</Typography.Title>
						{unreadCount > 0 && (
							<span
								aria-label={`${unreadCount} unread messages`}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									minWidth: 20,
									height: 20,
									borderRadius: 10,
									background: token.colorPrimary,
									color: token.colorTextLightSolid,
									fontSize: 11,
									fontWeight: 600,
									padding: "0 5px",
								}}
							>
								{unreadCount}
							</span>
						)}
					</Flex>
				</div>
				<Menu />
			</Flex>
		</div>
	);
}
