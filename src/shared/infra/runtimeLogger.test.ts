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

test("logs warnings to console when debug mode is enabled", () => {
	const consoleTarget = {
		warn: vi.fn(),
	};
	const logger = createRuntimeLogger({
		debug: true,
		consoleTarget,
	});

	logger.warn("auth_timeout", { scope: "session" });

	expect(consoleTarget.warn).toHaveBeenCalledWith("auth_timeout", {
		scope: "session",
	});
});

test("sends warning to remote when debug mode is disabled", async () => {
	const fetchSpy = vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(new Response(null, { status: 200 }));

	const logger = createRuntimeLogger({
		debug: false,
		consoleTarget: { warn: vi.fn(), error: vi.fn() },
	});

	logger.warn("auth_timeout", { scope: "session" });
	// Allow the async sendToRemote to settle
	await new Promise((r) => setTimeout(r, 0));

	expect(fetchSpy).toHaveBeenCalledWith(
		expect.stringContaining("ingest"),
		expect.objectContaining({ method: "POST" }),
	);
	fetchSpy.mockRestore();
});
