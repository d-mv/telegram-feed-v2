import { lazy, Suspense } from "react";
import { useAtomValue } from "jotai/react";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { Loading } from "../../shared/ui/Loading/Loading";
import type { FeedItem } from "../../types";
import type { Dal } from "../dal/types";
import { sendMessageToFeedItem, voteOnPoll } from "../feed/infra/telegramFeed";
import { FeedView } from "../feed/ui/FeedView";
import { AppContext } from "./AppContext";
import { Message } from "./components/Message";
import { useProcessMessages } from "./useProcessMessages";
import { useRefresh } from "./useRefresh";
import { useSettings } from "./useSettings";

const Empty = lazy(() => import("./components/Empty"));

export default function AuthenticatedApp({ dal }: { dal: Dal }) {
	const authClient = useAtomValue(authClientAtom);
	const avatarVisibility = useAtomValue(avatarVisibilityAtom);
	const feedItems = useAtomValue(feedItemsAtom);
	const isFeedLoading = useAtomValue(isLoadingFeedAtom);

	if (!authClient) {
		throw new Error("Telegram auth client not initialized");
	}
	const ensureTelegramConnected = authClient.ensureTelegramConnected;

	useProcessMessages({ dal });
	const {
		handleSetAvatarVisibility,
		handleEnableAllFeedFilters,
		handleToggleChannelFilter,
		handleClearChannelState,
		handleDisableNotifications,
		handleRequestNotificationPermission,
		handleToggleChannelNotification,
	} = useSettings({ dal });
	const { refreshFeed, loadOlder, isLoadingOlder, feedError } = useRefresh({
		dal,
	});

	async function handleSendMessage(item: FeedItem, text: string) {
		const sentMessage = await sendMessageToFeedItem(
			item,
			text,
			ensureTelegramConnected,
		);
		void refreshFeed({ background: true });
		return sentMessage;
	}

	async function handleVotePoll(item: FeedItem, options: Uint8Array[]) {
		const updatedItem = await voteOnPoll(
			item,
			options,
			ensureTelegramConnected,
		);
		void refreshFeed({ background: true });
		return updatedItem;
	}

	if (isFeedLoading) return <Message>Loading feed...</Message>;

	if (feedError) return <Message>Feed error: {feedError}</Message>;

	if (feedItems.length === 0)
		return (
			<Suspense fallback={<Loading />}>
				<Empty />
			</Suspense>
		);

	return (
		<AppContext.Provider
			value={{
				dal,
				onManualRefresh: refreshFeed,
				onManualLoadOlder: loadOlder,
				isLoadingOlder,
				onSendMessage: handleSendMessage,
				onVotePoll: handleVotePoll,
				ensureTelegramConnected,
				avatarVisibility,
				onSetAvatarVisibility: handleSetAvatarVisibility,
				onToggleChannelNotification: handleToggleChannelNotification,
				onToggleChannelFilter: handleToggleChannelFilter,
				onClearChannelState: handleClearChannelState,
				onRequestNotificationPermission: handleRequestNotificationPermission,
				onDisableNotifications: handleDisableNotifications,
				onEnableAllFeedFilters: handleEnableAllFeedFilters,
			}}
		>
			<FeedView />
		</AppContext.Provider>
	);
}
