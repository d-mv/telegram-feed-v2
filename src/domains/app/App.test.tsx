import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import type { AuthClient } from "../auth/model/authTypes";
import App from "./App";

const createAuthFromEnvMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/infra/authFactory", () => ({
  createAuthFromEnv: createAuthFromEnvMock,
}));

vi.mock("../dal/indexedDbDal", () => ({
  createIndexedDbDal: () => ({
    getSession: vi.fn().mockResolvedValue(undefined),
    setSession: vi.fn().mockResolvedValue(undefined),
    getNotificationSettings: vi.fn().mockResolvedValue(undefined),
    setNotificationSettings: vi.fn().mockResolvedValue(undefined),
    getFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
    setFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
    getAvatarVisibilitySettings: vi.fn().mockResolvedValue(undefined),
    setAvatarVisibilitySettings: vi.fn().mockResolvedValue(undefined),
    getFeedCache: vi.fn().mockResolvedValue(undefined),
    setFeedCache: vi.fn().mockResolvedValue(undefined),
    getSaved: vi.fn().mockResolvedValue(undefined),
    setSaved: vi.fn().mockResolvedValue(undefined),
    getDrafts: vi.fn().mockResolvedValue(undefined),
    setDrafts: vi.fn().mockResolvedValue(undefined),
    getMedia: vi.fn().mockResolvedValue(undefined),
    setMedia: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("./AuthenticatedApp", () => ({
  default: () => <h1>Your feed is ready</h1>,
}));

beforeEach(() => {
  const auth: AuthClient = {
    ensureTelegramConnected: vi.fn().mockResolvedValue({
      checkAuthorization: vi.fn().mockResolvedValue(false),
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      addEventHandler: vi.fn(),
      removeEventHandler: vi.fn(),
    } as never),
    sendCode: vi.fn().mockResolvedValue({ ok: true }),
    submitCode: vi.fn().mockResolvedValue({ status: "logged_in" }),
    submitPassword: vi.fn().mockResolvedValue({ status: "logged_in" }),
    requestQrLogin: vi.fn().mockResolvedValue({ status: "pending" }),
    checkQrLogin: vi.fn().mockResolvedValue({ status: "pending" }),
  };
  createAuthFromEnvMock.mockReturnValue(auth);
});

test("renders login view", async () => {
  render(<App />);

  expect(await screen.findByLabelText(/phone/i)).toBeInTheDocument();
});

test("switches to feed after login", async () => {
  const auth: AuthClient = {
    ensureTelegramConnected: vi.fn().mockResolvedValue({} as never),
    sendCode: vi.fn().mockResolvedValue({ ok: true }),
    submitCode: vi.fn().mockResolvedValue({ status: "logged_in" }),
    submitPassword: vi.fn().mockResolvedValue({ status: "logged_in" }),
    requestQrLogin: vi.fn().mockResolvedValue({ status: "pending" }),
    checkQrLogin: vi.fn().mockResolvedValue({ status: "pending" }),
  };
  createAuthFromEnvMock.mockReturnValue(auth);

  const user = userEvent.setup();
  render(<App />);

  const phoneInput = await screen.findByLabelText(/phone/i);
  await user.type(phoneInput, "+123456789");
  await user.click(screen.getByRole("button", { name: /send code/i }));
  await user.type(screen.getByLabelText(/code/i), "12345");
  await user.click(screen.getByRole("button", { name: /submit code/i }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /your feed is ready/i })).toBeInTheDocument();
  });
});
