type ConsoleTarget = Pick<Console, "warn" | "error">;

const LOGGER_API_URL = "https://logger-api.fly.dev/ingest";
const LOGGER_INGEST_KEY = "701aa421-498a-43a8-bf09-a4c196d0ef6d";

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
				context,
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
