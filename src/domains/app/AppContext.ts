import { as } from "@mv-d/toolbelt";
import { createContext } from "react";
import type { AvatarVisibilitySettings, FeedItem } from "../../types";
import type { Dal } from "../dal/types";

type AppContextType = {
  onManualRefresh: () => void;
  onSendMessage: (item: FeedItem, text: string) => Promise<void>;
  avatarVisibility: AvatarVisibilitySettings;
  onSetAvatarVisibility: (next: AvatarVisibilitySettings) => void;
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
  onToggleChannelFilter: (channelKey: string, enabled: boolean) => void;
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
  onEnableAllFeedFilters: () => void;
  dal: Dal;
};

export const AppContext = createContext<AppContextType>(as<AppContextType>({}));

AppContext.displayName = "AppContext";
