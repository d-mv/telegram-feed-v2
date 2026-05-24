import { Button, Flex, Typography } from "antd";
import type { ButtonVariant } from "../../../shared/ui/Button/Button";

type Props = {
	title: string;
	subtitle?: string;
	buttonText: string;
	onClick: () => void;
	disabled?: boolean;
	variant?: ButtonVariant;
};

export function SettingButtonRow({
	title,
	subtitle,
	buttonText,
	onClick,
	disabled,
	variant = "primary",
}: Props) {
	const antType =
		variant === "primary"
			? "primary"
			: variant === "ghost"
				? "text"
				: "default";

	return (
		<Flex
			align="center"
			justify="space-between"
			gap={12}
			style={{
				padding: "12px 0",
				borderBottom: "1px solid var(--ant-color-border-secondary, #f0f0f0)",
			}}
		>
			<div style={{ flex: 1, minWidth: 0 }}>
				<Typography.Text strong style={{ display: "block" }}>
					{title}
				</Typography.Text>
				{subtitle && (
					<Typography.Text type="secondary" style={{ fontSize: 12 }}>
						{subtitle}
					</Typography.Text>
				)}
			</div>
			<Button type={antType} onClick={onClick} disabled={disabled}>
				{buttonText}
			</Button>
		</Flex>
	);
}
