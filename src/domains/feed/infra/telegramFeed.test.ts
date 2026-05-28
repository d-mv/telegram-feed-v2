import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const telegramMock = vi.hoisted(() => {
	class User {
		className = "User";
		id?: number;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class Message {
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class Photo {
		id?: number;
		sizes?: unknown[];
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class Document {
		id?: number;
		size?: number;
		mimeType?: string;
		attributes?: unknown[];
		thumbs?: unknown[];
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class DocumentAttributeVideo {
		w = 0;
		h = 0;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class DocumentAttributeImageSize {
		w = 0;
		h = 0;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class DocumentAttributeFilename {
		fileName = "";
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class DocumentAttributeAudio {
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class MessageMediaPhoto {
		className = "MessageMediaPhoto";
		photo?: Photo;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class MessageMediaDocument {
		className = "MessageMediaDocument";
		document?: Document;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class MessageMediaWebPage {
		className = "MessageMediaWebPage";
		webpage?: WebPage;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class WebPage {
		url = "";
		title = "";
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class MessageEntityUrl {
		offset = 0;
		length = 0;
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class MessageEntityTextUrl {
		offset = 0;
		length = 0;
		url = "";
		constructor(data: Record<string, unknown> = {}) {
			Object.assign(this, data);
		}
	}

	class GetUserPhotos {
		constructor(public data: Record<string, unknown> = {}) {}
	}

	return {
		User,
		Message,
		Photo,
		Document,
		DocumentAttributeVideo,
		DocumentAttributeImageSize,
		DocumentAttributeFilename,
		DocumentAttributeAudio,
		MessageMediaPhoto,
		MessageMediaDocument,
		MessageMediaWebPage,
		WebPage,
		MessageEntityUrl,
		MessageEntityTextUrl,
		photos: {
			GetUserPhotos,
		},
	};
});

vi.mock("telegram", () => ({
	Api: telegramMock,
}));

const ensureTelegramConnectedMock = vi.hoisted(() => vi.fn());
const createIndexedDbDalMock = vi.hoisted(() => vi.fn());

vi.mock("../../auth/infra/telegramAuth", () => ({
	ensureTelegramConnected: ensureTelegramConnectedMock,
}));

vi.mock("../../dal/indexedDbDal", () => ({
	createIndexedDbDal: createIndexedDbDalMock,
}));

import { Api } from "telegram";
import {
	clearAvatarCaches,
	downloadThumbnailForItem,
	downloadMediaForItem,
	fetchRecentFeed,
	getAvatarPhotoGallery,
	getAvatarPhotoUrl,
	getCachedMediaUrl,
	getMessageCommentsCount,
	getMediaPreview,
	mergeAlbumFeedItems,
	getPollPreview,
	sendMessageToFeedItem,
	toRelativeTime,
} from "./telegramFeed";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-02-08T00:00:00Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

beforeEach(() => {
	createIndexedDbDalMock.mockReturnValue({
		getMedia: vi.fn().mockResolvedValue(undefined),
		setMedia: vi.fn().mockResolvedValue(undefined),
	});
	vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
	vi.spyOn(globalThis, "fetch").mockResolvedValue({
		blob: async () => new Blob(["mock"]),
	} as Response);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("toRelativeTime", () => {
	test("formats seconds as just now", () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		expect(toRelativeTime(nowSeconds - 12)).toBe("Just now");
	});

	test("formats minutes, hours, and days", () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		expect(toRelativeTime(nowSeconds - 120)).toBe("2 min ago");
		expect(toRelativeTime(nowSeconds - 3 * 3600)).toBe("3 hr ago");
		expect(toRelativeTime(nowSeconds - 2 * 86400)).toBe("2 d ago");
	});
});

describe("getMediaPreview", () => {
	test("builds preview metadata for photos", () => {
		const photo = new Api.Photo({
			id: 42,
			sizes: [
				{ w: 100, h: 100, size: 800 },
				{ w: 200, h: 150, size: 1400 },
			],
		});
		const message = new Api.Message({
			id: 10,
			media: new Api.MessageMediaPhoto({ photo }),
		});

		const preview = getMediaPreview(message);

		expect(preview).toEqual({
			meta: {
				type: "image",
				width: 200,
				height: 150,
				sizeBytes: 1400,
				mimeType: "image/jpeg",
			},
			alt: "Photo",
			key: "photo-42",
		});
	});

	test("builds preview metadata for documents", () => {
		const document = new Api.Document({
			id: 7,
			size: 2048,
			mimeType: "video/mp4",
			attributes: [new Api.DocumentAttributeVideo({ w: 1280, h: 720 })],
		});
		const message = new Api.Message({
			id: 11,
			media: new Api.MessageMediaDocument({ document }),
		});

		const preview = getMediaPreview(message);

		expect(preview).toEqual({
			meta: {
				type: "video",
				width: 1280,
				height: 720,
				sizeBytes: 2048,
				mimeType: "video/mp4",
				fileName: "",
			},
			alt: "Media",
			key: "doc-7",
		});
	});

	test("builds file preview metadata for generic documents", () => {
		const document = new Api.Document({
			id: 8,
			size: 4096,
			mimeType: "application/pdf",
			attributes: [
				new Api.DocumentAttributeFilename({ fileName: "report.pdf" }),
			],
		});
		const message = new Api.Message({
			id: 12,
			media: new Api.MessageMediaDocument({ document }),
		});

		const preview = getMediaPreview(message);

		expect(preview).toEqual({
			meta: {
				type: "file",
				width: 0,
				height: 0,
				sizeBytes: 4096,
				mimeType: "application/pdf",
				fileName: "report.pdf",
			},
			alt: "Media",
			key: "doc-8",
		});
	});

	test("builds preview metadata for YouTube links in WebPage media", () => {
		const webpage = new Api.WebPage({
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			title: "Never Gonna Give You Up",
		});
		const message = new Api.Message({
			id: 13,
			media: new Api.MessageMediaWebPage({ webpage }),
		});

		const preview = getMediaPreview(message);

		expect(preview).toEqual({
			meta: {
				type: "youtube",
				width: 1280,
				height: 720,
				sizeBytes: 0,
				title: "Never Gonna Give You Up",
			},
			url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			alt: "Never Gonna Give You Up",
			key: "youtube-dQw4w9WgXcQ",
		});
	});

	test("builds YouTube preview from text entities when no media exists", () => {
		const message = new Api.Message({
			id: 14,
			message: "Check this out: https://youtu.be/dQw4w9WgXcQ",
			entities: [new Api.MessageEntityUrl({ offset: 16, length: 28 })],
		});

		const preview = getMediaPreview(message);

		expect(preview).toEqual({
			meta: {
				type: "youtube",
				width: 1280,
				height: 720,
				sizeBytes: 0,
				title: "YouTube Video",
			},
			url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			alt: "YouTube Video",
			key: "youtube-dQw4w9WgXcQ",
		});
	});

	test("builds YouTube preview for shorts and mobile links", () => {
		const shortsMessage = new Api.Message({
			id: 15,
			message: "Short: https://youtube.com/shorts/dQw4w9WgXcQ",
			entities: [new Api.MessageEntityUrl({ offset: 7, length: 38 })],
		});
		const mobileMessage = new Api.Message({
			id: 16,
			message: "Mobile: https://m.youtube.com/watch?v=dQw4w9WgXcQ",
			entities: [new Api.MessageEntityUrl({ offset: 8, length: 42 })],
		});

		const shortsPreview = getMediaPreview(shortsMessage);
		const mobilePreview = getMediaPreview(mobileMessage);

		expect(shortsPreview?.key).toBe("youtube-dQw4w9WgXcQ");
		expect(mobilePreview?.key).toBe("youtube-dQw4w9WgXcQ");
	});
});

describe("fetchRecentFeed", () => {
	test("filters messages and returns recent items", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const dialogUser = {
			id: 101,
			isUser: true,
			name: "Alice",
			entity: {},
		};
		const dialogGroup = {
			id: 202,
			isUser: false,
			title: "Team",
			entity: {},
		};
		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
			getMessages: vi
				.fn()
				.mockResolvedValueOnce([
					new Api.Message({
						id: 1,
						date: nowSeconds - 60,
						message: "hi",
						out: false,
						fromId: { userId: 2 },
					}),
					new Api.Message({
						id: 2,
						date: nowSeconds - 40,
						message: "outgoing",
						out: true,
					}),
					new Api.Message({
						id: 3,
						date: nowSeconds - 9 * 86400,
						message: "old",
						out: false,
					}),
				])
				.mockResolvedValueOnce([
					new Api.Message({
						id: 4,
						date: nowSeconds - 120,
						message: "group",
						out: false,
					}),
				]),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const items = await fetchRecentFeed(
			{ perChat: 10, maxAgeDays: 7 },
			ensureTelegramConnectedMock,
		);

		expect(items).toHaveLength(2);
		expect(items[0]?.id).toBe("dm-101-1");
		expect(items[0]?.type).toBe("dm");
		expect(items[1]?.id).toBe("group-202-4");
		expect(items[1]?.type).toBe("group");
	});

	test("merges grouped image albums into a single feed item", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const dialogGroup = {
			id: 202,
			isUser: false,
			title: "Team",
			entity: {},
		};

		const firstPhoto = new Api.Photo({
			id: 41,
			sizes: [{ w: 300, h: 200, size: 800 }],
		});
		const secondPhoto = new Api.Photo({
			id: 42,
			sizes: [{ w: 320, h: 240, size: 900 }],
		});

		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogGroup]),
			getMessages: vi.fn().mockResolvedValue([
				new Api.Message({
					id: 11,
					date: nowSeconds - 60,
					message: "",
					out: false,
					groupedId: 999n,
					getSender: vi.fn().mockResolvedValue({ firstName: "Alice" }),
					media: new Api.MessageMediaPhoto({ photo: secondPhoto }),
				}),
				new Api.Message({
					id: 10,
					date: nowSeconds - 61,
					message: "Album caption",
					out: false,
					groupedId: 999n,
					getSender: vi.fn().mockResolvedValue({ firstName: "Alice" }),
					media: new Api.MessageMediaPhoto({ photo: firstPhoto }),
				}),
			]),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const items = await fetchRecentFeed(
			{ perChat: 10, maxAgeDays: 7 },
			ensureTelegramConnectedMock,
		);

		expect(items).toHaveLength(1);
		expect(items[0]?.text).toBe("Album caption");
		expect(items[0]?.senderName).toBe("Alice");
		expect(items[0]?.mediaItems).toHaveLength(2);
		expect(items[0]?.mediaItems?.map((media) => media.key)).toEqual([
			"photo-42",
			"photo-41",
		]);
	});

	test("fetches dialogs concurrently instead of blocking on each chat in sequence", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const firstResolve = vi.fn();
		let releaseFirstDialog: (() => void) | null = null;
		const dialogUser = {
			id: 101,
			isUser: true,
			name: "Alice",
			entity: { id: "first" },
		};
		const dialogGroup = {
			id: 202,
			isUser: false,
			title: "Team",
			entity: { id: "second" },
		};
		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
			getMessages: vi.fn().mockImplementation((entity: { id: string }) => {
				if (entity.id === "first") {
					return new Promise((resolve) => {
						releaseFirstDialog = () => {
							firstResolve();
							resolve([
								new Api.Message({
									id: 1,
									date: nowSeconds - 60,
									message: "hi",
									out: false,
									fromId: { userId: 2 },
								}),
							]);
						};
					});
				}
				return Promise.resolve([
					new Api.Message({
						id: 2,
						date: nowSeconds - 30,
						message: "group",
						out: false,
					}),
				]);
			}),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const itemsPromise = fetchRecentFeed(
			{ perChat: 10, maxAgeDays: 7 },
			ensureTelegramConnectedMock,
		);

		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(client.getMessages).toHaveBeenCalledTimes(2);
		expect(firstResolve).not.toHaveBeenCalled();

		releaseFirstDialog?.();
		const items = await itemsPromise;

		expect(items).toHaveLength(2);
	});

	test("limits concurrent getMessages calls to CONCURRENCY_LIMIT even when there are many dialogs", async () => {
		const DIALOG_COUNT = 8;
		const CONCURRENCY_LIMIT = 5;
		const nowSeconds = Math.floor(Date.now() / 1000);

		let peakInFlight = 0;
		let currentInFlight = 0;
		const resolvers: Array<() => void> = [];

		const dialogs = Array.from({ length: DIALOG_COUNT }, (_, i) => ({
			id: 100 + i,
			isUser: true,
			name: `User${i}`,
			entity: { id: String(i) },
		}));

		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue(dialogs),
			getMessages: vi.fn().mockImplementation(() => {
				currentInFlight++;
				peakInFlight = Math.max(peakInFlight, currentInFlight);
				return new Promise<unknown[]>((resolve) => {
					resolvers.push(() => {
						currentInFlight--;
						resolve([
							new Api.Message({
								id: 1,
								date: nowSeconds - 60,
								message: "hi",
								out: false,
								fromId: { userId: 2 },
							}),
						]);
					});
				});
			}),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const feedPromise = fetchRecentFeed(
			{ perChat: 10, maxAgeDays: 7 },
			ensureTelegramConnectedMock,
		);

		// Yield enough microtasks for the concurrency pool to fill up
		for (let i = 0; i < 20; i++) await Promise.resolve();

		expect(peakInFlight).toBe(CONCURRENCY_LIMIT);

		// Drain all pending resolvers
		while (resolvers.length > 0) {
			resolvers.splice(0).forEach((r) => r());
			for (let i = 0; i < 10; i++) await Promise.resolve();
		}

		await feedPromise;
		expect(client.getMessages).toHaveBeenCalledTimes(DIALOG_COUNT);
	});

	test("does not resolve sender entities for direct messages", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const getSender = vi.fn().mockResolvedValue({ firstName: "Ignored" });
		const dialogUser = {
			id: 101,
			isUser: true,
			name: "Alice",
			entity: {},
		};
		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogUser]),
			getMessages: vi.fn().mockResolvedValue([
				new Api.Message({
					id: 1,
					date: nowSeconds - 60,
					message: "hi",
					out: false,
					fromId: { userId: 2 },
					getSender,
				}),
			]),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const items = await fetchRecentFeed(
			{ perChat: 10, maxAgeDays: 7 },
			ensureTelegramConnectedMock,
		);

		expect(items).toHaveLength(1);
		expect(items[0]?.senderName).toBe("Alice");
		expect(getSender).not.toHaveBeenCalled();
	});

	test("fetches only messages newer than the cached latest item for each chat", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const dialogUser = {
			id: 101,
			isUser: true,
			name: "Alice",
			entity: { id: "first" },
		};
		const dialogGroup = {
			id: 202,
			isUser: false,
			title: "Team",
			entity: { id: "second" },
		};
		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
			getMessages: vi
				.fn()
				.mockResolvedValueOnce([
					new Api.Message({
						id: 11,
						date: nowSeconds - 30,
						message: "new dm",
						out: false,
						fromId: { userId: 2 },
					}),
				])
				.mockResolvedValueOnce([
					new Api.Message({
						id: 9,
						date: nowSeconds - 40,
						message: "new group",
						out: false,
					}),
				]),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const items = await fetchRecentFeed(
			{
				perChat: 10,
				maxAgeDays: 7,
				latestMessageIdsByChat: {
					"dm:101": 10,
					"group:202": 8,
				},
			},
			ensureTelegramConnectedMock,
		);

		expect(client.getMessages).toHaveBeenNthCalledWith(
			1,
			dialogUser.entity,
			expect.objectContaining({
				minId: 10,
				maxId: 2147483647,
				limit: undefined,
			}),
		);
		expect(client.getMessages).toHaveBeenNthCalledWith(
			2,
			dialogGroup.entity,
			expect.objectContaining({
				minId: 8,
				maxId: 2147483647,
				limit: undefined,
			}),
		);

		expect(items).toHaveLength(2);
		expect(items[0]?.id).toBe("dm-101-11");
		expect(items[1]?.id).toBe("group-202-9");
	});

	test("fetches only messages older than the cached oldest item for each chat", async () => {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const dialogUser = {
			id: 101,
			isUser: true,
			name: "Alice",
			entity: { id: "first" },
		};
		const client = {
			getMe: vi.fn().mockResolvedValue({ id: 1 }),
			getDialogs: vi.fn().mockResolvedValue([dialogUser]),
			getMessages: vi.fn().mockResolvedValue([
				new Api.Message({
					id: 9,
					date: nowSeconds - 120,
					message: "older dm",
					out: false,
					fromId: { userId: 2 },
				}),
			]),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);

		const items = await fetchRecentFeed(
			{
				perChat: 10,
				oldestMessageIdsByChat: {
					"dm:101": 10,
				},
			},
			ensureTelegramConnectedMock,
		);

		expect(client.getMessages).toHaveBeenCalledWith(
			dialogUser.entity,
			expect.objectContaining({
				maxId: 10,
				limit: 10,
			}),
		);

		expect(items).toHaveLength(1);
		expect(items[0]?.id).toBe("dm-101-9");
	});
});

describe("avatar helpers", () => {
	test("reads latest avatar from gallery and caches it", async () => {
		const client = {
			invoke: vi.fn().mockResolvedValue({
				photos: [new Api.Photo({ id: 11 }), new Api.Photo({ id: 12 })],
			}),
			downloadMedia: vi
				.fn()
				.mockResolvedValueOnce(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
				.mockResolvedValueOnce(new Uint8Array([0xff, 0xd8, 0xff])),
			downloadProfilePhoto: vi.fn(),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		const first = await getAvatarPhotoUrl(
			new Api.User({ id: 1 }),
			"avatar:test",
			ensureTelegramConnectedMock,
		);
		const second = await getAvatarPhotoUrl(
			new Api.User({ id: 1 }),
			"avatar:test",
			ensureTelegramConnectedMock,
		);

		expect(first).toBe("blob:mock");
		expect(second).toBe("blob:mock");
		expect(client.invoke).toHaveBeenCalledTimes(1);
		expect(client.downloadProfilePhoto).not.toHaveBeenCalled();
	});

	test("falls back to profile photo when gallery is empty", async () => {
		const client = {
			invoke: vi.fn().mockResolvedValue({ photos: [] }),
			downloadMedia: vi.fn(),
			downloadProfilePhoto: vi
				.fn()
				.mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		const url = await getAvatarPhotoUrl(
			new Api.User({ id: 2 }),
			"avatar:profile",
			ensureTelegramConnectedMock,
		);
		expect(url).toBe("blob:mock");
		expect(client.downloadProfilePhoto).toHaveBeenCalled();
	});

	test("returns avatar gallery and handles invalid entity", async () => {
		const client = {
			invoke: vi.fn().mockResolvedValue({
				photos: [new Api.Photo({ id: 22 })],
			}),
			downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		const gallery = await getAvatarPhotoGallery(
			new Api.User({ id: 2 }),
			"avatar:gallery",
			ensureTelegramConnectedMock,
		);
		const empty = await getAvatarPhotoGallery(
			undefined,
			"avatar:none",
			ensureTelegramConnectedMock,
		);

		expect(gallery).toEqual(["blob:mock"]);
		expect(empty).toEqual([]);
	});

	test("clears cached avatar object urls", async () => {
		const revokeObjectURL = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});
		vi.spyOn(URL, "createObjectURL")
			.mockReturnValueOnce("blob:gallery-1")
			.mockReturnValueOnce("blob:gallery-2")
			.mockReturnValueOnce("blob:profile");

		const client = {
			invoke: vi.fn().mockResolvedValue({
				photos: [new Api.Photo({ id: 1 }), new Api.Photo({ id: 2 })],
			}),
			downloadMedia: vi
				.fn()
				.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
				.mockResolvedValueOnce(new Uint8Array([4, 5, 6])),
			downloadProfilePhoto: vi
				.fn()
				.mockResolvedValue(new Uint8Array([7, 8, 9])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		await getAvatarPhotoGallery(
			new Api.User({ id: 1 }),
			"avatar:gallery-clear",
			ensureTelegramConnectedMock,
		);
		await getAvatarPhotoUrl(
			new Api.User({ id: 2 }),
			"avatar:profile-clear",
			ensureTelegramConnectedMock,
		);

		clearAvatarCaches();

		expect(revokeObjectURL).toHaveBeenCalledWith("blob:gallery-1");
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:gallery-2");
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile");
	});
});

describe("message helpers", () => {
	test("extracts message comments count", () => {
		expect(
			getMessageCommentsCount(new Api.Message({ replies: { replies: 3 } })),
		).toBe(3);
		expect(
			getMessageCommentsCount(new Api.Message({ replies: { replies: 2n } })),
		).toBe(2);
		expect(getMessageCommentsCount(new Api.Message({}))).toBe(0);
	});

	test("extracts poll preview data", () => {
		const poll = {
			id: 12345n,
			question: "Dinner?",
			answers: [
				{ text: "Pizza", option: new Uint8Array([48]) },
				{ text: "Sushi", option: new Uint8Array([49]) },
			],
			closed: false,
			multipleChoice: true,
			quiz: false,
			publicVoters: true,
		};
		const results = {
			results: [
				{ option: new Uint8Array([48]), voters: 10, chosen: true },
				{ option: new Uint8Array([49]), voters: 5, chosen: false },
			],
			totalVoters: 15,
		};
		const message = new Api.Message({
			media: {
				className: "MessageMediaPoll",
				poll,
				results,
			},
		});

		const preview = getPollPreview(message);
		expect(preview).toEqual({
			id: "12345",
			question: "Dinner?",
			options: [
				{
					text: "Pizza",
					option: new Uint8Array([48]),
					votersCount: 10,
					chosen: true,
					correct: undefined,
				},
				{
					text: "Sushi",
					option: new Uint8Array([49]),
					votersCount: 5,
					chosen: false,
					correct: undefined,
				},
			],
			totalVoters: 15,
			closed: false,
			multipleChoice: true,
			quiz: false,
			publicVoters: true,
			recentVoters: undefined,
		});
	});

	test("returns undefined for non-poll media", () => {
		const message = new Api.Message({
			media: { className: "MessageMediaPhoto" },
		});
		expect(getPollPreview(message)).toBeUndefined();
	});

	test("sends messages with trimmed text and throws for invalid source", async () => {
		const sendMessage = vi.fn().mockResolvedValue(
			new Api.Message({
				id: 99,
				date: 1_707_000_000,
				message: "hi",
				out: true,
			}),
		);
		ensureTelegramConnectedMock.mockResolvedValue({ sendMessage });

		const sourceMessage = new Api.Message({
			getInputChat: vi.fn().mockResolvedValue("chat"),
		});
		Object.assign(sourceMessage, { id: 123 });

		const result = await sendMessageToFeedItem(
			{
				id: "group-1-123",
				type: "group",
				channelKey: "group:1",
				chatName: "Team",
				senderName: "Team",
				timestamp: "now",
				text: "",
				sourceMessage,
				isFocused: false,
			},
			"  hi  ",
			ensureTelegramConnectedMock,
		);
		expect(sendMessage).toHaveBeenCalledWith(
			"chat",
			expect.objectContaining({
				message: "hi",
				replyTo: 123,
			}),
		);
		expect(result).toMatchObject({
			id: "99",
			channelKey: "group:1",
			type: "group",
			chatName: "Team",
			senderName: "You",
			text: "hi",
		});

		await expect(
			sendMessageToFeedItem(
				{
					id: "group-2",
					type: "group",
					chatName: "Team",
					timestamp: "now",
					text: "",
					sourceMessage: null as any,
					isFocused: false,
				},
				"hello",
				ensureTelegramConnectedMock,
			),
		).rejects.toThrow("Cannot send message for this conversation");
	});

	test("re-hydrates cached source message before sending", async () => {
		const sourceMessage = new Api.Message({ id: 123 });
		Object.assign(sourceMessage, { id: 123, getInputChat: () => "chat" });
		const sendMessage = vi
			.fn()
			.mockResolvedValue(new Api.Message({ id: 100, date: 1700000000 }));
		const getMessages = vi.fn().mockResolvedValue([sourceMessage]);
		ensureTelegramConnectedMock.mockResolvedValue({ sendMessage, getMessages });

		const result = await sendMessageToFeedItem(
			{
				id: "group-1-123",
				channelKey: "group:1",
				type: "group",
				chatName: "Team",
				senderName: "Team",
				timestamp: "now",
				text: "",
				sourceMessage: { id: 123 }, // Plain object from cache
				isFocused: false,
			},
			"hi",
			ensureTelegramConnectedMock,
		);

		expect(getMessages).toHaveBeenCalledWith(1n, { ids: [123] });
		expect(sendMessage).toHaveBeenCalledWith(
			"chat",
			expect.objectContaining({
				message: "hi",
				replyTo: 123,
			}),
		);
		expect(result).toBeDefined();
	});
});

describe("downloadMediaForItem", () => {
	test("passes through NativeBigInt progress values to callback", async () => {
		const sourceMessage = new Api.Message({ id: 55 });
		const item = {
			id: "group-1-55",
			type: "group" as const,
			chatName: "Team",
			timestamp: "now",
			text: "video",
			media: {
				meta: {
					type: "video" as const,
					width: 640,
					height: 360,
					sizeBytes: 1000,
					mimeType: "video/mp4",
				},
				alt: "Media",
			},
			sourceMessage,
		};
		const progress = vi.fn();
		const client = {
			downloadMedia: vi
				.fn()
				.mockImplementation((_message, options?: unknown) => {
					const callback = (
						options as { progressCallback?: (d: unknown, t: unknown) => void }
					)?.progressCallback;
					callback?.({ value: 131072n }, { value: 10289371n });
					return undefined;
				}),
		};

		ensureTelegramConnectedMock.mockResolvedValue(client);
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia: vi.fn().mockResolvedValue(undefined),
		};

		await downloadMediaForItem(
			item,
			ensureTelegramConnectedMock,
			dal,
			progress,
		);

		expect(progress).toHaveBeenCalledWith(
			expect.objectContaining({ value: 131072n }),
			expect.objectContaining({ value: 10289371n }),
		);
	});

	test("returns undefined for missing media and cached media for existing blob", async () => {
		const dal = {
			getMedia: vi
				.fn()
				.mockResolvedValueOnce(new Blob(["x"]))
				.mockResolvedValueOnce(undefined),
			setMedia: vi.fn(),
		};
		ensureTelegramConnectedMock.mockResolvedValue({ downloadMedia: vi.fn() });

		const cached = await getCachedMediaUrl(
			{
				id: "group-1",
				type: "group",
				chatName: "Team",
				timestamp: "now",
				text: "x",
				media: {
					key: "key-1",
					meta: {
						type: "file",
						width: 0,
						height: 0,
						sizeBytes: 1,
						mimeType: "text/plain",
					},
					alt: "x",
				},
				isFocused: false,
			},
			dal,
		);

		const none = await downloadMediaForItem(
			{
				id: "group-2",
				type: "group",
				chatName: "Team",
				timestamp: "now",
				text: "x",
				isFocused: false,
			},
			ensureTelegramConnectedMock,
			dal,
		);

		expect(cached).toBe("blob:mock");
		expect(none).toBeUndefined();
	});

	test("stores downloaded media without refetching blob urls", async () => {
		const setMedia = vi.fn().mockResolvedValue(undefined);
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia,
		};
		const client = {
			downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		const url = await downloadMediaForItem(
			{
				id: "group-3",
				type: "group",
				chatName: "Team",
				timestamp: "now",
				text: "file",
				media: {
					key: "key-3",
					meta: {
						type: "file",
						width: 0,
						height: 0,
						sizeBytes: 3,
						mimeType: "application/pdf",
					},
					alt: "file",
				},
				sourceMessage: new Api.Message({ id: 3 }),
				isFocused: false,
			},
			ensureTelegramConnectedMock,
			dal,
		);

		expect(url).toBe("blob:mock");
		expect(globalThis.fetch).not.toHaveBeenCalled();
		expect(setMedia).toHaveBeenCalledWith("key-3", expect.any(Blob));
	});

	test("resolves a cached item source message before downloading full media", async () => {
		const setMedia = vi.fn().mockResolvedValue(undefined);
		const sourceMessage = new Api.Message({ id: 44 });
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia,
		};
		const client = {
			getMessages: vi.fn().mockResolvedValue([sourceMessage]),
			downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);

		const url = await downloadMediaForItem(
			{
				id: "group-77-44",
				type: "group",
				channelKey: "group:77",
				chatName: "Team",
				timestamp: "now",
				text: "cached file",
				media: {
					key: "key-44",
					meta: {
						type: "file",
						width: 0,
						height: 0,
						sizeBytes: 3,
						mimeType: "application/pdf",
					},
					alt: "file",
				},
				isFocused: false,
			},
			ensureTelegramConnectedMock,
			dal,
		);

		expect(client.getMessages).toHaveBeenCalledWith(77n, { ids: [44] });
		expect(client.downloadMedia).toHaveBeenCalledWith(sourceMessage, {
			progressCallback: undefined,
		});
		expect(url).toBe("blob:mock");
		expect(setMedia).toHaveBeenCalledWith("key-44", expect.any(Blob));
	});

	test("downloads thumbnail and handles no-video-thumb case", async () => {
		const sourceMessage = new Api.Message({
			id: 99,
			media: new Api.MessageMediaDocument({
				document: new Api.Document({ thumbs: [] }),
			}),
		});
		const client = {
			downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia: vi.fn().mockResolvedValue(undefined),
		};

		const noThumb = await downloadThumbnailForItem(
			{
				id: "group-video",
				type: "group",
				chatName: "Team",
				timestamp: "now",
				text: "",
				media: {
					meta: {
						type: "video",
						width: 640,
						height: 360,
						sizeBytes: 10,
						mimeType: "video/mp4",
					},
					alt: "video",
				},
				sourceMessage,
				isFocused: false,
			},
			320,
			ensureTelegramConnectedMock,
			dal,
		);

		expect(noThumb).toBeUndefined();
	});

	test("resolves a cached item source message before downloading a thumbnail", async () => {
		const sourceMessage = new Api.Message({
			id: 99,
			media: new Api.MessageMediaPhoto({
				photo: new Api.Photo({
					sizes: [{ w: 640, h: 480, size: 1000 }],
				}),
			}),
		});
		const client = {
			getMessages: vi.fn().mockResolvedValue([sourceMessage]),
			downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		};
		ensureTelegramConnectedMock.mockResolvedValue(client);
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia: vi.fn().mockResolvedValue(undefined),
		};

		const thumbUrl = await downloadThumbnailForItem(
			{
				id: "group-55-99",
				type: "group",
				channelKey: "group:55",
				chatName: "Team",
				timestamp: "now",
				text: "",
				media: {
					key: "photo-99",
					meta: {
						type: "image",
						width: 640,
						height: 480,
						sizeBytes: 10,
						mimeType: "image/jpeg",
					},
					alt: "photo",
				},
				isFocused: false,
			},
			320,
			ensureTelegramConnectedMock,
			dal,
		);

		expect(client.getMessages).toHaveBeenCalledWith(55n, { ids: [99] });
		expect(client.downloadMedia).toHaveBeenCalledWith(
			sourceMessage,
			expect.objectContaining({ thumb: expect.anything() }),
		);
		expect(thumbUrl).toBe("blob:mock");
	});

	test("concurrent downloadMediaForItem calls for the same item share one Telegram request", async () => {
		let resolveDownload!: (value: Uint8Array) => void;
		const downloadMedia = vi.fn().mockReturnValue(
			new Promise<Uint8Array>((res) => {
				resolveDownload = res;
			}),
		);
		ensureTelegramConnectedMock.mockResolvedValue({ downloadMedia });

		const sourceMessage = new Api.Message({
			id: 5,
			media: new Api.MessageMediaPhoto({ photo: new Api.Photo({ id: 5 }) }),
		});
		const item = {
			id: "group-5-5",
			type: "group" as const,
			chatName: "Team",
			timestamp: "now",
			text: "",
			media: {
				key: "dedup-key",
				meta: {
					type: "image" as const,
					width: 100,
					height: 100,
					sizeBytes: 100,
					mimeType: "image/jpeg",
				},
				alt: "img",
			},
			sourceMessage,
			isFocused: false,
		};
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia: vi.fn().mockResolvedValue(undefined),
		};

		const [p1, p2] = [
			downloadMediaForItem(item, ensureTelegramConnectedMock, dal),
			downloadMediaForItem(item, ensureTelegramConnectedMock, dal),
		];

		resolveDownload(new Uint8Array([0xff, 0xd8, 0xff]));
		await Promise.all([p1, p2]);

		expect(downloadMedia).toHaveBeenCalledTimes(1);
	});

	test("concurrent downloadThumbnailForItem calls for the same key share one Telegram request", async () => {
		let resolveDownload!: (value: Uint8Array) => void;
		const downloadMedia = vi.fn().mockReturnValue(
			new Promise<Uint8Array>((res) => {
				resolveDownload = res;
			}),
		);
		ensureTelegramConnectedMock.mockResolvedValue({ downloadMedia });

		const sourceMessage = new Api.Message({
			id: 7,
			media: new Api.MessageMediaPhoto({
				photo: new Api.Photo({
					id: 7,
					sizes: [{ w: 320, h: 240 }],
				}),
			}),
		});
		const item = {
			id: "group-7-7",
			type: "group" as const,
			chatName: "Team",
			timestamp: "now",
			text: "",
			media: {
				key: "thumb-dedup-key",
				meta: {
					type: "image" as const,
					width: 320,
					height: 240,
					sizeBytes: 1024,
					mimeType: "image/jpeg",
				},
				alt: "thumb",
			},
			sourceMessage,
			isFocused: false,
		};
		const dal = {
			getMedia: vi.fn().mockResolvedValue(undefined),
			setMedia: vi.fn().mockResolvedValue(undefined),
		};

		const [p1, p2] = [
			downloadThumbnailForItem(item, 320, ensureTelegramConnectedMock, dal),
			downloadThumbnailForItem(item, 320, ensureTelegramConnectedMock, dal),
		];

		resolveDownload(new Uint8Array([0xff, 0xd8, 0xff]));
		await Promise.all([p1, p2]);

		expect(downloadMedia).toHaveBeenCalledTimes(1);
	});
});

describe("mergeAlbumFeedItems", () => {
	const imageMedia = (key: string) => ({
		meta: { type: "image" as const, width: 100, height: 100, sizeBytes: 0 },
		alt: key,
		key,
	});

	function makeItem(id: string, groupKey: string, mediaKey: string) {
		return {
			id,
			type: "group" as const,
			chatName: "Test",
			timestamp: "now",
			date: 1000,
			text: "",
			isFocused: false,
			channelKey: "group:1",
			mediaGroupKey: groupKey,
			media: imageMedia(mediaKey),
			reactions: [],
		};
	}

	test("merges consecutive album items into a single item with mediaItems", () => {
		const a = makeItem("g1-1", "g1", "photo-1");
		const b = makeItem("g1-2", "g1", "photo-2");

		const result = mergeAlbumFeedItems([a, b]);

		expect(result).toHaveLength(1);
		expect(result[0]?.mediaItems).toHaveLength(2);
		expect(result[0]?.mediaItems?.map((m) => m.key)).toEqual([
			"photo-1",
			"photo-2",
		]);
	});

	test("does not mutate original input items", () => {
		const a = makeItem("g1-1", "g1", "photo-1");
		const b = makeItem("g1-2", "g1", "photo-2");
		const originalAMediaItems = a.mediaItems;

		mergeAlbumFeedItems([a, b]);

		expect(a.mediaItems).toBe(originalAMediaItems);
	});

	test("keeps items from different groups separate", () => {
		const a = makeItem("g1-1", "g1", "photo-1");
		const b = makeItem("g2-1", "g2", "photo-2");

		const result = mergeAlbumFeedItems([a, b]);

		expect(result).toHaveLength(2);
	});

	test("result items are not the same reference as input items", () => {
		const a = makeItem("g1-1", "g1", "photo-1");
		const b = makeItem("g1-2", "g1", "photo-2");

		const result = mergeAlbumFeedItems([a, b]);

		expect(result[0]).not.toBe(a);
	});
});
