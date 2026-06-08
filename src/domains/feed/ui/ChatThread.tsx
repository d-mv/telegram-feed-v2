import { Spin, theme, Typography } from "antd";
import type { CSSProperties } from "react";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Api } from "telegram";
import { CommentsIcon } from "../../../shared/ui/CommentsIcon/CommentsIcon";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import type { FeedItem } from "../../../types";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { AppContext } from "../../app/AppContext";
import {
	getMediaPreview,
	getPollPreview,
	getMessageCommentsCount,
	getReplyToId,
	mergeAlbumFeedItems,
	toRelativeTime,
} from "../infra/telegramFeed";
import { resolveFeedItemSourceMessage } from "../infra/resolveFeedItemSourceMessage";
import { groupConsecutiveMediaOnlyItems } from "./groupConsecutiveMediaOnlyItems";
import { getImageGridColumns } from "./mediaGroupUtils";
import { ForwardedBadge } from "./ForwardedBadge";
import { Poll } from "./components/Poll";
import { ScrollTopButton } from "./ScrollTopButton";

type ChatThreadProps = {
	item: FeedItem;
	sentMessages?: FeedItem[];
};

type ThreadComment = {
	id: string;
	senderName: string;
	text: string;
	timestamp: string;
};

function getGalleryItems(item: FeedItem): FeedItem[] {
	if (!item.mediaItems || item.mediaItems.length <= 1) {
		return [];
	}
	return item.mediaItems.map((media, index) => ({
		...item,
		id: `${item.id}:media:${index}`,
		media,
		mediaItems: undefined,
	}));
}

function getGroupedGalleryItems(items: FeedItem[]): FeedItem[] {
	return items.flatMap((item) => {
		const galleryItems = getGalleryItems(item);
		if (galleryItems.length > 1) {
			return galleryItems;
		}
		return [item];
	});
}

function getSenderLabel(message: Api.Message, fallback: string) {
	const sender = (message as Api.Message & { sender?: unknown }).sender;
	if (sender && typeof sender === "object") {
		if ("title" in sender && typeof sender.title === "string") {
			return sender.title;
		}
		if ("firstName" in sender && typeof sender.firstName === "string") {
			const lastName =
				"lastName" in sender && typeof sender.lastName === "string"
					? sender.lastName
					: "";
			return `${sender.firstName} ${lastName}`.trim();
		}
		if ("username" in sender && typeof sender.username === "string") {
			return sender.username;
		}
	}
	return fallback;
}

export function ChatThread({ item, sentMessages = [] }: ChatThreadProps) {
	const { token } = theme.useToken();
	const { ensureTelegramConnected } = useContext(AppContext);
	const channelItemsAtom = useMemo(
		() =>
			selectAtom(
				feedItemsAtom,
				(items) =>
					items.filter(
						(fi) =>
							fi.channelKey !== undefined && fi.channelKey === item.channelKey,
					),
				(a, b) => a.length === b.length && a.every((fi, i) => fi === b[i]),
			),
		[item.channelKey],
	);
	const channelFeedItems = useAtomValue(channelItemsAtom);

	const initialMessages = useMemo(() => {
		const items = channelFeedItems.some((fi) => fi.id === item.id)
			? channelFeedItems.map((fi) =>
					fi.id === item.id
						? { ...fi, isFocused: true }
						: { ...fi, isFocused: false },
				)
			: [
					...channelFeedItems.map((fi) => ({ ...fi, isFocused: false })),
					{ ...item, isFocused: true },
				];

		return mergeAlbumFeedItems(
			items.sort((a, b) => (a.date ?? 0) - (b.date ?? 0)),
		);
	}, [channelFeedItems, item]);

	const [messages, setMessages] = useState<FeedItem[]>(initialMessages);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [showJump, setShowJump] = useState(false);
	const [commentsByMessage, setCommentsByMessage] = useState<
		Record<string, ThreadComment[]>
	>({});
	const [commentsLoading, setCommentsLoading] = useState<
		Record<string, boolean>
	>({});
	const focusedRef = useRef<HTMLDivElement | null>(null);
	const threadRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setMessages((current) => {
			const seen = new Set(current.map((m) => m.id));
			const newlyArrived = initialMessages.filter((m) => !seen.has(m.id));
			if (newlyArrived.length === 0) return current;

			const combined = [...current, ...newlyArrived];
			return mergeAlbumFeedItems(
				combined.sort((a, b) => (a.date ?? 0) - (b.date ?? 0)),
			);
		});
	}, [initialMessages]);

	const loadHistory = useCallback(
		async (direction: "older" | "newer") => {
			if (isLoading || !item.channelKey) return;

			setIsLoading(true);
			setError("");
			try {
				const client = await ensureTelegramConnected();
				const pivotItem =
					direction === "older" ? messages[0] : messages[messages.length - 1];
				const sourceMessage = await resolveFeedItemSourceMessage(
					pivotItem,
					client,
				);

				if (!sourceMessage) {
					throw new Error("Could not find pivot message");
				}

				const inputChat = sourceMessage.getInputChat
					? await sourceMessage.getInputChat()
					: (sourceMessage as Api.Message & { inputChat?: unknown }).inputChat;

				const history = await client.getMessages(inputChat ?? undefined, {
					limit: 20,
					offsetId: sourceMessage.id,
					addOffset: direction === "older" ? 0 : -20,
				});

				const normalized = history
					.filter(
						(message): message is Api.Message => message instanceof Api.Message,
					)
					.map((message) => {
						const senderName = getSenderLabel(message, item.chatName);
						const timestamp = toRelativeTime(message.date);
						return {
							id: String(message.id),
							senderName,
							senderId: (message.senderId || message.peerId)?.toString(),
							text: message.message ?? "",
							timestamp,
							date: message.date,
							media: getMediaPreview(message),
							poll: getPollPreview(message),
							commentsCount: getMessageCommentsCount(message),
							sourceMessage: message,
							type: message.toId instanceof Api.PeerUser ? "dm" : "group",
							chatName:
								message.toId instanceof Api.PeerUser
									? senderName
									: item.chatName,
							isFocused: false,
						} as FeedItem;
					});

				const container = threadRef.current;
				const previousScrollHeight = container?.scrollHeight ?? 0;
				const previousScrollTop = container?.scrollTop ?? 0;

				setMessages((current) => {
					const next =
						direction === "older"
							? [...normalized, ...current]
							: [...current, ...normalized];
					const seen = new Set<string>();
					const unique = next.filter((m) => {
						if (seen.has(m.id)) return false;
						seen.add(m.id);
						return true;
					});
					return mergeAlbumFeedItems(
						unique.sort((a, b) => (a.date ?? 0) - (b.date ?? 0)),
					);
				});

				if (direction === "older" && container) {
					requestAnimationFrame(() => {
						const currentScrollHeight = container.scrollHeight;
						container.scrollTop =
							previousScrollTop + (currentScrollHeight - previousScrollHeight);
					});
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load history");
			} finally {
				setIsLoading(false);
			}
		},
		[
			ensureTelegramConnected,
			isLoading,
			item.channelKey,
			item.chatName,
			messages,
		],
	);

	const topSentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const container = threadRef.current;
		const sentinel = topSentinelRef.current;
		if (!sentinel || !container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !isLoading) {
					void loadHistory("older");
				}
			},
			{ root: container, threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [loadHistory, isLoading]);

	const initialScrollDoneRef = useRef(false);

	useEffect(() => {
		initialScrollDoneRef.current = false;
	}, [item.id]);

	useEffect(() => {
		if (!focusedRef.current || initialScrollDoneRef.current) return;

		const node = focusedRef.current;
		node.scrollIntoView({ block: "center" });
		node.focus({ preventScroll: true });
		initialScrollDoneRef.current = true;
	}, [messages]);

	useEffect(() => {
		const focused = messages.find((m) => m.isFocused);
		if (focused && (focused.commentsCount ?? 0) > 0) {
			void loadComments(focused);
		}
	}, [messages, commentsByMessage, commentsLoading]);

	const handleScroll = useCallback(() => {
		const container = threadRef.current;

		if (!container) return;

		const remaining =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		setShowJump(remaining > 80);
	}, []);

	useEffect(() => {
		const container = threadRef.current;

		if (!container) return;

		handleScroll();

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	function handleJumpToLatest() {
		const container = threadRef.current;
		if (!container) {
			return;
		}
		container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
	}

	async function loadComments(message: FeedItem) {
		if (commentsByMessage[message.id] || commentsLoading[message.id]) {
			return;
		}
		setCommentsLoading((current) => ({ ...current, [message.id]: true }));
		try {
			const client = await ensureTelegramConnected();
			const source = await resolveFeedItemSourceMessage(message, client);
			if (!source) {
				setCommentsByMessage((current) => ({ ...current, [message.id]: [] }));
				return;
			}
			const inputChat = source.getInputChat
				? await source.getInputChat()
				: (source as Api.Message & { inputChat?: unknown }).inputChat;
			const comments = await client.getMessages(inputChat ?? undefined, {
				limit: 30,
				replyTo: source.id,
			});
			const normalized = comments
				.filter(
					(comment): comment is Api.Message => comment instanceof Api.Message,
				)
				.reverse()
				.map((comment) => ({
					id: String(comment.id),
					senderName: getSenderLabel(comment, message.chatName),
					text: comment.message ?? "",
					timestamp: toRelativeTime(comment.date),
					date: comment.date,
					poll: getPollPreview(comment),
				}));
			setCommentsByMessage((current) => ({
				...current,
				[message.id]: normalized,
			}));
		} catch {
			setCommentsByMessage((current) => ({ ...current, [message.id]: [] }));
		} finally {
			setCommentsLoading((current) => ({ ...current, [message.id]: false }));
		}
	}

	function renderComments(message: FeedItem) {
		if ((message.commentsCount ?? 0) <= 0) {
			return null;
		}

		return (
			<details
				open={message.isFocused}
				style={{ marginTop: 6 }}
				onToggle={(event) => {
					if (event.currentTarget.open) {
						void loadComments(message);
					}
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						listStyle: "none",
						display: "flex",
						alignItems: "center",
						gap: 4,
						opacity: 0.6,
					}}
					aria-label="Comments"
				>
					<CommentsIcon />
				</summary>
				<div
					style={{
						marginTop: 8,
						paddingLeft: 8,
						borderLeft: `2px solid ${token.colorLink}`,
					}}
				>
					{commentsLoading[message.id] && (
						<Typography.Text type="secondary" style={{ fontSize: 12 }}>
							Loading comments...
						</Typography.Text>
					)}
					{!commentsLoading[message.id] &&
						(commentsByMessage[message.id]?.length ?? 0) === 0 && (
							<Typography.Text type="secondary" style={{ fontSize: 12 }}>
								No comments.
							</Typography.Text>
						)}
					{!commentsLoading[message.id] &&
						(commentsByMessage[message.id] ?? []).map((comment) => (
							<div key={comment.id} style={{ marginBottom: 8 }}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: 2,
									}}
								>
									<Typography.Text style={{ fontSize: 11 }}>
										{comment.senderName}
									</Typography.Text>
									<Typography.Text
										strong
										type="secondary"
										style={{ fontSize: 12 }}
									>
										{comment.timestamp}
									</Typography.Text>
								</div>
								<Typography.Text style={{ fontSize: 13 }}>
									{comment.text || "…"}
								</Typography.Text>
							</div>
						))}
				</div>
			</details>
		);
	}

	const displayMessages = useMemo(
		() => [...messages, ...sentMessages],
		[messages, sentMessages],
	);
	const messageGroups = useMemo(
		() => groupConsecutiveMediaOnlyItems(displayMessages),
		[displayMessages],
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: messages.length === 0 ? 200 : undefined,
			}}
		>
			{error !== "" && (
				<Typography.Text
					type="danger"
					style={{ padding: "8px 16px", fontSize: 13 }}
				>
					{error}
				</Typography.Text>
			)}
			<div
				ref={threadRef}
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "8px 16px",
					display: "flex",
					flexDirection: "column",
					gap: 12,
				}}
			>
				<div ref={topSentinelRef} style={{ height: 1, flexShrink: 0 }} />
				{isLoading && (
					<Spin
						size="small"
						style={{ alignSelf: "center", padding: "8px 0" }}
					/>
				)}
				{messageGroups.map((group) => {
					const representative = group[0];
					const galleryItems =
						group.length > 1
							? getGroupedGalleryItems(group)
							: getGalleryItems(representative);
					const isGroupedRun = group.length > 1;
					const isGrouped = galleryItems.length > 1;
					const hasGroupedImages =
						isGrouped &&
						galleryItems.every(
							(message) => message.media?.meta.type === "image",
						);
					const imageGridColumns = hasGroupedImages
						? getImageGridColumns(galleryItems.length)
						: undefined;
					const isFocusedGroup = group.some((message) => message.isFocused);

					const replyToId =
						representative.sourceMessage instanceof Api.Message
							? getReplyToId(representative.sourceMessage)
							: undefined;
					const repliedMessage = replyToId
						? messages.find((m) => {
								const source = m.sourceMessage;
								return source instanceof Api.Message && source.id === replyToId;
							})
						: undefined;

					return (
						<div
							key={representative.id}
							ref={isFocusedGroup ? focusedRef : null}
							data-feed-item-id={representative.id}
							style={{
								padding: "10px 12px",
								borderRadius: token.borderRadius,
								background: isFocusedGroup
									? // @ts-ignore
										token.colorMessageBgFocus
									: // @ts-ignore
										token.colorMessageBg,
								outline: "none",
							}}
						>
							<Header isThread message={representative}>
								{representative.senderName}
							</Header>
							<ForwardedBadge sourceMessage={representative.sourceMessage} />
							{repliedMessage && (
								<button
									type="button"
									onClick={() => {
										const selector = `[data-feed-item-id="${repliedMessage.id}"]`;
										const node = threadRef.current?.querySelector(
											selector,
										) as HTMLElement | null;
										node?.scrollIntoView({
											block: "center",
											behavior: "smooth",
										});
									}}
									style={{
										display: "block",
										width: "100%",
										textAlign: "left",
										background: token.colorBgBase,
										border: `1px solid ${token.colorBorder}`,
										borderLeft: `3px solid ${token.colorPrimary}`,
										borderRadius: token.borderRadius,
										padding: "4px 8px",
										marginBottom: 6,
										cursor: "pointer",
									}}
								>
									<Typography.Text style={{ display: "block", fontSize: 12 }}>
										{repliedMessage.senderName}
									</Typography.Text>
									<Typography.Text type="secondary" style={{ fontSize: 14 }}>
										{repliedMessage.text || "Media"}
									</Typography.Text>
								</button>
							)}
							{(!isGroupedRun || representative.text !== "") && (
								<Text sourceMessage={representative.sourceMessage}>
									{representative.text}
								</Text>
							)}
							{representative.poll && <Poll item={representative} />}
							{isGrouped ? (
								<div
									data-media-group-layout={
										hasGroupedImages ? "image-grid" : "stack"
									}
									style={
										hasGroupedImages
											? ({
													display: "grid",
													gridTemplateColumns: `repeat(${imageGridColumns}, 1fr)`,
													gap: 4,
													marginTop: 8,
													"--media-group-columns": String(imageGridColumns),
												} as CSSProperties)
											: {
													display: "flex",
													flexDirection: "column",
													gap: 4,
													marginTop: 8,
												}
									}
								>
									{galleryItems.map((message) => {
										return (
											<div key={message.id} data-media-group-tile="true">
												{message.media && (
													<Media
														item={{
															id: message.id,
															type: item.type,
															chatName: item.chatName,
															senderName: message.senderName || "",
															timestamp: message.timestamp,
															date: message.date ?? 0,
															text: message.text,
															media: message.media,
															reactions: [],
															sourceMessage: message.sourceMessage,
															isFocused: message.isFocused,
														}}
														grayscale={false}
														aspectRatioOverride={
															hasGroupedImages ? "1 / 1" : undefined
														}
													/>
												)}
												{renderComments(message)}
											</div>
										);
									})}
								</div>
							) : (
								<>
									{representative.media && (
										<div style={{ marginTop: 8 }}>
											<Media
												item={{
													id: representative.id,
													type: item.type,
													chatName: item.chatName,
													senderName: representative.senderName || "",
													timestamp: representative.timestamp,
													date: representative.date ?? 0,
													text: representative.text,
													media: representative.media,
													reactions: [],
													sourceMessage: representative.sourceMessage,
													isFocused: representative.isFocused,
												}}
												grayscale={false}
											/>
										</div>
									)}
									{renderComments(representative)}
								</>
							)}
						</div>
					);
				})}
				{showJump && (
					<ScrollTopButton
						onClick={handleJumpToLatest}
						style={{ bottom: 64, right: 24, transform: "rotate(180deg)" }}
					/>
				)}
			</div>
		</div>
	);
}
