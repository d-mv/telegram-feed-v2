import { expect, test, vi } from "vitest";
import { createRuntimeLogger } from "./runtimeLogger";

test("logs runtime errors only when debug logging is enabled", () => {
	const consoleTarget = {
		error: vi.fn(),
	};
	const logger = createRuntimeLogger({
		debug: true,
		consoleTarget,
	});

	logger.error("download failed", new Error("boom"));

	expect(consoleTarget.error).toHaveBeenCalledWith(
		"download failed",
		expect.any(Error),
	);
});

test("suppresses runtime errors when debug logging is disabled", () => {
	const consoleTarget = {
		error: vi.fn(),
	};
	const logger = createRuntimeLogger({
		debug: false,
		consoleTarget,
	});

	logger.error("download failed", new Error("boom"));

	expect(consoleTarget.error).not.toHaveBeenCalled();
});
