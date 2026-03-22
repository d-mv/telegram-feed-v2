import { Provider } from "jotai/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./domains/app/App.tsx";
import "./index.css";
import { runtimeLogger } from "./shared/infra/runtimeLogger";
import { attachServiceWorkerAutoUpdate } from "./serviceWorkerAutoUpdate";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          attachServiceWorkerAutoUpdate(registration);
        })
        .catch((error: unknown) => runtimeLogger.error("Service worker registration failed", error));
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
