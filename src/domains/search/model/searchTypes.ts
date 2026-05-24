export type SearchResultKind = "direct" | "group" | "channel" | "message";

export type SearchChatTarget = {
	kind: Exclude<SearchResultKind, "message">;
	id: string;
	title: string;
	username?: string;
	channelKey: string;
	isJoined: boolean;
	entity: unknown;
};

export type SearchMessageTarget = {
	kind: "message";
	id: string;
	title: string;
	username?: string;
	channelKey: string;
	messageId: number;
	text: string;
	isJoined: boolean;
	entity: unknown;
};

export type SearchResult = SearchChatTarget | SearchMessageTarget;
