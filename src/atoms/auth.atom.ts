import { atom } from "jotai";
import type { AuthClient } from "../domains/auth/model/authTypes";

export const authClientAtom = atom<AuthClient | null>(null);
export const isAuthLoadingAtom = atom<boolean>(true);
export const isAuthenticatedAtom = atom<boolean>(false);
