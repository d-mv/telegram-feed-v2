import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedItem } from "../../../types";
import {
	downloadMediaForItem,
	getCachedMediaUrl,
} from "../../../domains/feed/infra/telegramFeed";
import { AppContext } from "../../../domains/app/AppContext";
import { Media } from "./Media";

const mockDal = {
	getMedia: vi.fn().mockResolvedValue(undefined),
	setMedia: vi.fn().mockResolvedValue(undefined),
} as never;

function Wrapper({ children }: { children: ReactNode }) {
	return (
		<AppContext.Provider
			value={
				{
					ensureTelegramConnected: vi.fn(),
					dal: mockDal,
				} as never
			}
		>
			{children}
		</AppContext.Provider>
	);
}

vi.mock("../../../domains/feed/infra/telegramFeed", () => ({
	downloadMediaForItem: vi.fn(),
	downloadThumbnailForItem: vi.fn().mockResolvedValue(undefined),
	getCachedMediaUrl: vi.fn().mockResolvedValue(undefined),
}));

const { downloadThumbnailForItem } = await import(
	"../../../domains/feed/infra/telegramFeed"
);

describe("blob URL cleanup", () => {
	it("revokes blob previewUrl on unmount to prevent memory leak", async () => {
		const blobUrl = "blob:http://localhost/preview-123";
		vi.mocked(downloadThumbnailForItem).mockResolvedValueOnce(blobUrl);
		const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

		const item: FeedItem = {
			id: "img-leak",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "image", width: 100, height: 100, sizeBytes: 0 },
				alt: "img",
			},
			isFocused: false,
		};

		const { unmount } = render(<Media item={item} />, { wrapper: Wrapper });
		await screen.findByRole("img");

		unmount();

		expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
		revokeSpy.mockRestore();
	});

	it("revokes blob videoUrl on unmount to prevent memory leak", async () => {
		const blobUrl = "blob:http://localhost/video-456";
		vi.mocked(getCachedMediaUrl).mockResolvedValueOnce(blobUrl);
		const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

		const item: FeedItem = {
			id: "vid-leak",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 0 },
				url: "https://example.com/poster.jpg",
				alt: "vid",
			},
			isFocused: false,
		};

		const { unmount } = render(<Media item={item} />, { wrapper: Wrapper });
		await screen.findByRole("button", { name: "Play" });

		unmount();

		expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
		revokeSpy.mockRestore();
	});
});

describe("YouTube iframe", () => {
	function youtubeItem(key: string): FeedItem {
		return {
			id: "yt-1",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				key,
				url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
				meta: { type: "youtube", title: "Test video" } as never,
				alt: "video",
			},
		};
	}

	it("renders iframe with sandbox attribute for valid YouTube ID", () => {
		const { container } = render(
			<Media item={youtubeItem("youtube-dQw4w9WgXcQ")} />,
			{ wrapper: Wrapper },
		);
		const iframe = container.querySelector("iframe");
		expect(iframe).toBeTruthy();
		expect(iframe!.getAttribute("sandbox")).toBeTruthy();
	});

	it("does not render iframe when YouTube ID is invalid", () => {
		const { container } = render(
			<Media item={youtubeItem("youtube-<script>alert(1)</script>")} />,
			{ wrapper: Wrapper },
		);
		expect(container.querySelector("iframe")).toBeNull();
	});

	it("does not render iframe when YouTube ID is missing", () => {
		const { container } = render(<Media item={youtubeItem("youtube-")} />, {
			wrapper: Wrapper,
		});
		expect(container.querySelector("iframe")).toBeNull();
	});
});

describe("Media video controls", () => {
	it("uses a dedicated controls container class instead of the media root container class", async () => {
		vi.mocked(getCachedMediaUrl).mockResolvedValueOnce("blob:test");

		const item: FeedItem = {
			id: "video-1",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "video",
			media: {
				meta: {
					type: "video",
					width: 640,
					height: 360,
					sizeBytes: 1024,
				},
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const { container } = render(<Media item={item} />, { wrapper: Wrapper });

		const mediaContainer = container.querySelector('[data-media-type="video"]');
		const playButton = await screen.findByRole("button", { name: "Play" });
		const controlsContainer = playButton.parentElement;

		expect(mediaContainer).toBeTruthy();
		expect(controlsContainer).toBeTruthy();
		expect(controlsContainer).not.toBe(mediaContainer);
	});

	it("updates video download progress when total is provided", async () => {
		let progressHandler:
			| ((downloaded: number, total: number) => void)
			| undefined;
		let resolveDownload: ((value: string | undefined) => void) | undefined;

		vi.mocked(downloadMediaForItem).mockImplementationOnce(
			(_, __, _dal, onProgress) => {
				progressHandler = onProgress;
				return new Promise<string | undefined>((resolve) => {
					resolveDownload = resolve;
				});
			},
		);

		const item: FeedItem = {
			id: "video-2",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "video",
			media: {
				meta: {
					type: "video",
					width: 640,
					height: 360,
					sizeBytes: 1000,
				},
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const user = userEvent.setup();
		render(<Media item={item} />, { wrapper: Wrapper });
		await user.click(screen.getByRole("button", { name: /download/i }));

		act(() => {
			progressHandler?.(500, 1000);
		});
		expect(await screen.findByText("50%")).toBeInTheDocument();
		await act(async () => {
			resolveDownload?.("blob:test");
		});
	});

	it("renders icon-only download button with accessible label", () => {
		const item: FeedItem = {
			id: "video-3",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "video",
			media: {
				meta: {
					type: "video",
					width: 640,
					height: 360,
					sizeBytes: 1000,
				},
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });

		const button = screen.getByRole("button", { name: /download/i });
		expect(button).toBeInTheDocument();
		expect(button).not.toHaveTextContent(/download/i);
	});

	it("renders grayscale by default and allows full color when disabled", () => {
		const item: FeedItem = {
			id: "image-1",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "image",
			media: {
				meta: {
					type: "image",
					width: 640,
					height: 360,
					sizeBytes: 1000,
				},
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const { container, rerender } = render(<Media item={item} />, {
			wrapper: Wrapper,
		});
		expect((container.firstChild as HTMLElement).style.filter).toMatch(
			/grayscale/,
		);

		rerender(
			<Wrapper>
				<Media item={item} grayscale={false} />
			</Wrapper>,
		);
		expect((container.firstChild as HTMLElement).style.filter).not.toMatch(
			/grayscale/,
		);
	});

	it("allows overriding the media aspect ratio for grouped galleries", () => {
		const item: FeedItem = {
			id: "image-override",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "image",
			media: {
				meta: {
					type: "image",
					width: 640,
					height: 360,
					sizeBytes: 1000,
				},
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const { container } = render(
			<Media item={item} aspectRatioOverride="1 / 1" />,
			{ wrapper: Wrapper },
		);
		expect(container.firstChild).toHaveStyle({ aspectRatio: "1 / 1" });
	});

	it("renders attachment card for non-image/video media", () => {
		const item: FeedItem = {
			id: "file-1",
			type: "group",
			chatName: "Docs",
			timestamp: "now",
			text: "file",
			media: {
				meta: {
					type: "file",
					width: 0,
					height: 0,
					sizeBytes: 2048,
					mimeType: "application/pdf",
					fileName: "spec.pdf",
				},
				alt: "file",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });

		expect(screen.getByText("spec.pdf")).toBeInTheDocument();
		expect(screen.getByText("2 KB")).toBeInTheDocument();
		expect(document.querySelector("svg")).toBeTruthy();
	});

	it("renders named video documents as videos", async () => {
		vi.mocked(getCachedMediaUrl).mockResolvedValueOnce("blob:test");

		const item: FeedItem = {
			id: "file-2",
			type: "group",
			chatName: "Docs",
			timestamp: "now",
			text: "file",
			media: {
				meta: {
					type: "video",
					width: 640,
					height: 360,
					sizeBytes: 4096,
					mimeType: "video/mp4",
					fileName: "clip.mp4",
				},
				url: "https://example.com/poster.jpg",
				alt: "file",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });

		expect(await screen.findByLabelText("Video media")).toBeInTheDocument();
		expect(screen.queryByText("clip.mp4")).not.toBeInTheDocument();
	});
});

describe("thumbnail fetching", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches thumbnail when media has no url", async () => {
		const thumbnailUrl = "blob:http://localhost/thumb-abc";
		vi.mocked(downloadThumbnailForItem).mockResolvedValueOnce(thumbnailUrl);

		const item: FeedItem = {
			id: "img-no-url",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "image", width: 100, height: 100, sizeBytes: 0 },
				alt: "img",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });
		const img = await screen.findByRole("img");
		expect(img).toHaveAttribute("src", thumbnailUrl);
	});

	it("skips thumbnail fetch when media already has a url", () => {
		const item: FeedItem = {
			id: "img-with-url",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "image", width: 100, height: 100, sizeBytes: 0 },
				url: "https://example.com/image.jpg",
				alt: "img",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });
		expect(vi.mocked(downloadThumbnailForItem)).not.toHaveBeenCalled();
	});
});

describe("download flow", () => {
	it("sets previewUrl after successful large-image download", async () => {
		const downloadedUrl = "blob:http://localhost/dl-img";
		vi.mocked(downloadMediaForItem).mockResolvedValueOnce(downloadedUrl);

		const item: FeedItem = {
			id: "img-dl",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "image", width: 640, height: 480, sizeBytes: 600000 },
				url: "https://example.com/large.jpg",
				alt: "img",
			},
		};

		const user = userEvent.setup();
		render(<Media item={item} />, { wrapper: Wrapper });
		await user.click(screen.getByRole("button", { name: /download/i }));
		const img = await screen.findByRole("img");
		expect(img).toHaveAttribute("src", downloadedUrl);
	});

	it("shows error message when download throws", async () => {
		vi.mocked(downloadMediaForItem).mockRejectedValueOnce(
			new Error("network error"),
		);

		const item: FeedItem = {
			id: "video-err",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 1000 },
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const user = userEvent.setup();
		render(<Media item={item} />, { wrapper: Wrapper });
		await user.click(screen.getByRole("button", { name: /download/i }));
		expect(await screen.findByText("network error")).toBeInTheDocument();
	});

	it("shows an actionable video error when download returns undefined", async () => {
		vi.mocked(downloadMediaForItem).mockResolvedValueOnce(undefined);

		const item: FeedItem = {
			id: "video-undef",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 1000 },
				url: "https://example.com/poster.jpg",
				alt: "preview",
			},
		};

		const user = userEvent.setup();
		render(<Media item={item} />, { wrapper: Wrapper });
		await user.click(screen.getByRole("button", { name: /download/i }));
		expect(
			await screen.findByText("Couldn't load video — try refreshing the feed"),
		).toBeInTheDocument();
	});
});

describe("video player", () => {
	it("sets video src from cached url on mount", async () => {
		const cachedUrl = "blob:http://localhost/cached-video";
		vi.mocked(getCachedMediaUrl).mockResolvedValueOnce(cachedUrl);

		const item: FeedItem = {
			id: "vid-cached",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 0 },
				url: "https://example.com/poster.jpg",
				alt: "vid",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });
		await waitFor(() => {
			expect(screen.getByLabelText("Video media")).toHaveAttribute(
				"src",
				cachedUrl,
			);
		});
	});

	it("hides play controls before video url is available", () => {
		const item: FeedItem = {
			id: "vid-nodl",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 0 },
				url: "https://example.com/poster.jpg",
				alt: "vid",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });
		expect(
			screen.queryByRole("button", { name: "Play" }),
		).not.toBeInTheDocument();
	});

	it("enables play button once video url is loaded from cache", async () => {
		vi.mocked(getCachedMediaUrl).mockResolvedValueOnce(
			"blob:http://localhost/vid",
		);

		const item: FeedItem = {
			id: "vid-enabled",
			type: "group",
			chatName: "Test",
			timestamp: "now",
			text: "",
			media: {
				meta: { type: "video", width: 640, height: 360, sizeBytes: 0 },
				url: "https://example.com/poster.jpg",
				alt: "vid",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Play" })).not.toBeDisabled();
		});
	});
});

describe("file/document download", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows a download button for small file attachments", () => {
		const item: FeedItem = {
			id: "file-small",
			type: "group",
			chatName: "Docs",
			timestamp: "now",
			text: "",
			media: {
				meta: {
					type: "file",
					width: 0,
					height: 0,
					sizeBytes: 1024,
					mimeType: "application/pdf",
					fileName: "small.pdf",
				},
				alt: "file",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });

		expect(
			screen.getByRole("button", { name: /download/i }),
		).toBeInTheDocument();
	});

	it("triggers browser download after file is fetched", async () => {
		const user = userEvent.setup();
		const blobUrl = "blob:http://localhost/file-abc";
		vi.mocked(downloadMediaForItem).mockResolvedValueOnce(blobUrl);

		const original = document.createElement.bind(document);
		const fakeAnchor = original("a");
		const clickSpy = vi.spyOn(fakeAnchor, "click").mockImplementation(() => {});

		const item: FeedItem = {
			id: "file-download",
			type: "group",
			chatName: "Docs",
			timestamp: "now",
			text: "",
			media: {
				meta: {
					type: "file",
					width: 0,
					height: 0,
					sizeBytes: 1024,
					mimeType: "application/pdf",
					fileName: "report.pdf",
				},
				alt: "file",
			},
		};

		render(<Media item={item} />, { wrapper: Wrapper });

		// Spy after render; only intercept "a" tag so React's own renders still work
		const createSpy = vi
			.spyOn(document, "createElement")
			.mockImplementation((tag, ...rest) => {
				if (tag === "a") return fakeAnchor;
				return original(tag, ...rest);
			});

		await user.click(screen.getByRole("button", { name: /download/i }));

		await waitFor(() => {
			expect(clickSpy).toHaveBeenCalledTimes(1);
		});
		expect(fakeAnchor.href).toBe(blobUrl);
		expect(fakeAnchor.download).toBe("report.pdf");

		createSpy.mockRestore();
	});
});
