import { describe, expect, test } from "vitest";
import { getImageGridColumns } from "./mediaGroupUtils";

describe("getImageGridColumns", () => {
	test("returns 1 for 1 item", () => {
		expect(getImageGridColumns(1)).toBe(1);
	});

	test("returns 2 for 2 items", () => {
		expect(getImageGridColumns(2)).toBe(2);
	});

	test("returns 3 for 3 items", () => {
		expect(getImageGridColumns(3)).toBe(3);
	});

	test("returns 4 for 4 items", () => {
		expect(getImageGridColumns(4)).toBe(4);
	});

	test("returns 3 for 5 items", () => {
		expect(getImageGridColumns(5)).toBe(3);
	});

	test("returns 3 for 6 items", () => {
		expect(getImageGridColumns(6)).toBe(3);
	});

	test("returns 4 for 7+ items", () => {
		expect(getImageGridColumns(7)).toBe(4);
		expect(getImageGridColumns(10)).toBe(4);
	});
});
