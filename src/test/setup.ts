import "@testing-library/jest-dom";

class MockResizeObserver implements ResizeObserver {
	constructor(_callback: ResizeObserverCallback) {}
	observe(_target: Element, _options?: ResizeObserverOptions) {}
	unobserve(_target: Element) {}
	disconnect() {}
}

globalThis.ResizeObserver =
	MockResizeObserver as unknown as typeof ResizeObserver;

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}),
});

class MockIntersectionObserver implements IntersectionObserver {
	readonly root: Element | null = null;
	readonly rootMargin = "";
	readonly scrollMargin = "";
	readonly thresholds: ReadonlyArray<number> = [];

	constructor(_callback: IntersectionObserverCallback) {}

	disconnect() {}
	observe(_target: Element) {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
	unobserve(_target: Element) {}
}

globalThis.IntersectionObserver =
	MockIntersectionObserver as unknown as typeof IntersectionObserver;

import { vi } from "vitest";

vi.mock("virtua", () => ({
	VList: ({ children }: { children: React.ReactNode }) => children,
	WindowVirtualizer: ({ children }: { children: React.ReactNode }) => children,
}));
