import { atom } from "jotai";
import type { FeedItem } from "../types";

export const feedItemsAtom = atom<FeedItem[]>([]);
