import { Button, Flex, Typography } from "antd";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { QrLoginToken } from "../model/authTypes";
import { ReloadOutlined } from "@ant-design/icons";

type QrLoginPanelProps = {
	status: "idle" | "loading" | "waiting";
	token: QrLoginToken | null;
	error: string;
	isExpired: boolean;
	onRefresh: () => void;
	onReset: () => void;
};

export function QrLoginPanel({
	status,
	token,
	error,
	isExpired,
	onRefresh,
	onReset,
}: QrLoginPanelProps) {
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!token) {
			setQrDataUrl(null);
			return;
		}
		let cancelled = false;
		QRCode.toDataURL(token.loginUrl, { width: 160, margin: 1 }).then((url) => {
			if (!cancelled) setQrDataUrl(url);
		});
		return () => {
			cancelled = true;
		};
	}, [token]);

	return (
		<Flex vertical gap={12} align="center">
			{status === "loading" && (
				<Typography.Text type="secondary">Preparing QR code...</Typography.Text>
			)}
			{token && (
				<>
					<div
						style={{
							border: "1px solid",
							borderColor: "var(--ant-color-border, #d9d9d9)",
							padding: 4,
							height: "168px",
							width: "168px",
						}}
					>
						{qrDataUrl && (
							<img
								src={qrDataUrl}
								alt="Telegram QR login"
								style={{ width: 160, height: 160, display: "block" }}
							/>
						)}
					</div>
					<Typography.Text
						type="secondary"
						style={{ textAlign: "center", fontSize: 13 }}
					>
						Scan with Telegram mobile. Keep the app open while it logs in.
					</Typography.Text>
					{isExpired && (
						<Typography.Text type="warning">
							QR expired. Refresh.
						</Typography.Text>
					)}
				</>
			)}
			<Flex gap={8}>
				<Button
					onClick={onRefresh}
					disabled={status === "loading"}
					icon={<ReloadOutlined aria-hidden style={{ fontSize: 16 }} />}
				>
					Refresh QR
				</Button>
				<Button type="text" onClick={onReset}>
					Reset
				</Button>
			</Flex>
			{error !== "" && <Typography.Text type="danger">{error}</Typography.Text>}
		</Flex>
	);
}
