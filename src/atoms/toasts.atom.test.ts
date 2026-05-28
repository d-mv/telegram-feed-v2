import { createStore } from "jotai";
import { dismissToastAtom, pushToastAtom, toastsAtom } from "./toasts.atom";

test("pushToastAtom appends a toast", () => {
	const store = createStore();
	store.set(pushToastAtom, "Hello");
	const toasts = store.get(toastsAtom);
	expect(toasts).toHaveLength(1);
	expect(toasts[0].message).toBe("Hello");
});

test("dismissToastAtom removes a toast by id", () => {
	const store = createStore();
	store.set(pushToastAtom, "Hello");
	const [toast] = store.get(toastsAtom);
	store.set(dismissToastAtom, toast.id);
	expect(store.get(toastsAtom)).toHaveLength(0);
});
