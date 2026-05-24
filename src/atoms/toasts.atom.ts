import { atom } from "jotai";

export type Toast = {
	id: string;
	message: string;
};

export const toastsAtom = atom<Toast[]>([]);

export const pushToastAtom = atom(null, (get, set, message: string) => {
	const nextToast = {
		id: `toast-${Date.now()}`,
		message,
	};
	set(toastsAtom, [...get(toastsAtom), nextToast]);
});

export const dismissToastAtom = atom(null, (get, set, id: string) => {
	set(
		toastsAtom,
		get(toastsAtom).filter((toast) => toast.id !== id),
	);
});
