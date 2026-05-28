import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const configPath = resolve(__dirname, "../nginx.conf");
const config = readFileSync(configPath, "utf8");

describe("nginx security headers", () => {
	test("sets X-Frame-Options to SAMEORIGIN", () => {
		expect(config).toMatch(/X-Frame-Options\s+"?SAMEORIGIN"?/);
	});

	test("sets X-Content-Type-Options to nosniff", () => {
		expect(config).toMatch(/X-Content-Type-Options\s+"?nosniff"?/);
	});

	test("sets Referrer-Policy", () => {
		expect(config).toMatch(/Referrer-Policy\s+/);
	});

	test("sets Content-Security-Policy with default-src", () => {
		expect(config).toMatch(/Content-Security-Policy/);
		expect(config).toMatch(/default-src/);
	});

	test("CSP restricts frame-src to YouTube", () => {
		expect(config).toMatch(/frame-src[^;]*youtube/);
	});

	test("sets Permissions-Policy", () => {
		expect(config).toMatch(/Permissions-Policy\s+/);
	});
});
