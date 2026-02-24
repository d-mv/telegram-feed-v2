import { atom } from "jotai";
import type { Channel } from "../types";

export const channelsAtom = atom<Channel[]>([]);
