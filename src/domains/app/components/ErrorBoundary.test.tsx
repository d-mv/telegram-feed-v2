import { render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { vi } from "vitest";

// Suppress React's expected error output for these tests
beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

function Thrower({ message }: { message: string }): ReactNode {
	throw new Error(message);
}

// Import after file exists
let ErrorBoundary: typeof import("./ErrorBoundary").ErrorBoundary;

beforeEach(async () => {
	({ ErrorBoundary } = await import("./ErrorBoundary"));
});

test("renders children when no error occurs", () => {
	render(
		<ErrorBoundary>
			<span>all good</span>
		</ErrorBoundary>,
	);
	expect(screen.getByText("all good")).toBeInTheDocument();
});

test("renders fallback UI when a child throws", () => {
	render(
		<ErrorBoundary>
			<Thrower message="auth client missing" />
		</ErrorBoundary>,
	);
	expect(screen.getByRole("alert")).toBeInTheDocument();
	expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

test("renders custom fallback when provided", () => {
	render(
		<ErrorBoundary fallback={<p>custom error</p>}>
			<Thrower message="boom" />
		</ErrorBoundary>,
	);
	expect(screen.getByText("custom error")).toBeInTheDocument();
});
