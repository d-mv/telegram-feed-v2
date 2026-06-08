import { FloatButton } from "antd";
import { UpOutlined } from "@ant-design/icons";
import type { CSSProperties } from "react";

type ScrollTopButtonProps = {
	onClick: () => void;
	style?: CSSProperties;
};

export function ScrollTopButton({ onClick, style }: ScrollTopButtonProps) {
	return (
		<FloatButton
			onClick={onClick}
			aria-label="Scroll to top"
			icon={<UpOutlined aria-hidden style={{ fontSize: 16 }} />}
			style={{ bottom: 24, right: 24, ...style }}
		/>
	);
}
