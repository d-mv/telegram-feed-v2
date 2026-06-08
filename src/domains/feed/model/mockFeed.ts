import type { FeedItem } from "../../../types";

const baseMockFeed: FeedItem[] = [
	{
		id: "dm-1",
		channelKey: "dm:1",
		type: "dm",
		chatName: "Elena",
		senderName: "Elena",
		timestamp: "2 min ago",
		date: Date.now() / 1000 - 120,
		text: "Did you see the layout draft? I added a tighter card stack.",
		reactions: [
			{ emoji: "👍", count: 2 },
			{ emoji: "🔥", count: 1 },
		],
		isFocused: false,
		isRead: false,
		commentsCount: 4,
		media: {
			meta: {
				type: "image",
				width: 800,
				height: 500,
				sizeBytes: 280000,
			},
			url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
			alt: "Forest",
		},
	},
	{
		id: "group-1",
		channelKey: "group:1",
		type: "group",
		chatName: "Design Sync",
		senderName: "Maya",
		timestamp: "12 min ago",
		date: Date.now() / 1000 - 720,
		text: "New build is up. Please verify the dark theme contrast.",
		isFocused: false,
		isRead: true,
		commentsCount: 12,
	},
	{
		id: "poll-1",
		channelKey: "group:2",
		type: "group",
		chatName: "Product Updates",
		senderName: "Bot",
		timestamp: "20 min ago",
		date: Date.now() / 1000 - 1200,
		text: "Which release date works best for the new feed?",
		isFocused: false,
		isRead: false,
		poll: {
			id: "poll-1",
			question: "Which release date works best for the new feed?",
			options: [
				{
					text: "This Friday",
					option: new Uint8Array([0]),
					votersCount: 8,
					chosen: true,
				},
				{ text: "Next Monday", option: new Uint8Array([1]), votersCount: 5 },
				{ text: "End of sprint", option: new Uint8Array([2]), votersCount: 2 },
			],
			totalVoters: 15,
		},
	},
	{
		id: "dm-2",
		channelKey: "dm:2",
		type: "dm",
		chatName: "Vlad",
		senderName: "Vlad",
		timestamp: "25 min ago",
		date: Date.now() / 1000 - 1500,
		text: "Let's keep the feed minimal. I love the new typography.",
		reactions: [{ emoji: "✅", count: 3 }],
		isFocused: false,
		isRead: true,
	},
	{
		id: "group-2",
		channelKey: "group:3",
		type: "group",
		chatName: "Travel Photos",
		senderName: "Nina",
		timestamp: "40 min ago",
		date: Date.now() / 1000 - 2400,
		text: "A few shots from the weekend trip 📸",
		isFocused: false,
		isRead: true,
		mediaGroupKey: "trip-1",
		mediaItems: [
			{
				meta: { type: "image", width: 800, height: 600, sizeBytes: 310000 },
				url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
				alt: "Mountains",
			},
			{
				meta: { type: "image", width: 800, height: 600, sizeBytes: 290000 },
				url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80",
				alt: "Lake",
			},
			{
				meta: { type: "image", width: 800, height: 600, sizeBytes: 305000 },
				url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=800&q=80",
				alt: "Field",
			},
		],
	},
	{
		id: "group-3",
		channelKey: "group:4",
		type: "group",
		chatName: "Shipping",
		senderName: "Release Bot",
		timestamp: "1 hr ago",
		date: Date.now() / 1000 - 3600,
		text: "Shipping status: onboarding, login, and session persistence are done.",
		isFocused: false,
		isRead: true,
		commentsCount: 3,
		media: {
			meta: {
				type: "video",
				width: 800,
				height: 500,
				sizeBytes: 920000,
				mimeType: "video/mp4",
			},
			url: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80",
			alt: "Desk",
		},
	},
];

export function getMockFeed(): FeedItem[] {
	return baseMockFeed;
}

export function getMockFeedBatch(count: number): FeedItem[] {
	const result: FeedItem[] = [];
	for (let index = 0; index < count; index += 1) {
		const seed = baseMockFeed[index % baseMockFeed.length];
		const suffix = count - index;
		result.push({
			...seed,
			id: `${seed.id}-${suffix}`,
			timestamp: `${suffix * 3} min ago`,
			date: Date.now() / 1000 - suffix * 180,
			text: `${seed.text} (#${suffix})`,
		});
	}
	return result.reverse();
}
