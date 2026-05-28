import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Api } from "telegram";
import { vi } from "vitest";
import { APP_OPEN_TARGET_EVENT } from "../../../domains/app/openTarget";
import { Text } from "./Text";

function createMessage(text: string, entities: Array<Record<string, unknown>>) {
	return Object.assign(
		new Api.Message({
			id: 1,
		}),
		{
			message: text,
			entities,
		},
	);
}

function assertTag(text: string, tagName: string) {
	const node = screen.getByText(
		(_, element) => element?.textContent === text,
	) as {
		tagName?: string;
	};
	expect(node.tagName).toBe(tagName);
}

test("renders Telegram entities for bold, italic, underline, strikethrough, code, and pre", () => {
	const message = createMessage("Bold Italic Under Strike code block", [
		{ className: "MessageEntityBold", offset: 0, length: 4 },
		{ className: "MessageEntityItalic", offset: 5, length: 6 },
		{ className: "MessageEntityUnderline", offset: 12, length: 5 },
		{ className: "MessageEntityStrike", offset: 18, length: 6 },
		{ className: "MessageEntityCode", offset: 25, length: 4 },
		{ className: "MessageEntityPre", offset: 30, length: 5, language: "ts" },
	]);

	render(<Text sourceMessage={message}>{message.message}</Text>);

	assertTag("Bold", "STRONG");
	assertTag("Italic", "EM");
	assertTag("Under", "U");
	assertTag("Strike", "S");
	assertTag("code", "CODE");
	expect(screen.getByText("block").closest("pre")).toBeTruthy();
});

test("routes Telegram text URLs internally and leaves external links external", async () => {
	const user = userEvent.setup();
	const handler = vi.fn();
	window.addEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);

	const plainUrl = "https://t.me/plain/44";
	const text = `Telegram External ${plainUrl}`;
	const message = createMessage(text, [
		{
			className: "MessageEntityTextUrl",
			offset: 0,
			length: 8,
			url: "https://t.me/news/33",
		},
		{
			className: "MessageEntityTextUrl",
			offset: 9,
			length: 8,
			url: "https://example.com",
		},
		{
			className: "MessageEntityUrl",
			offset: 18,
			length: plainUrl.length,
		},
	]);

	render(<Text sourceMessage={message}>{message.message}</Text>);

	const internalLink = screen.getByRole("button", { name: "Telegram" });
	await user.click(internalLink);
	expect(handler).toHaveBeenCalledTimes(1);

	const externalLink = screen.getByRole("link", { name: "External" });
	expect(externalLink).toHaveAttribute("href", "https://example.com");

	const plainUrlLink = screen.getByRole("button", {
		name: "https://t.me/plain/44",
	});
	await user.click(plainUrlLink);
	expect(handler).toHaveBeenCalledTimes(2);

	window.removeEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);
});

test("renders javascript: URL as plain text, not a link", () => {
	const message = createMessage("click me", [
		{
			className: "MessageEntityTextUrl",
			offset: 0,
			length: 8,
			url: "javascript:alert(document.cookie)",
		},
	]);

	render(<Text sourceMessage={message}>{message.message}</Text>);

	expect(screen.queryByRole("link")).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
	expect(screen.getByText("click me")).toBeInTheDocument();
});

test("renders data: URL as plain text, not a link", () => {
	const message = createMessage("click me", [
		{
			className: "MessageEntityTextUrl",
			offset: 0,
			length: 8,
			url: "data:text/html,<script>alert(1)</script>",
		},
	]);

	render(<Text sourceMessage={message}>{message.message}</Text>);

	expect(screen.queryByRole("link")).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();
	expect(screen.getByText("click me")).toBeInTheDocument();
});

test("falls back to plain text for malformed overlapping entities", () => {
	const message = createMessage("abcdef", [
		{ className: "MessageEntityBold", offset: 0, length: 4 },
		{ className: "MessageEntityItalic", offset: 2, length: 3 },
	]);

	render(<Text sourceMessage={message}>{message.message}</Text>);

	assertTag("abcd", "STRONG");
	expect(screen.getByText("ef")).toBeInTheDocument();
});
