import { as } from "@mv-d/toolbelt";
import { createContext } from "react";
import type { Dal } from "../dal/types";

type AppContextType = {
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
  dal: Dal;
};

export const AppContext = createContext<AppContextType>(as<AppContextType>({}));

AppContext.displayName = "AppContext";
