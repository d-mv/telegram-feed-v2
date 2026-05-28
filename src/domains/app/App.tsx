import { useAtom, useAtomValue } from "jotai/react";
import { lazy, Suspense, useMemo } from "react";
import { isAppLoadingAtom } from "../../atoms/app.atom";
import {
	authClientAtom,
	isAuthenticatedAtom,
	isAuthLoadingAtom,
} from "../../atoms/auth.atom";
import { LoginView } from "../auth/ui/LoginView";
import { createIndexedDbDal } from "../dal/indexedDbDal";
import { ToastViewport } from "../../shared/ui/Toast/ToastViewport";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Message } from "./components/Message";
import { useAuthentication } from "./useAuthentication";
import { useNotificationFocus } from "./useNotificationFocus";
import { useTelegram } from "./useTelegram";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

export default function App() {
	const [isAuthenticated, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
	const authClient = useAtomValue(authClientAtom);
	const isAppLoading = useAtomValue(isAppLoadingAtom);
	const isAuthLoading = useAtomValue(isAuthLoadingAtom);

	const dal = useMemo(() => createIndexedDbDal(), []);

	useTelegram();
	useAuthentication({ dal });
	useNotificationFocus();

	if (isAppLoading) return <Message>Loading...</Message>;

	if (isAuthLoading || !authClient)
		return <Message>Preparing session...</Message>;

	if (isAuthenticated) {
		return (
			<>
				<ErrorBoundary>
					<Suspense fallback={<Message>Loading feed...</Message>}>
						<AuthenticatedApp dal={dal} />
					</Suspense>
				</ErrorBoundary>
				<ToastViewport />
			</>
		);
	}

	return (
		<>
			<LoginView
				auth={authClient}
				onAuthenticated={() => setIsAuthenticated(true)}
			/>
			<ToastViewport />
		</>
	);
}
