export const DEFAULT_UPDATE_INTERVAL_MS = 15 * 60 * 1000;
export const DEFAULT_EVENT_THROTTLE_MS = 60 * 1000;

type EventTargetLike = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener" | "dispatchEvent"
>;

type Options = {
  updateIntervalMs?: number;
  eventThrottleMs?: number;
  serviceWorker?: EventTargetLike;
  documentTarget?: Document;
  windowTarget?: Window;
};

export function attachServiceWorkerAutoUpdate(
  registration: ServiceWorkerRegistration,
  options: Options = {},
) {
  const serviceWorker = options.serviceWorker ?? navigator.serviceWorker;
  const documentTarget = options.documentTarget ?? document;
  const windowTarget = options.windowTarget ?? window;
  const updateIntervalMs = options.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS;
  const eventThrottleMs = options.eventThrottleMs ?? DEFAULT_EVENT_THROTTLE_MS;

  let hasRefreshed = false;
  let lastCheckAt = 0;
  let inFlightUpdate: Promise<void> | null = null;

  const requestSkipWaiting = () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const checkForUpdates = () => {
    if (inFlightUpdate) {
      return inFlightUpdate;
    }

    const now = Date.now();
    if (lastCheckAt && now - lastCheckAt < eventThrottleMs) {
      return Promise.resolve();
    }

    lastCheckAt = now;
    inFlightUpdate = registration
      .update()
      .then(() => {
        requestSkipWaiting();
      })
      .catch(() => {})
      .finally(() => {
        inFlightUpdate = null;
      });

    return inFlightUpdate;
  };

  const handleUpdateFound = () => {
    const nextWorker = registration.installing;
    if (!nextWorker) {
      return;
    }
    nextWorker.addEventListener("statechange", () => {
      if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
        nextWorker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  };

  const handleControllerChange = () => {
    if (hasRefreshed) {
      return;
    }
    hasRefreshed = true;
    windowTarget.location.reload();
  };

  const handleVisibilityChange = () => {
    if (documentTarget.visibilityState === "visible") {
      void checkForUpdates();
    }
  };

  const handlePageShow = () => {
    void checkForUpdates();
  };

  requestSkipWaiting();
  registration.addEventListener("updatefound", handleUpdateFound);
  serviceWorker.addEventListener("controllerchange", handleControllerChange);

  const intervalId = windowTarget.setInterval(() => {
    void checkForUpdates();
  }, updateIntervalMs);

  documentTarget.addEventListener("visibilitychange", handleVisibilityChange);
  windowTarget.addEventListener("pageshow", handlePageShow);

  void checkForUpdates();

  return () => {
    registration.removeEventListener("updatefound", handleUpdateFound);
    serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    windowTarget.clearInterval(intervalId);
    documentTarget.removeEventListener("visibilitychange", handleVisibilityChange);
    windowTarget.removeEventListener("pageshow", handlePageShow);
  };
}
