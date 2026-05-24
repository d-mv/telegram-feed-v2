import { Button, Flex, Typography } from "antd";
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
	return (
		<Flex vertical gap={12} align="center">
			{status === "loading" && (
				<Typography.Text type="secondary">Preparing QR code...</Typography.Text>
			)}
			{token && (
				<>
					<div
						style={{
							border: "4px solid",
							borderColor: "var(--ant-color-border, #d9d9d9)",
							borderRadius: 8,
							padding: 4,
						}}
					>
						<img
							src={token.qrImageUrl}
							alt="Telegram QR login"
							style={{ width: 160, height: 160, display: "block" }}
						/>
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
