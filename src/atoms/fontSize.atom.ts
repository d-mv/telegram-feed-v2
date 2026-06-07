import { atom } from "jotai";
import type { FontSize, FontSizeSettings } from "../types";

export const FONT_SIZE_PX: Record<FontSize, number> = {
	small: 14,
	medium: 16,
	large: 18,
	xlarge: 20,
};

export const fontSizeAtom = atom<FontSizeSettings>({
	size: "medium",
});
