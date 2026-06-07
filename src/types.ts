type MediaMeta = {
	type: "image" | "video" | "audio" | "file" | "youtube";
	width: number;
	height: number;
	sizeBytes: number;
	mimeType?: string;
	fileName?: string;
	title?: string;
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

export type PollOption = {
	text: string;
	option: Uint8Array;
	votersCount: number;
	chosen?: boolean;
	correct?: boolean;
};

export type PollPreview = {
	id: string;
	question: string;
	options: PollOption[];
	totalVoters: number;
	closed?: boolean;
	multipleChoice?: boolean;
	quiz?: boolean;
	publicVoters?: boolean;
	recentVoters?: string[];
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
	poll?: PollPreview;
	senderName?: string;
	senderId?: string;
	mediaGroupKey?: string;
	sourceMessage?: unknown;
	isFocused: boolean;
	isRead?: boolean;
	reactions?: Reaction[];
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

export type FontSize = "small" | "medium" | "large" | "xlarge";

export type FontSizeSettings = {
	size: FontSize;
};
