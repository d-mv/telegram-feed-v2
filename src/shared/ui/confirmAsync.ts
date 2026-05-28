import { Modal } from "antd";

export function confirmAsync(title: string): Promise<boolean> {
	return new Promise((resolve) => {
		Modal.confirm({
			title,
			onOk: () => resolve(true),
			onCancel: () => resolve(false),
		});
	});
}
