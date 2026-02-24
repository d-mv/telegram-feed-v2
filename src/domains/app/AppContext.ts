import { as } from "@mv-d/toolbelt";
import { createContext } from "use-context-selector";
import type { FeedItem } from "../feed/model/mockFeed";

type AppContextType = {
  items?: FeedItem[];
  notificationSettings: Record<string, boolean>;
  hasEnabledNotifications: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
};

export const AppContext = createContext<AppContextType>(as<AppContextType>({}));

AppContext.displayName = "AppContext";
