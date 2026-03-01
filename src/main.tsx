import { Provider } from "jotai/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./domains/app/App.tsx";
import "./index.css";

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

function attachServiceWorkerAutoUpdate(registration: ServiceWorkerRegistration) {
  let hasRefreshed = false;

  const requestSkipWaiting = () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  requestSkipWaiting();

  registration.addEventListener("updatefound", () => {
    const nextWorker = registration.installing;
    if (!nextWorker) {
      return;
    }
    nextWorker.addEventListener("statechange", () => {
      if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
        nextWorker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasRefreshed) return;
    hasRefreshed = true;
    window.location.reload();
  });

  const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
  window.setInterval(() => {
    registration.update().catch(() => {});
  }, UPDATE_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      registration.update().catch(() => {});
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          attachServiceWorkerAutoUpdate(registration);
        })
        .catch((error: unknown) => console.error("Service worker registration failed", error));
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
