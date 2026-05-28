import type { TelegramClient } from "telegram";

export type SendCodeResult = {
	ok: true;
};

export type EnsureTelegramConnected = () => Promise<TelegramClient>;

export type SubmitCodeResult = {
	status: "needs_2fa" | "logged_in";
	hint?: string;
};

export type QrLoginToken = {
	token: Uint8Array;
	expires: number;
	loginUrl: string;
};

export type QrLoginResult =
	| { status: "token"; token: QrLoginToken }
	| { status: "pending" }
	| { status: "needs_2fa"; hint?: string }
	| { status: "logged_in" };

export type SubmitPasswordResult = {
	status: "logged_in";
};

export type AuthClient = {
	checkSession: () => Promise<boolean>;
	sendCode: (phone: string) => Promise<SendCodeResult>;
	submitCode: (code: string) => Promise<SubmitCodeResult>;
	submitPassword: (password: string) => Promise<SubmitPasswordResult>;
	requestQrLogin: () => Promise<QrLoginResult>;
	checkQrLogin: () => Promise<QrLoginResult>;
	ensureTelegramConnected: EnsureTelegramConnected;
};
