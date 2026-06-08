import { ConfigProvider, theme } from "antd";
import { createStore, Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";
import { isLoadingFeedAtom } from "../atoms/app.atom";
import { feedItemsAtom } from "../atoms/feedItems.atom";
import { FONT_SIZE_PX } from "../atoms/fontSize.atom";
import type { AppContextType } from "../domains/app/AppContext";
import { AppContext } from "../domains/app/AppContext";
import type { Dal } from "../domains/dal/types";
import type { EnsureTelegramConnected } from "../domains/auth/model/authTypes";
import type { FeedItem } from "../types";

// Mirrors the design tokens defined in src/main.tsx so stories render exactly
// like the real application shell.
const defaultTokens = {
	borderRadius: 0,
	colorBgBase: "#F8F9FA",
	colorError: "#7c6262",
	colorInfo: "#6C757D",
	colorLink: "#212529",
	colorPrimary: "#495057",
	colorSuccess: "#212529",
	colorTextBase: "#131416",
	colorWarning: "#7c7b5c",
};

const noop = async () => undefined;

export const mockDal: Dal = {
	getSession: noop,
	setSession: async () => undefined,
	getNotificationSettings: noop,
	setNotificationSettings: async () => undefined,
	getFeedFilterSettings: noop,
	setFeedFilterSettings: async () => undefined,
	getAvatarVisibilitySettings: noop,
	setAvatarVisibilitySettings: async () => undefined,
	getFontSizeSettings: noop,
	setFontSizeSettings: async () => undefined,
	getFeedCache: noop,
	setFeedCache: async () => undefined,
	getMedia: async () => undefined,
	setMedia: async () => undefined,
	clearCache: async () => undefined,
};

const ensureTelegramConnected: EnsureTelegramConnected = () => {
	throw new Error("ensureTelegramConnected is not available in Storybook");
};

export function createMockAppContext(
	overrides: Partial<AppContextType> = {},
): AppContextType {
	return {
		onManualRefresh: () => undefined,
		onManualLoadOlder: () => undefined,
		isLoadingOlder: false,
		onSendMessage: async () => undefined,
		onVotePoll: async () => undefined,
		ensureTelegramConnected,
		avatarVisibility: { feed: true, thread: true, notifications: true },
		onSetAvatarVisibility: () => undefined,
		fontSize: { size: "medium" },
		onSetFontSize: () => undefined,
		onToggleChannelNotification: () => undefined,
		onToggleChannelFilter: () => undefined,
		onClearChannelState: () => undefined,
		onRequestNotificationPermission: () => undefined,
		onDisableNotifications: () => undefined,
		onEnableAllFeedFilters: () => undefined,
		onLogout: () => undefined,
		dal: mockDal,
		...overrides,
	};
}

function HydrateFeed({
	items,
	children,
}: {
	items: FeedItem[];
	children: ReactNode;
}) {
	useHydrateAtoms([
		[feedItemsAtom, items],
		[isLoadingFeedAtom, false],
	]);
	return children;
}

type MockAppProviderProps = {
	items?: FeedItem[];
	dark?: boolean;
	context?: Partial<AppContextType>;
	children: ReactNode;
};

/**
 * Wraps children in the same theme + state shell the real app uses, with a
 * fresh Jotai store hydrated from mock data and a fully stubbed AppContext.
 */
export function MockAppProvider({
	items = [],
	dark = false,
	context,
	children,
}: MockAppProviderProps) {
	const store = createStore();

	return (
		<Provider store={store}>
			<ConfigProvider
				theme={{
					algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
					token: {
						...defaultTokens,
						fontSize: FONT_SIZE_PX.medium,
						fontFamily:
							"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
					},
				}}
			>
				<HydrateFeed items={items}>
					<AppContext.Provider value={createMockAppContext(context)}>
						{children}
					</AppContext.Provider>
				</HydrateFeed>
			</ConfigProvider>
		</Provider>
	);
}
