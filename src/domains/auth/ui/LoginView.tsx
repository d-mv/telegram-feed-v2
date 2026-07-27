import { Alert, Card, Flex, theme, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import type {
	AuthClient,
	QrLoginResult,
	QrLoginToken,
} from "../model/authTypes";
import { createMockAuth } from "../model/mockAuth";
import { LoginToggle } from "./LoginToggle";
import { PhoneLoginFields } from "./PhoneLoginFields";
import { QrLoginPanel } from "./QrLoginPanel";
import { TwoFactorForm } from "./TwoFactorForm";

type LoginMode = "phone" | "qr";

type LoginViewProps = {
	auth?: AuthClient;
	onAuthenticated?: () => void;
};

export function LoginView({ auth, onAuthenticated }: LoginViewProps) {
	const { token } = theme.useToken();
	const [loginMode, setLoginMode] = useState<LoginMode>("phone");
	const [codeSent, setCodeSent] = useState(false);
	const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
	const [phone, setPhone] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [passwordHint, setPasswordHint] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isSubmittingCode, setIsSubmittingCode] = useState(false);
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
	const [error, setError] = useState("");
	const [qrToken, setQrToken] = useState<QrLoginToken | null>(null);
	const [qrStatus, setQrStatus] = useState<"idle" | "loading" | "waiting">(
		"idle",
	);
	const [qrError, setQrError] = useState("");

	const fallbackAuth = useMemo(() => createMockAuth(), []);
	const authClient = auth ?? fallbackAuth;

	function resetFlow() {
		setCodeSent(false);
		setNeedsTwoFactor(false);
		setCode("");
		setPassword("");
		setPasswordHint("");
		setError("");
		setIsSending(false);
		setIsSubmittingCode(false);
		setIsSubmittingPassword(false);
		setQrToken(null);
		setQrStatus("idle");
		setQrError("");
	}

	function handleModeChange(mode: LoginMode) {
		if (mode === loginMode) return;
		setLoginMode(mode);
		resetFlow();
	}

	function handleQrResult(result: QrLoginResult) {
		if (result.status === "logged_in") {
			onAuthenticated?.();
			return;
		}
		if (result.status === "needs_2fa") {
			setNeedsTwoFactor(true);
			setPasswordHint(result.hint ?? "");
			setQrToken(null);
			setQrStatus("idle");
			return;
		}
		if (result.status === "token") {
			setQrToken(result.token);
			setQrStatus("waiting");
			return;
		}
		if (result.status === "pending") setQrStatus("waiting");
	}

	async function startQrLogin(showError = true) {
		setQrError("");
		setQrStatus("loading");
		setQrToken(null);
		try {
			const result = await authClient.requestQrLogin();
			handleQrResult(result);
		} catch {
			if (showError) setQrError("Could not start QR login. Please try again.");
			setQrStatus("idle");
		}
	}

	async function handleRefreshQr() {
		setNeedsTwoFactor(false);
		setPassword("");
		setPasswordHint("");
		await startQrLogin();
	}

	useEffect(() => {
		if (loginMode !== "qr") return;

		let isActive = true;
		let pollId: number | null = null;

		startQrLogin(false);

		pollId = window.setInterval(async () => {
			try {
				const result = await authClient.checkQrLogin();
				if (isActive) handleQrResult(result);
			} catch {
				if (isActive) setQrError("QR login failed. Please try again.");
			}
		}, 3000);

		return () => {
			isActive = false;
			if (pollId) window.clearInterval(pollId);
		};
	}, [authClient, loginMode]);

	async function handleSendCode() {
		setError("");
		setIsSending(true);
		try {
			await authClient.sendCode(phone);
			setCodeSent(true);
		} catch {
			setError("Could not send code. Please try again.");
		} finally {
			setIsSending(false);
		}
	}

	async function handleSubmitCode() {
		setError("");
		setIsSubmittingCode(true);
		try {
			const result = await authClient.submitCode(code);
			if (result.status === "needs_2fa") {
				setNeedsTwoFactor(true);
				setPasswordHint(result.hint ?? "");
				return;
			}
			onAuthenticated?.();
		} catch {
			setError("Could not submit code. Please try again.");
		} finally {
			setIsSubmittingCode(false);
		}
	}

	async function handleSubmitPassword() {
		setError("");
		setIsSubmittingPassword(true);
		try {
			await authClient.submitPassword(password);
			onAuthenticated?.();
		} catch {
			setError("Could not submit password. Please try again.");
		} finally {
			setIsSubmittingPassword(false);
		}
	}

	const expiresAt = qrToken ? qrToken.expires * 1000 : null;
	const isQrExpired = Boolean(expiresAt && Date.now() > expiresAt);

	return (
		<Flex
			align="center"
			justify="center"
			style={{
				minHeight: "100vh",
				padding: 24,
				background: token.colorBgLayout,
			}}
		>
			<Flex
				gap={24}
				align="stretch"
				style={{ width: "100%", maxWidth: 900 }}
				wrap="wrap"
			>
				<Card style={{ flex: "1 1 320px", minWidth: 280 }}>
					<Flex vertical gap={16}>
						<div>
							<Typography.Text
								type="secondary"
								style={{
									fontSize: 12,
									textTransform: "uppercase",
									letterSpacing: 1,
								}}
							>
								Telegram Feed
							</Typography.Text>
							<Typography.Title level={3} style={{ margin: 0 }}>
								Sign in:
							</Typography.Title>
							{/* <Typography.Text type="secondary">
								Phone or QR login. We never auto-load media or autoplay video.
							</Typography.Text> */}
						</div>
						<form onSubmit={(e) => e.preventDefault()}>
							<LoginToggle mode={loginMode} onChange={handleModeChange} />
							<div style={{ marginTop: 16 }}>
								{loginMode === "phone" && (
									<PhoneLoginFields
										phone={phone}
										code={code}
										codeSent={codeSent}
										isSending={isSending}
										isSubmittingCode={isSubmittingCode}
										onPhoneChange={setPhone}
										onCodeChange={setCode}
										onSendCode={handleSendCode}
										onSubmitCode={handleSubmitCode}
										onReset={resetFlow}
									/>
								)}
								{loginMode === "qr" && !needsTwoFactor && (
									<QrLoginPanel
										status={qrStatus}
										token={qrToken}
										error={qrError}
										isExpired={isQrExpired}
										onRefresh={handleRefreshQr}
										onReset={resetFlow}
									/>
								)}
								{needsTwoFactor && (
									<div style={{ marginTop: 16 }}>
										<TwoFactorForm
											password={password}
											hint={passwordHint}
											isSubmitting={isSubmittingPassword}
											onPasswordChange={setPassword}
											onSubmit={handleSubmitPassword}
										/>
									</div>
								)}
							</div>
							{error !== "" && (
								<Alert
									title={error}
									type="error"
									showIcon
									style={{ marginTop: 12 }}
								/>
							)}
						</form>
					</Flex>
				</Card>

				<Card
					style={{
						flex: "1 1 240px",
						minWidth: 200,
						background: token.colorPrimary,
						borderColor: token.colorPrimary,
					}}
				>
					<Flex
						vertical
						justify="space-between"
						style={{ height: "100%", minHeight: 200 }}
					>
						<div>
							<Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
								One feed, every channel.
							</Typography.Title>
							<Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
								The login is the only gate. Once you are in, the feed stays
								fast, chronological, and intentionally quiet.
							</Typography.Text>
						</div>
					</Flex>
				</Card>
			</Flex>
		</Flex>
	);
}
