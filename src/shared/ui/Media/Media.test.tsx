import userEvent from "@testing-library/user-event";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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
