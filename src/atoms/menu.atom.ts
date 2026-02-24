import { atom } from "jotai";

export const menuIsOpenAtom = atom(false);

export const toggleMenuAtom = atom(null, (get, set) => {
  set(menuIsOpenAtom, !get(menuIsOpenAtom));
});

export const menuItemAtom = atom<number | null>(null);

export const closeMenuAtom = atom(null, (get, set) => {
  set(menuItemAtom, null);
  set(menuIsOpenAtom, false);
});
