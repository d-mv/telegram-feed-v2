import { createContext } from "react";
import type {
	AvatarVisibilitySettings,
	FeedItem,
	FontSizeSettings,
} from "../../types";
import type { EnsureTelegramConnected } from "../auth/model/authTypes";
import type { Dal } from "../dal/types";

export type AppContextType = {
	onManualRefresh: () => void | Promise<void>;
	onManualLoadOlder: () => void | Promise<void>;
	isLoadingOlder: boolean;
	onSendMessage: (
		item: FeedItem,
		text: string,
	) => Promise<FeedItem | undefined>;
	onVotePoll: (
		item: FeedItem,
		options: Uint8Array[],
	) => Promise<FeedItem | undefined>;
	ensureTelegramConnected: EnsureTelegramConnected;
	avatarVisibility: AvatarVisibilitySettings;
	onSetAvatarVisibility: (next: AvatarVisibilitySettings) => void;
	fontSize: FontSizeSettings;
	onSetFontSize: (next: FontSizeSettings) => void;
	onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
	onToggleChannelFilter: (channelKey: string, enabled: boolean) => void;
	onClearChannelState?: (channelKey: string) => void;
	onRequestNotificationPermission: () => void;
	onDisableNotifications: () => void;
	onEnableAllFeedFilters: () => void;
	onLogout?: () => void | Promise<void>;
	dal: Dal;
};

export const AppContext = createContext<AppContextType>(
	new Proxy({} as AppContextType, {
		get(_, key) {
			throw new Error(
				`AppContext.${String(key)} accessed outside of AppContext.Provider`,
			);
		},
	}),
);

AppContext.displayName = "AppContext";
