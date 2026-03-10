import { useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { authClientAtom, isAuthLoadingAtom } from "../../atoms/auth.atom";
import type { Dal } from "../dal/types";

export function useAuthentication({ dal }: { dal: Dal }) {
  const setAuthClient = useSetAtom(authClientAtom);
  const setIsAuthLoading = useSetAtom(isAuthLoadingAtom);

  const authenticate = useCallback(async () => {
    try {
      const { createAuthFromEnv } = await import("../auth/infra/authFactory");
      const session = await dal.getSession();
      const sessionValue = typeof session === "string" ? session : undefined;
      const client = createAuthFromEnv(import.meta.env, {
        session: sessionValue,
        onSession: (nextSession) => {
          dal.setSession(nextSession).catch(() => {});
        },
      });
      setAuthClient(client);
    } catch {
      const { createAuthFromEnv } = await import("../auth/infra/authFactory");
      const client = createAuthFromEnv(import.meta.env, {
        onSession: (nextSession) => {
          dal.setSession(nextSession).catch(() => {});
        },
      });
      setAuthClient(client);
    } finally {
      setIsAuthLoading(false);
    }
  }, [dal, setIsAuthLoading, setAuthClient]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);
}
