import { atom } from "jotai";
import type { AvatarVisibilitySettings } from "../types";

export const avatarVisibilityAtom = atom<AvatarVisibilitySettings>({
	feed: true,
	thread: true,
	notifications: true,
});
