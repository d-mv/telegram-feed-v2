const TELEMETRY_EVENT_NAME = "telegram-feed:telemetry";

export function emitTelemetry(name: string, detail: Record<string, unknown>) {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(
		new CustomEvent(TELEMETRY_EVENT_NAME, {
			detail: {
				name,
				...detail,
			},
		}),
	);
}
