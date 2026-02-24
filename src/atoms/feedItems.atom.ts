import { atom } from "jotai";
import type { FeedItem } from "../domains/feed/model/mockFeed";

export const feedItemsAtom = atom<FeedItem[]>([]);
