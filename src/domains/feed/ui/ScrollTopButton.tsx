import { FloatButton } from "antd";
import { UpOutlined } from "@ant-design/icons";

type ScrollTopButtonProps = {
	onClick: () => void;
};

export function ScrollTopButton({ onClick }: ScrollTopButtonProps) {
	return (
		<FloatButton
			onClick={onClick}
			aria-label="Scroll to top"
			icon={<UpOutlined aria-hidden style={{ fontSize: 16 }} />}
			style={{ bottom: 24, right: 24 }}
		/>
	);
}
