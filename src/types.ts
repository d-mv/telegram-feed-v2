import type { AnyValue } from "@mv-d/toolbelt";

type MediaMeta = {
  type: "image" | "video" | "audio" | "file";
  width: number;
  height: number;
  sizeBytes: number;
  mimeType?: string;
  fileName?: string;
};

export type MediaPreview = {
  meta: MediaMeta;
  url?: string;
  alt: string;
  key?: string;
};

type Reaction = {
  emoji: string;
  count: number;
};

interface Message {
  id: string;
  channelKey?: string;
  chatName: string;
  timestamp: string;
  date: number;
  text: string;
  commentsCount?: number;
  media?: MediaPreview;
  mediaItems?: MediaPreview[];
  senderName?: string;
  mediaGroupKey?: string;
  // fix this
  sourceMessage?: AnyValue;
  isFocused: boolean;
  isRead?: boolean;
}

export interface DirectMessage extends Message {
  type: "dm";
  reactions: Reaction[];
  senderName: string;
}

export interface GroupMessage extends Message {
  type: "group";
}

export type FeedItem = DirectMessage | GroupMessage;

export type Channel = {
  key: string;
  label: string;
};

export type NotificationSettings = Record<string, boolean>;
export type FeedFilterSettings = Record<string, boolean>;

export type AvatarVisibilitySettings = {
  feed: boolean;
  thread: boolean;
  notifications: boolean;
};
