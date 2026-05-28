import { Api, TelegramClient } from "telegram";
import type { StringSession } from "telegram/sessions";
import type { QrLoginResult, QrLoginToken } from "../model/authTypes";
import type { TelegramAuthConfig } from "./telegramAuth.types";

export function toBase64Url(bytes: Uint8Array) {
	let binary = "";
	for (const value of bytes) {
		binary += String.fromCharCode(value);
	}
	const base64 = btoa(binary);
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildQrToken(token: Uint8Array, expires: number): QrLoginToken {
	const loginUrl = `tg://login?token=${toBase64Url(token)}`;
	return { token, expires, loginUrl };
}

export function getTelegramErrorMessage(error: unknown, fallback: string) {
	if (typeof error === "object" && error && "errorMessage" in error) {
		return String((error as { errorMessage?: string }).errorMessage);
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}

export function createLoginSuccessHandler(
	session: StringSession,
	config: TelegramAuthConfig,
	logger: Pick<Console, "info">,
) {
	return async function handleLoginSuccess(): Promise<QrLoginResult> {
		logger.info("[TelegramAuth] logged in");
		config.onSession?.(session.save());
		return { status: "logged_in" };
	};
}

export async function getPasswordHint(
	client: TelegramClient,
	logger: Pick<Console, "error">,
): Promise<string> {
	try {
		const pwd = await client.invoke(new Api.account.GetPassword());
		if (typeof pwd.hint === "string") {
			return pwd.hint;
		}
	} catch (error) {
		logger.error("[TelegramAuth] failed to fetch 2fa hint", error);
	}

	return "";
}
