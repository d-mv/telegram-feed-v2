import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AvatarCarousel } from "./AvatarCarousel";

const emblaApi = {
	scrollPrev: vi.fn(),
	scrollNext: vi.fn(),
	scrollTo: vi.fn(),
};

vi.mock("embla-carousel-react", () => ({
	default: () => [vi.fn(), emblaApi],
}));

test("renders photos and handles controls", async () => {
	const user = userEvent.setup();
	const onClose = vi.fn();
	render(
		<AvatarCarousel
			photos={["a.jpg", "b.jpg"]}
			initialIndex={1}
			onClose={onClose}
		/>,
	);

	expect(screen.getByRole("dialog")).toBeInTheDocument();
	expect(screen.getByAltText("Avatar 1")).toBeInTheDocument();
	expect(screen.getByAltText("Avatar 2")).toBeInTheDocument();
	expect(emblaApi.scrollTo).toHaveBeenCalledWith(1, true);

	await user.click(screen.getByRole("button", { name: "Previous avatar" }));
	await user.click(screen.getByRole("button", { name: "Next avatar" }));
	await user.click(screen.getByRole("button", { name: "Close carousel" }));

	expect(emblaApi.scrollPrev).toHaveBeenCalled();
	expect(emblaApi.scrollNext).toHaveBeenCalled();
	expect(onClose).toHaveBeenCalled();
});

test("closes and navigates with keyboard", async () => {
	const user = userEvent.setup();
	const onClose = vi.fn();
	render(<AvatarCarousel photos={["a.jpg", "b.jpg"]} onClose={onClose} />);

	await user.keyboard("{ArrowLeft}{ArrowRight}{Escape}");

	expect(emblaApi.scrollPrev).toHaveBeenCalled();
	expect(emblaApi.scrollNext).toHaveBeenCalled();
	expect(onClose).toHaveBeenCalled();
});

test("returns null when no photos", () => {
	const onClose = vi.fn();
	const { container } = render(
		<AvatarCarousel photos={[]} onClose={onClose} />,
	);
	expect(container.firstChild).toBeNull();
});
