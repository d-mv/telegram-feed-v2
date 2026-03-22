import { Provider, useAtomValue } from "jotai/react";
import { createStore } from "jotai/vanilla";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { notificationFocusAtom } from "../../atoms/notificationFocus.atom";
import { toastsAtom } from "../../atoms/toasts.atom";
import { ToastViewport } from "../../shared/ui/Toast/ToastViewport";
import { useNotificationFocus } from "./useNotificationFocus";

function FocusProbe() {
  const focus = useAtomValue(notificationFocusAtom);
  return <div data-testid="focus">{focus ? JSON.stringify(focus) : ""}</div>;
}

function expectFocusToEqual(expected: Record<string, string>) {
  const raw = screen.getByTestId("focus").textContent;
  expect(raw).toBeTruthy();
  expect(JSON.parse(raw ?? "{}")).toEqual(expected);
}

function renderHookAt(url: string, options: { isAuthenticated?: boolean } = {}) {
  const store = createStore();
  store.set(isAuthenticatedAtom, options.isAuthenticated ?? true);
  store.set(authClientAtom, {
    ensureTelegramConnected: vi.fn().mockResolvedValue({}),
    sendCode: vi.fn(),
    submitCode: vi.fn(),
    submitPassword: vi.fn(),
    requestQrLogin: vi.fn(),
    checkQrLogin: vi.fn(),
  } as never);

  window.history.replaceState({}, "", url);

  function TestHarness() {
    useNotificationFocus();
    return (
      <>
        <FocusProbe />
        <ToastViewport />
      </>
    );
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <TestHarness />
      </Provider>,
    ),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

test("opens a channel thread from /open route", async () => {
  renderHookAt("/open?channel=group:42");

  await waitFor(() => {
    expectFocusToEqual({ channelKey: "group:42", view: "thread" });
  });
  expect(window.location.pathname).toBe("/");
  expect(window.location.search).toBe("");
});

test("opens a specific thread item from /thread route", async () => {
  renderHookAt("/thread?channel=dm:7&itemId=dm-7-101");

  await waitFor(() => {
    expectFocusToEqual({ channelKey: "dm:7", itemId: "dm-7-101", view: "thread" });
  });
  expect(window.location.pathname).toBe("/");
  expect(window.location.search).toBe("");
});

test("keeps notification focus query params working", async () => {
  renderHookAt("/?focusChannelKey=group:5&focusItemId=group-5-11");

  await waitFor(() => {
    expectFocusToEqual({ channelKey: "group:5", itemId: "group-5-11", view: "feed" });
  });
  expect(window.location.search).toBe("");
});

test("shows a toast and does not route when unauthenticated", async () => {
  renderHookAt("/open?channel=group:42", { isAuthenticated: false });

  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("Open links after logging in.");
  });
  expect(screen.getByTestId("focus")).toHaveTextContent("");
  expect(window.location.pathname).toBe("/");
  expect(window.location.search).toBe("");
});

test("shows a toast for unsupported incoming links", async () => {
  renderHookAt("/?url=https%3A%2F%2Fexample.com%2Ffoo");

  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("Unsupported link.");
  });
  expect(screen.getByTestId("focus")).toHaveTextContent("");
  expect(window.location.search).toBe("");
});

test("registers a protocol handler when supported", async () => {
  const registerProtocolHandler = vi.fn();
  Object.defineProperty(window.navigator, "registerProtocolHandler", {
    configurable: true,
    value: registerProtocolHandler,
  });

  renderHookAt("/");

  await waitFor(() => {
    expect(registerProtocolHandler).toHaveBeenCalledWith("web+tgfeed", "/?url=%s");
  });
});

test("toast viewport renders the latest toast message", () => {
  const store = createStore();
  store.set(toastsAtom, [{ id: "toast-1", message: "Unsupported link." }]);

  render(
    <Provider store={store}>
      <ToastViewport />
    </Provider>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Unsupported link.");
});
