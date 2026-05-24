import { Api, TelegramClient } from "telegram";
import { computeCheck } from "telegram/Password";
import type { StringSession } from "telegram/sessions";
import type { AuthClient } from "../model/authTypes";
import type { TelegramAuthConfig } from "./telegramAuth.types";
import { getPasswordHint, getTelegramErrorMessage } from "./telegramAuth.utils";

export function createPhoneAuth(
	client: TelegramClient,
	session: StringSession,
	config: TelegramAuthConfig,
	ensureConnected: () => Promise<void>,
): Pick<AuthClient, "sendCode" | "submitCode" | "submitPassword"> {
	const logger = config.logger ?? console;
	const handleLoginSuccess = () => {
		logger.info("[TelegramAuth] logged in");
		config.onSession?.(session.save());
		return { status: "logged_in" as const };
	};

	let phoneNumber = "";
	let phoneCodeHash = "";
	let passwordHint = "";

	function getLogoutToken() {
		return "telegram-feed";
	}

	return {
		async sendCode(phone: string) {
			await ensureConnected();
			logger.info("[TelegramAuth] sending code");
			phoneNumber = phone;
			try {
				const result = await client.invoke(
					new Api.auth.SendCode({
						phoneNumber,
						apiId: config.apiId,
						apiHash: config.apiHash,
						settings: new Api.CodeSettings({
							currentNumber: true,
							allowAppHash: true,
							allowMissedCall: true,
							logoutTokens: [getLogoutToken()],
						}),
					}),
				);
				const sentCode = result as Api.auth.SentCode;
				phoneCodeHash = sentCode.phoneCodeHash;
				logger.info("[TelegramAuth] sent code type", sentCode.type?.className);
				if (sentCode.nextType) {
					logger.info(
						"[TelegramAuth] next code type",
						sentCode.nextType.className,
					);
				}
				return { ok: true };
			} catch (error) {
				logger.error("[TelegramAuth] send code failed", error);
				throw new Error(getTelegramErrorMessage(error, "Failed to send code"));
			}
		},

		async submitCode(code: string) {
			await ensureConnected();
			logger.info("[TelegramAuth] submitting code");
			if (!phoneNumber || !phoneCodeHash) {
				throw new Error("Missing phone code hash. Send code first.");
			}
			try {
				await client.invoke(
					new Api.auth.SignIn({
						phoneNumber,
						phoneCodeHash,
						phoneCode: code,
					}),
				);
				return handleLoginSuccess();
			} catch (error) {
				const errorMessage = getTelegramErrorMessage(error, "");
				if (errorMessage.toUpperCase() === "SESSION_PASSWORD_NEEDED") {
					logger.info("[TelegramAuth] 2fa required");
					passwordHint = await getPasswordHint(client, logger);
					if (passwordHint) {
						logger.info("[TelegramAuth] 2fa hint received");
					}
					return { status: "needs_2fa", hint: passwordHint };
				}
				logger.error("[TelegramAuth] submit code failed", error);
				throw new Error(errorMessage || "Failed to submit code");
			}
		},

		async submitPassword(password: string) {
			await ensureConnected();
			logger.info("[TelegramAuth] submitting password");
			try {
				const pwd = await client.invoke(new Api.account.GetPassword());
				const check = await computeCheck(pwd, password);
				await client.invoke(new Api.auth.CheckPassword({ password: check }));
				return handleLoginSuccess();
			} catch (error) {
				logger.error("[TelegramAuth] submit password failed", error);
				throw new Error(
					getTelegramErrorMessage(error, "Failed to submit password"),
				);
			}
		},
	};
}
