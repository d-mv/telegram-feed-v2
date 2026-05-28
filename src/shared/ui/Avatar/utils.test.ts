import { describe, expect, test } from "vitest";
import { getAvatarColor, getAvatarDataUrl, getAvatarInitials } from "./utils";

describe("getAvatarInitials", () => {
	test("returns first two chars for single-word name", () => {
		expect(getAvatarInitials("Alice")).toBe("AL");
	});

	test("returns initials for two-word name", () => {
		expect(getAvatarInitials("Alice Bob")).toBe("AB");
	});

	test("returns ? for empty name", () => {
		expect(getAvatarInitials("")).toBe("?");
	});
});

describe("getAvatarColor", () => {
	test("returns a hex color from the palette", () => {
		const color = getAvatarColor("Alice");
		expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});
});

describe("getAvatarDataUrl", () => {
	test("XML-escapes initials containing ampersand", () => {
		const url = getAvatarDataUrl("& Ampersand");
		const decoded = decodeURIComponent(
			url.replace("data:image/svg+xml;charset=utf-8,", ""),
		);
		expect(decoded).not.toContain(">&<");
		expect(decoded).toContain("&amp;");
	});

	test("XML-escapes initials containing angle brackets", () => {
		const url = getAvatarDataUrl("< Lessthan");
		const decoded = decodeURIComponent(
			url.replace("data:image/svg+xml;charset=utf-8,", ""),
		);
		// The text node content should have escaped &lt;, not raw <
		const textContent = decoded.match(/<text[^>]*>(.*?)<\/text>/)?.[1] ?? "";
		expect(textContent).not.toContain("<");
		expect(textContent).toContain("&lt;");
	});

	test("produces a valid data URL for normal names", () => {
		const url = getAvatarDataUrl("Alice Bob");
		expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
		const decoded = decodeURIComponent(
			url.replace("data:image/svg+xml;charset=utf-8,", ""),
		);
		expect(decoded).toContain("AB");
	});
});
