import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	DEFAULT_EVENT_THROTTLE_MS,
	attachServiceWorkerAutoUpdate,
} from "./serviceWorkerAutoUpdate";

type FakeEventTarget = {
	addEventListener: (type: string, listener: EventListener) => void;
	removeEventListener: (type: string, listener: EventListener) => void;
	dispatchEvent: (event: Event) => boolean;
};

function createEventTarget(): FakeEventTarget {
	const target = new EventTarget();
	return {
		addEventListener: target.addEventListener.bind(target),
		removeEventListener: target.removeEventListener.bind(target),
		dispatchEvent: target.dispatchEvent.bind(target),
	};
}

function createRegistration() {
	const listeners = new Map<string, Set<EventListener>>();

	return {
		waiting: undefined,
		installing: undefined,
		update: vi.fn().mockResolvedValue(undefined),
		addEventListener(type: string, listener: EventListener) {
			const nextListeners = listeners.get(type) ?? new Set<EventListener>();
			nextListeners.add(listener);
			listeners.set(type, nextListeners);
		},
		removeEventListener(type: string, listener: EventListener) {
			listeners.get(type)?.delete(listener);
		},
		dispatch(type: string) {
			const event = new Event(type);
			listeners.get(type)?.forEach((listener) => listener(event));
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-03-22T18:00:00Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

test("coalesces repeated lifecycle-triggered service worker updates", async () => {
	const registration = createRegistration();
	const serviceWorker = createEventTarget();

	const cleanup = attachServiceWorkerAutoUpdate(registration as never, {
		documentTarget: document,
		serviceWorker,
		windowTarget: window,
		updateIntervalMs: 60 * 60 * 1000,
	});

	await Promise.resolve();

	expect(registration.update).toHaveBeenCalledTimes(1);

	document.dispatchEvent(new Event("visibilitychange"));
	window.dispatchEvent(new Event("pageshow"));

	await Promise.resolve();

	expect(registration.update).toHaveBeenCalledTimes(1);

	await vi.advanceTimersByTimeAsync(DEFAULT_EVENT_THROTTLE_MS);
	window.dispatchEvent(new Event("pageshow"));

	await Promise.resolve();

	expect(registration.update).toHaveBeenCalledTimes(2);
	cleanup();
});

test("runs the interval check without double-calling while an update is in flight", async () => {
	let resolveUpdate: (() => void) | undefined;
	const registration = createRegistration();
	registration.update.mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				resolveUpdate = resolve;
			}),
	);

	const cleanup = attachServiceWorkerAutoUpdate(registration as never, {
		documentTarget: document,
		serviceWorker: createEventTarget(),
		windowTarget: window,
		eventThrottleMs: 0,
		updateIntervalMs: 1000,
	});

	await Promise.resolve();

	expect(registration.update).toHaveBeenCalledTimes(1);

	await vi.advanceTimersByTimeAsync(1000);

	expect(registration.update).toHaveBeenCalledTimes(1);

	resolveUpdate?.();
	await Promise.resolve();

	await vi.advanceTimersByTimeAsync(1000);

	expect(registration.update).toHaveBeenCalledTimes(2);
	cleanup();
});
