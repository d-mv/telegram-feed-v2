import { useAtom, useAtomValue } from "jotai/react";
import { lazy, Suspense, useMemo } from "react";
import { isAppLoadingAtom, isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom, isAuthenticatedAtom, isAuthLoadingAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { Loading } from "../../shared/ui/Loading/Loading";
import type { FeedItem } from "../../types";
import { LoginView } from "../auth/ui/LoginView";
import { createIndexedDbDal } from "../dal/indexedDbDal";
import { sendMessageToFeedItem } from "../feed/infra/telegramFeed";
import { FeedView } from "../feed/ui/FeedView";
import { AppContext } from "./AppContext";
import { Message } from "./components/Message";
import { useAuthentication } from "./useAuthentication";
import { useRefresh } from "./useRefresh";
import { useSettings } from "./useSettings";
import { useTelegram } from "./useTelegram";

const Empty = lazy(() => import("./components/Empty"));

export default function App() {
  const avatarVisibility = useAtomValue(avatarVisibilityAtom);
  const [isAuthenticated, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  const authClient = useAtomValue(authClientAtom);
  const feedItems = useAtomValue(feedItemsAtom);
  const isAppLoading = useAtomValue(isAppLoadingAtom);
  const isAuthLoading = useAtomValue(isAuthLoadingAtom);
  const isFeedLoading = useAtomValue(isLoadingFeedAtom);

  const dal = useMemo(() => createIndexedDbDal(), []);

  useTelegram();
  useAuthentication({ dal });
  const {
    handleSetAvatarVisibility,
    handleEnableAllFeedFilters,
    handleToggleChannelFilter,
    handleDisableNotifications,
    handleRequestNotificationPermission,
    handleToggleChannelNotification,
  } = useSettings({ dal });
  const { refreshFeed, feedError } = useRefresh({ dal });

  async function handleSendMessage(item: FeedItem, text: string) {
    await sendMessageToFeedItem(item, text);
    refreshFeed();
  }

  if (isAppLoading) return <Message>Loading...</Message>;

  if (isAuthLoading || !authClient) return <Message>Preparing session...</Message>;

  if (isAuthenticated) {
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
          onSendMessage: handleSendMessage,
          avatarVisibility,
          onSetAvatarVisibility: handleSetAvatarVisibility,
          onToggleChannelNotification: handleToggleChannelNotification,
          onToggleChannelFilter: handleToggleChannelFilter,
          onRequestNotificationPermission: handleRequestNotificationPermission,
          onDisableNotifications: handleDisableNotifications,
          onEnableAllFeedFilters: handleEnableAllFeedFilters,
        }}
      >
        <FeedView />
      </AppContext.Provider>
    );
  }

  return <LoginView auth={authClient} onAuthenticated={() => setIsAuthenticated(true)} />;
}
