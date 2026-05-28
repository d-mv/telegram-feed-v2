import { beforeEach, describe, expect, test, vi } from "vitest";
import { createTelegramAuth } from "./telegramAuth";

const invokeMock = vi.fn();
const connectMock = vi.fn();

const telegramMock = vi.hoisted(() => {
	class SendCode {
		constructor(public args: unknown) {}
	}
	class SignIn {
		constructor(public args: unknown) {}
	}
	class CheckPassword {
		constructor(public args: unknown) {}
	}
	class ExportLoginToken {
		constructor(public args: unknown) {}
	}
	class ImportLoginToken {
		constructor(public args: unknown) {}
	}
	class GetPassword {}
	class CodeSettings {
		constructor(public args: unknown) {}
	}

	class LoginToken {}
	class LoginTokenSuccess {
		authorization?: unknown;
	}
	class Authorization {}
	class LoginTokenMigrateTo {
		dcId = 0;
		token = new Uint8Array();
	}

	class TelegramClient {
		private _connected = false;

		constructor(
			public session: unknown,
			public apiId: number,
			public apiHash: string,
			public options: unknown,
		) {}

		get connected() {
			return this._connected;
		}

		get disconnected() {
			return !this._connected;
		}

		connect = vi.fn(async () => {
			await connectMock();
			this._connected = true;
		});

		disconnect = vi.fn(async () => {
			this._connected = false;
		});

		__setConnected(value: boolean) {
			this._connected = value;
		}

		invoke = invokeMock;
	}

	return {
		Api: {
			auth: {
				SendCode,
				SignIn,
				CheckPassword,
				ExportLoginToken,
				ImportLoginToken,
				LoginToken,
				LoginTokenSuccess,
				LoginTokenMigrateTo,
				Authorization,
			},
			account: {
				GetPassword,
			},
			CodeSettings,
		},
		TelegramClient,
	};
});

vi.mock("telegram", () => telegramMock);

vi.mock("telegram/sessions", () => ({
	StringSession: class StringSession {
		save() {
			return "session-string";
		}
	},
}));

vi.mock("telegram/Password", () => ({
	computeCheck: vi.fn().mockResolvedValue("check"),
}));

describe("telegramAuth", () => {
	beforeEach(() => {
		invokeMock.mockReset();
		connectMock.mockReset();
		connectMock.mockClear();
		connectMock.mockResolvedValue(undefined);
	});

	test("sendCode returns ok when Telegram responds", async () => {
		invokeMock.mockResolvedValueOnce({ phoneCodeHash: "hash", type: {} });
		const auth = createTelegramAuth({ apiId: 1, apiHash: "hash" });

		const result = await auth.sendCode("+123");

		expect(result).toEqual({ ok: true });
		expect(invokeMock).toHaveBeenCalledWith(
			expect.any(telegramMock.Api.auth.SendCode),
		);
	});

	test("submitCode returns needs_2fa with hint when required", async () => {
		invokeMock.mockImplementation(async (request) => {
			if (request instanceof telegramMock.Api.auth.SendCode) {
				return { phoneCodeHash: "hash" };
			}
			if (request instanceof telegramMock.Api.auth.SignIn) {
				throw { errorMessage: "SESSION_PASSWORD_NEEDED" };
			}
			if (request instanceof telegramMock.Api.account.GetPassword) {
				return { hint: "use 2fa" };
			}
			return {};
		});

		const auth = createTelegramAuth({ apiId: 1, apiHash: "hash" });
		await auth.sendCode("+123");

		const result = await auth.submitCode("12345");

		expect(result).toEqual({ status: "needs_2fa", hint: "use 2fa" });
	});

	test("submitPassword logs in and stores session", async () => {
		const onSession = vi.fn();
		invokeMock.mockResolvedValue({});

		const auth = createTelegramAuth({
			apiId: 1,
			apiHash: "hash",
			onSession,
		});

		const result = await auth.submitPassword("secret");

		expect(result).toEqual({ status: "logged_in" });
		expect(onSession).toHaveBeenCalledWith("session-string");
		expect(invokeMock).toHaveBeenCalledWith(
			expect.any(telegramMock.Api.auth.CheckPassword),
		);
	});

	test("auth client exposes a reusable connected telegram client", async () => {
		const auth = createTelegramAuth({ apiId: 1, apiHash: "hash" });

		const first = await auth.ensureTelegramConnected();
		const second = await auth.ensureTelegramConnected();

		expect(first).toBe(second);
		expect(connectMock).toHaveBeenCalledTimes(1);
	});

	test("auth client reconnects after its telegram client disconnects", async () => {
		const auth = createTelegramAuth({ apiId: 1, apiHash: "hash" });

		const client = await auth.ensureTelegramConnected();
		(
			client as unknown as { __setConnected: (value: boolean) => void }
		).__setConnected(false);

		await auth.ensureTelegramConnected();

		expect(connectMock).toHaveBeenCalledTimes(2);
	});

	test("logout disconnects the telegram client", async () => {
		const auth = createTelegramAuth({ apiId: 1, apiHash: "hash" });
		const client = await auth.ensureTelegramConnected();

		await auth.logout();

		const instance = client as unknown as {
			disconnect: ReturnType<typeof vi.fn>;
		};
		expect(instance.disconnect).toHaveBeenCalledTimes(1);
	});
});
