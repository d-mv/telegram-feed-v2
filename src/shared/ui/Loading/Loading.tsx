import { Spin } from "antd";

export function Loading() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				minHeight: 200,
			}}
		>
			<Spin size="large" />
		</div>
	);
}
