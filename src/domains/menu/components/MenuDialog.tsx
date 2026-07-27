import { Drawer } from "antd";
import type { PropsWithChildren } from "react";

type MenuDialogProps = {
	onClose: () => void;
	title: string;
};

export function MenuDialog({
	onClose,
	title,
	children,
}: PropsWithChildren<MenuDialogProps>) {
	return (
		<Drawer
			open
			onClose={onClose}
			title={title}
			placement="right"
			styles={{ wrapper: { width: Math.min(400, window.innerWidth) } }}
		>
			{children}
		</Drawer>
	);
}
