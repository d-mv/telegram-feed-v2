import type { AuthClient } from "../model/authTypes";
import {
	ensureClientConnected,
	initializeTelegramClient,
} from "./telegramClient";
import { createPhoneAuth } from "./telegramPhoneAuth";
import { createQrAuth } from "./telegramQrAuth";
import type { TelegramAuthConfig } from "./telegramAuth.types";

export function createTelegramAuth(config: TelegramAuthConfig): AuthClient {
	const logger = config.logger ?? console;
	const { client, session } = initializeTelegramClient(config);

	const ensureConnected = () => ensureClientConnected(client, logger);
	const phoneAuth = createPhoneAuth(client, session, config, ensureConnected);
	const qrAuth = createQrAuth(client, session, config, ensureConnected);

	const saveSession = () => {
		try {
			const saved = session.save();
			if (saved) {
				config.onSession?.(saved);
			}
		} catch {
			// ignore session save error
		}
	};

	return {
		...phoneAuth,
		...qrAuth,
		async checkSession() {
			await ensureConnected();
			const isAuthorized = await client.isUserAuthorized();
			if (isAuthorized) {
				saveSession();
			}
			return isAuthorized;
		},
		ensureTelegramConnected: async () => {
			await ensureConnected();
			if (
				typeof client.isUserAuthorized === "function" &&
				(await client.isUserAuthorized())
			) {
				saveSession();
			}
			return client;
		},
		async logout() {
			await client.disconnect();
		},
	};
}
