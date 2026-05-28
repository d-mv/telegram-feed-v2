import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { QrLoginPanel } from "./QrLoginPanel";

vi.mock("qrcode", () => ({
	default: {
		toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,FAKE"),
	},
}));

const baseProps = {
	status: "waiting" as const,
	token: {
		token: new Uint8Array([1, 2, 3]),
		expires: Date.now() + 30000,
		loginUrl: "tg://login?token=AAEC",
	},
	error: "",
	isExpired: false,
	onRefresh: vi.fn(),
	onReset: vi.fn(),
};

test("renders QR image from a data URL, not an external service", async () => {
	render(<QrLoginPanel {...baseProps} />);

	const img = await screen.findByRole("img", { name: /telegram qr login/i });
	expect(img.getAttribute("src")).toMatch(/^data:/);
	expect(img.getAttribute("src")).not.toContain("qrserver.com");
	expect(img.getAttribute("src")).not.toContain("http");
});

test("shows loading state while QR is being prepared", () => {
	render(<QrLoginPanel {...baseProps} status="loading" token={null} />);
	expect(screen.getByText(/preparing qr code/i)).toBeInTheDocument();
});

test("shows expired message when isExpired is true", async () => {
	render(<QrLoginPanel {...baseProps} isExpired />);
	expect(await screen.findByText(/qr expired/i)).toBeInTheDocument();
});

test("shows error message when error is set", async () => {
	render(<QrLoginPanel {...baseProps} error="Something went wrong" />);
	expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
});
