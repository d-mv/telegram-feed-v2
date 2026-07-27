import { useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
	authClientAtom,
	isAuthenticatedAtom,
	isAuthLoadingAtom,
} from "../../atoms/auth.atom";
import type { Dal } from "../dal/types";

export function useAuthentication({ dal }: { dal: Dal }) {
	const setAuthClient = useSetAtom(authClientAtom);
	const setIsAuthLoading = useSetAtom(isAuthLoadingAtom);
	const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);

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
			if (sessionValue) {
				try {
					const authorized = await client.checkSession();
					if (authorized) {
						setIsAuthenticated(true);
					} else {
						// Server explicitly indicated session is not authorized
						await dal.setSession("");
						setIsAuthenticated(false);
					}
				} catch (err) {
					const { isAuthFailureError } = await import(
						"../auth/infra/telegramAuth.utils"
					);
					if (isAuthFailureError(err)) {
						await dal.setSession("");
						setIsAuthenticated(false);
					} else {
						// Network offline or transient MTProto error — preserve offline session
						setIsAuthenticated(true);
					}
				}
			}
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
	}, [dal, setIsAuthLoading, setAuthClient, setIsAuthenticated]);

	useEffect(() => {
		authenticate();
	}, [authenticate]);
}
