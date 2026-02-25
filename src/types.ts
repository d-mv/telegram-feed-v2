type MediaMeta = {
  type: "image" | "video";
  width: number;
  height: number;
  sizeBytes: number;
  mimeType?: string;
};

type MediaPreview = {
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
  text: string;
  media?: MediaPreview;
  sourceMessage?: unknown;
}

interface DirectMessage extends Message {
  type: "dm";
  reactions: Reaction[];
  senderName: string;
}

interface GroupMessage extends Message {
  type: "group";
}

export type FeedItem = DirectMessage | GroupMessage;

export type Channel = {
  key: string;
  label: string;
};

export type NotificationSettings = Record<string, boolean>;
export type FeedFilterSettings = Record<string, boolean>;
