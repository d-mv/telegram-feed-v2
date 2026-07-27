type ConsoleTarget = Pick<Console, "warn" | "error">;

const LOGGER_API_URL =
	import.meta.env.VITE_LOGGER_API_URL ?? "https://logger-api.fly.dev/ingest";
const LOGGER_INGEST_KEY =
	import.meta.env.VITE_LOGGER_INGEST_KEY ??
	"701aa421-498a-43a8-bf09-a4c196d0ef6d";

const SENSITIVE_KEY_RE = /phone|password|token|secret|session|credential/i;

function scrubSensitive(value: unknown, depth = 0): unknown {
	if (depth > 5) return "[truncated]";
	if (value === null || value === undefined) return value;
	if (value instanceof Error)
		return { name: value.name, message: value.message };
	if (Array.isArray(value))
		return value.map((v) => scrubSensitive(v, depth + 1));
	if (typeof value !== "object") return value;
	const result: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		result[k] = SENSITIVE_KEY_RE.test(k)
			? "[REDACTED]"
			: scrubSensitive(v, depth + 1);
	}
	return result;
}

async function sendToRemote(
	level: "warn" | "error",
	message: string,
	context?: unknown,
) {
	try {
		await fetch(LOGGER_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-ingest-key": LOGGER_INGEST_KEY,
			},
			body: JSON.stringify({
				level,
				message,
				context: scrubSensitive(context),
				timestamp: new Date().toISOString(),
				environment: import.meta.env.MODE,
			}),
		});
	} catch (e) {
		// Silently fail remote logging to avoid infinite loops if the logger itself fails
		console.error("Failed to send log to remote:", e);
	}
}

export function createRuntimeLogger({
	debug,
	consoleTarget,
}: {
	debug: boolean;
	consoleTarget: ConsoleTarget;
}) {
	return {
		warn(message: string, context?: unknown) {
			if (debug) {
				consoleTarget.warn(message, context);
			}
			if (!debug) {
				sendToRemote("warn", message, context);
			}
		},
		error(message: string, error?: unknown) {
			if (debug) {
				consoleTarget.error(message, error);
			}
			if (!debug) {
				sendToRemote("error", message, error);
			}
		},
	};
}

export const runtimeLogger = createRuntimeLogger({
	debug: import.meta.env.DEV && import.meta.env.MODE !== "test",
	consoleTarget: console,
});
