import { ConfigProvider, theme } from "antd";
import { Provider } from "jotai/react";
import { useAtomValue } from "jotai/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FONT_SIZE_PX, fontSizeAtom } from "./atoms/fontSize.atom";
import App from "./domains/app/App.tsx";
import "./index.css";
import { runtimeLogger } from "./shared/infra/runtimeLogger";
import { attachServiceWorkerAutoUpdate } from "./serviceWorkerAutoUpdate";

function GlobalStyles() {
	const { token } = theme.useToken();

	useEffect(() => {
		document.body.style.background = token.colorBgLayout;
		document.body.style.color = token.colorText;
	}, [token.colorBgLayout, token.colorText]);

	return null;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [isDark, setIsDark] = useState(
		() => window.matchMedia("(prefers-color-scheme: dark)").matches,
	);
	const fontSize = useAtomValue(fontSizeAtom);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return (
		<ConfigProvider
			theme={{
				algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
				token: {
					fontSize: FONT_SIZE_PX[fontSize.size],
					fontFamily:
						"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
				},
			}}
		>
			<GlobalStyles />
			{children}
		</ConfigProvider>
	);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<Provider>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</Provider>
	</StrictMode>,
);

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		if (import.meta.env.PROD) {
			navigator.serviceWorker
				.register(`${import.meta.env.BASE_URL}sw.js`)
				.then((registration) => {
					attachServiceWorkerAutoUpdate(registration);
				})
				.catch((error: unknown) =>
					runtimeLogger.error("Service worker registration failed", error),
				);
			return;
		}

		navigator.serviceWorker
			.getRegistrations()
			.then((registrations) => {
				registrations.forEach((registration) => {
					void registration.unregister();
				});
			})
			.catch(() => {});
	});
}
