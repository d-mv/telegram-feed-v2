import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { isAppLoadingAtom } from "../../atoms/app.atom";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { ensureTelegramConnected } from "../auth/infra/telegramAuth";

export function useTelegram() {
  const authClient = useAtomValue(authClientAtom);
  const [isAuthenticated, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  const setIsAppLoading = useSetAtom(isAppLoadingAtom);
  const [cancelled, setCancelled] = useState(false);

  const checkAuthorization = useCallback(async () => {
    try {
      const client = await ensureTelegramConnected();

      const authorized = await client.checkAuthorization();

      if (!cancelled && authorized) setIsAuthenticated(true);
    } catch {
      //  log error
    } finally {
      setIsAppLoading(false);
    }
  }, [authClient, isAuthenticated]);

  useEffect(() => {
    if (!authClient || isAuthenticated) return;

    checkAuthorization();

    return () => {
      setCancelled(true);
    };
  }, [authClient, isAuthenticated]);
}
