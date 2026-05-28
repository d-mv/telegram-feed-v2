import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sw = readFileSync(resolve(__dirname, "../public/sw.js"), "utf8");

describe("service worker message handler", () => {
	test("verifies event.source before acting on postMessage", () => {
		// The message listener must guard against null/missing sources
		// before acting on the message data
		const listenerMatch = sw.match(
			/addEventListener\s*\(\s*['"]message['"]\s*,\s*([\s\S]+?)(?=self\.addEventListener|$)/,
		);
		expect(listenerMatch).toBeTruthy();
		const handlerBody = listenerMatch![1];
		// Must check event.source before checking event.data
		const sourceCheckIndex = handlerBody.indexOf("event.source");
		const dataCheckIndex = handlerBody.indexOf("event.data");
		expect(sourceCheckIndex).toBeGreaterThan(-1);
		expect(sourceCheckIndex).toBeLessThan(dataCheckIndex);
	});
});
