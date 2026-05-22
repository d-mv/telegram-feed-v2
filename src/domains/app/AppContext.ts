import { createContext } from "react";
import type { AvatarVisibilitySettings, FeedItem } from "../../types";
import type { EnsureTelegramConnected } from "../auth/model/authTypes";
import type { Dal } from "../dal/types";

type AppContextType = {
  onManualRefresh: () => void | Promise<void>;
  onSendMessage: (item: FeedItem, text: string) => Promise<FeedItem | undefined>;
  onVotePoll: (item: FeedItem, options: Uint8Array[]) => Promise<FeedItem | undefined>;
  ensureTelegramConnected: EnsureTelegramConnected;
  avatarVisibility: AvatarVisibilitySettings;
  onSetAvatarVisibility: (next: AvatarVisibilitySettings) => void;
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
  onToggleChannelFilter: (channelKey: string, enabled: boolean) => void;
  onClearChannelState?: (channelKey: string) => void;
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
  onEnableAllFeedFilters: () => void;
  dal: Dal;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

AppContext.displayName = "AppContext";
