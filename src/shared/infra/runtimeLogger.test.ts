import { describe, expect, test, vi } from "vitest";
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

describe("sensitive data scrubbing", () => {
	async function captureRemotePayload(
		logFn: (logger: ReturnType<typeof createRuntimeLogger>) => void,
	) {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(null, { status: 200 }));
		const logger = createRuntimeLogger({
			debug: false,
			consoleTarget: { warn: vi.fn(), error: vi.fn() },
		});
		logFn(logger);
		await new Promise((r) => setTimeout(r, 0));
		const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string) as {
			context: Record<string, unknown>;
		};
		fetchSpy.mockRestore();
		return body.context;
	}

	test("redacts phone number from context", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.warn("auth_event", { phone: "+1234567890", scope: "login" }),
		);
		expect(ctx.phone).toBe("[REDACTED]");
		expect(ctx.scope).toBe("login");
	});

	test("redacts password from context", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.error("login_error", { password: "hunter2", userId: "u1" }),
		);
		expect(ctx.password).toBe("[REDACTED]");
		expect(ctx.userId).toBe("u1");
	});

	test("redacts token from context", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.error("session_error", { token: "abc123", scope: "session" }),
		);
		expect(ctx.token).toBe("[REDACTED]");
		expect(ctx.scope).toBe("session");
	});

	test("redacts nested sensitive fields", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.warn("auth_event", {
				auth: { token: "abc123", userId: "u1" },
				scope: "login",
			}),
		);
		const auth = ctx.auth as Record<string, unknown>;
		expect(auth.token).toBe("[REDACTED]");
		expect(auth.userId).toBe("u1");
	});

	test("redacts camelCase sensitive keys like authToken", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.warn("auth_event", { authToken: "xyz", scope: "api" }),
		);
		expect(ctx.authToken).toBe("[REDACTED]");
	});

	test("passes through non-sensitive fields unchanged", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.warn("settings_load_failed", {
				scope: "notifications",
				error: "no settings",
			}),
		);
		expect(ctx.scope).toBe("notifications");
		expect(ctx.error).toBe("no settings");
	});

	test("handles Error objects by extracting name and message only", async () => {
		const ctx = await captureRemotePayload((l) =>
			l.error("unexpected", new Error("boom")),
		);
		const err = ctx as { name: string; message: string; stack?: string };
		expect(err.name).toBe("Error");
		expect(err.message).toBe("boom");
		expect(err.stack).toBeUndefined();
	});
});
