import { Button, Flex, Input, List, Spin, Tag, Typography } from "antd";
import { useSetAtom } from "jotai/react";
import { useContext, useEffect, useState } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { pushToastAtom } from "../../../atoms/toasts.atom";
import { resolveTelegramFeedItem } from "../../app/resolveTelegramFeedItem";
import { AppContext } from "../../app/AppContext";
import {
	joinInviteLink,
	joinSearchResult,
	previewInviteLink,
} from "../../search/infra/telegramMembership";
import { searchTelegram } from "../../search/infra/telegramSearch";
import { confirmAsync } from "../../../shared/ui/confirmAsync";
import type {
	SearchChatTarget,
	SearchResult,
} from "../../search/model/searchTypes";
import { MenuDialog } from "./MenuDialog";
import { SearchOutlined } from "@ant-design/icons";

function getResultKindLabel(result: SearchResult) {
	switch (result.kind) {
		case "direct":
			return "Direct";
		case "group":
			return "Group";
		case "channel":
			return "Channel";
		case "message":
			return "Message";
	}
}

function getResultDescription(result: SearchResult) {
	if (result.kind === "message") return result.text || "Open matching message";
	if (result.username) return `@${result.username}`;
	return result.channelKey;
}

export default function SearchDialog() {
	const closeMenu = useSetAtom(closeMenuAtom);
	const setFeedItems = useSetAtom(feedItemsAtom);
	const setNotificationFocus = useSetAtom(notificationFocusAtom);
	const pushToast = useSetAtom(pushToastAtom);
	const { ensureTelegramConnected, onManualRefresh } = useContext(AppContext);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [invitePreview, setInvitePreview] =
		useState<Awaited<ReturnType<typeof previewInviteLink>>>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed === "") {
			setResults([]);
			setError("");
			setIsLoading(false);
			return;
		}

		let isActive = true;
		setIsLoading(true);
		setError("");
		setInvitePreview(null);

		previewInviteLink(trimmed, ensureTelegramConnected)
			.then((preview) => {
				if (!isActive) return;
				if (preview) {
					setResults([]);
					setInvitePreview(preview);
					return;
				}
				return searchTelegram(trimmed, ensureTelegramConnected).then(
					(nextResults) => {
						if (isActive) setResults(nextResults);
					},
				);
			})
			.catch(() => {
				if (isActive) {
					setResults([]);
					setInvitePreview(null);
					setError("Search failed.");
				}
			})
			.finally(() => {
				if (isActive) setIsLoading(false);
			});

		return () => {
			isActive = false;
		};
	}, [ensureTelegramConnected, query]);

	async function handleSelect(result: SearchResult) {
		try {
			let entity = result.entity;
			if (!result.isJoined && result.kind !== "direct") {
				if (!(await confirmAsync(`Join ${result.title}?`))) return;
				entity = await joinSearchResult(
					result as SearchChatTarget,
					ensureTelegramConnected,
				);
				await Promise.resolve(onManualRefresh());
			}
			const item = await resolveTelegramFeedItem(
				entity,
				ensureTelegramConnected,
				result.kind === "message" ? result.messageId : undefined,
			);
			setFeedItems((currentItems) =>
				currentItems.some((entry) => entry.id === item.id)
					? currentItems
					: [item, ...currentItems],
			);
			setNotificationFocus({
				channelKey: item.channelKey,
				itemId: item.id,
				view: "thread",
			});
			closeMenu();
		} catch {
			pushToast("Unsupported link.");
		}
	}

	async function handleInviteAction() {
		if (!invitePreview) return;
		try {
			let entity = invitePreview.entity;
			if (!invitePreview.isJoined) {
				if (!(await confirmAsync(`Join ${invitePreview.title}?`))) return;
				entity = await joinInviteLink(query.trim(), ensureTelegramConnected);
				await Promise.resolve(onManualRefresh());
			}
			const item = await resolveTelegramFeedItem(
				entity,
				ensureTelegramConnected,
			);
			setFeedItems((currentItems) =>
				currentItems.some((entry) => entry.id === item.id)
					? currentItems
					: [item, ...currentItems],
			);
			setNotificationFocus({
				channelKey: item.channelKey,
				itemId: item.id,
				view: "thread",
			});
			closeMenu();
		} catch {
			pushToast("Unsupported link.");
		}
	}

	return (
		<MenuDialog title="Search" onClose={closeMenu}>
			<Flex vertical gap={12}>
				<Input
					id="menu-search-query"
					aria-label="Search Telegram"
					placeholder="Search channels and messages"
					autoComplete="off"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					allowClear
					prefix={
						<SearchOutlined
							aria-hidden
							style={{
								fontSize: 16,
								color: "var(--ant-color-text-description)",
								marginRight: 4,
							}}
						/>
					}
					style={{ padding: "8px 12px" }}
				/>
				{isLoading && (
					<Flex justify="center" style={{ padding: 16 }}>
						<Spin size="small" />
					</Flex>
				)}
				{error && <Typography.Text type="danger">{error}</Typography.Text>}
				{!isLoading &&
					!error &&
					!invitePreview &&
					query.trim() !== "" &&
					results.length === 0 && (
						<Typography.Text type="secondary">No results.</Typography.Text>
					)}
				{query.trim() === "" && (
					<Typography.Text type="secondary">
						Search results will appear here.
					</Typography.Text>
				)}
				{invitePreview && (
					<Flex
						vertical
						gap={6}
						style={{
							padding: "10px 12px",
							border: "1px solid var(--ant-color-border)",
							borderRadius: 8,
						}}
					>
						<Typography.Text strong>{invitePreview.title}</Typography.Text>
						<Typography.Text type="secondary">
							{invitePreview.kind === "channel" ? "Channel" : "Group"} ·{" "}
							{invitePreview.participantsCount} members
						</Typography.Text>
						<Button type="primary" onClick={() => void handleInviteAction()}>
							{invitePreview.isJoined ? "Open" : "Join"}
						</Button>
					</Flex>
				)}
				{results.length > 0 && (
					<List
						size="small"
						dataSource={results}
						renderItem={(result) => (
							<List.Item
								key={`${result.kind}:${result.id}`}
								style={{ cursor: "pointer" }}
								onClick={() => {
									void handleSelect(result);
								}}
								extra={
									<Button
										size="small"
										type={
											result.isJoined || result.kind === "direct"
												? "default"
												: "primary"
										}
										aria-label={`${result.isJoined || result.kind === "direct" ? "Open" : "Join"} ${result.title}`}
									>
										{result.isJoined || result.kind === "direct"
											? "Open"
											: "Join"}
									</Button>
								}
							>
								<List.Item.Meta
									title={
										<Flex align="center" gap={6}>
											<span>{result.title}</span>
											<Tag>{getResultKindLabel(result)}</Tag>
										</Flex>
									}
									description={
										<Typography.Text type="secondary" style={{ fontSize: 12 }}>
											{getResultDescription(result)}
										</Typography.Text>
									}
								/>
							</List.Item>
						)}
					/>
				)}
			</Flex>
		</MenuDialog>
	);
}
