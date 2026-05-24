import {
	Alert,
	Button,
	Drawer,
	Dropdown,
	Flex,
	Input,
	theme,
	Typography,
} from "antd";
import { useContext, useEffect, useState } from "react";
import type { FeedItem } from "../../../types";
import { AppContext } from "../../app/AppContext";
import { leaveFeedChannel } from "../../search/infra/telegramMembership";
import { ChatThread } from "./ChatThread";
import { EllipsisOutlined, SendOutlined } from "@ant-design/icons";

type ChatProps = {
	item: FeedItem;
	onClose: () => void;
};

export function Chat({ item, onClose }: ChatProps) {
	const { token } = theme.useToken();
	const title = item.chatName;
	const {
		ensureTelegramConnected,
		onClearChannelState,
		onManualRefresh,
		onSendMessage,
	} = useContext(AppContext);
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);
	const [error, setError] = useState("");
	const [sentMessages, setSentMessages] = useState<FeedItem[]>([]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	async function handleSend() {
		const next = draft.trim();
		if (next === "" || isSending) return;
		const now = Math.floor(Date.now() / 1000);
		const optimisticMessage: FeedItem =
			item.type === "dm"
				? {
						id: `sent-${Date.now()}`,
						type: "dm",
						channelKey: item.channelKey,
						chatName: item.chatName,
						senderName: "You",
						timestamp: "Just now",
						date: now,
						text: next,
						commentsCount: 0,
						reactions: [],
						isFocused: false,
					}
				: {
						id: `sent-${Date.now()}`,
						type: "group",
						channelKey: item.channelKey,
						chatName: item.chatName,
						senderName: "You",
						timestamp: "Just now",
						date: now,
						text: next,
						commentsCount: 0,
						isFocused: false,
					};
		setIsSending(true);
		setError("");
		setSentMessages((current) => [...current, optimisticMessage]);
		try {
			const sentMessage = await onSendMessage(item, next);
			if (sentMessage) {
				setSentMessages((current) =>
					current.map((message) =>
						message.id === optimisticMessage.id ? sentMessage : message,
					),
				);
			}
			setDraft("");
		} catch {
			setSentMessages((current) =>
				current.filter((message) => message.id !== optimisticMessage.id),
			);
			setError("Could not send message.");
		} finally {
			setIsSending(false);
		}
	}

	async function handleLeave() {
		if (isLeaving || !window.confirm(`Leave ${title}?`)) return;
		setIsLeaving(true);
		setError("");
		try {
			await leaveFeedChannel(item, ensureTelegramConnected);
			onClearChannelState?.(item.channelKey ?? "");
			await Promise.resolve(onManualRefresh());
			onClose();
		} catch {
			setError("Could not leave chat.");
		} finally {
			setIsLeaving(false);
		}
	}

	const menuItems = [
		{
			key: "leave",
			label: isLeaving ? "Leaving..." : "Leave",
			danger: true,
			disabled: isLeaving,
			onClick: () => {
				void handleLeave();
			},
		},
	];

	return (
		<Drawer
			open
			onClose={onClose}
			placement="right"
			width={Math.min(560, window.innerWidth)}
			title={
				<Flex align="center" justify="space-between">
					<Typography.Text strong>{title}</Typography.Text>
					<Dropdown menu={{ items: menuItems }} trigger={["click"]}>
						<Button
							type="text"
							icon={<EllipsisOutlined aria-hidden style={{ fontSize: 16 }} />}
							aria-label="More actions"
						/>
					</Dropdown>
				</Flex>
			}
			closable
			styles={{
				body: { padding: 0, display: "flex", flexDirection: "column" },
				header: { borderBottom: `1px solid ${token.colorBorder}` },
			}}
			footer={
				<Flex vertical gap={8}>
					{error !== "" && <Alert message={error} type="error" showIcon />}
					<Flex gap={8}>
						<Input
							placeholder="Write a reply..."
							aria-label="Write a reply"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									void handleSend();
								}
							}}
							disabled={isSending}
							size="large"
						/>
						<Button
							type="primary"
							onClick={() => void handleSend()}
							disabled={isSending || draft.trim() === ""}
							loading={isSending}
							size="large"
							icon={
								!isSending && (
									<SendOutlined aria-hidden style={{ fontSize: 18 }} />
								)
							}
						>
							{isSending ? "Sending..." : "Send"}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
				<ChatThread item={item} sentMessages={sentMessages} />
			</div>
		</Drawer>
	);
}
