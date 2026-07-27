import { Alert } from "antd";
import { useAtomValue } from "jotai/react";
import { toastsAtom } from "../../../atoms/toasts.atom";

export function ToastViewport() {
	const toasts = useAtomValue(toastsAtom);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			aria-live="polite"
			aria-atomic="true"
			style={{
				position: "fixed",
				bottom: 24,
				right: 24,
				zIndex: 9999,
				display: "flex",
				flexDirection: "column",
				gap: 8,
				maxWidth: 360,
			}}
		>
			{toasts.map((toast) => (
				<div key={toast.id} role="status">
					<Alert title={toast.message} type="info" showIcon banner />
				</div>
			))}
		</div>
	);
}
