import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { vi } from "vitest";
import { AppContext } from "./AppContext";

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

function Consumer() {
	const ctx = useContext(AppContext);
	ctx.onManualRefresh();
	return null;
}

test("accessing AppContext outside Provider throws a descriptive error", () => {
	expect(() =>
		render(
			<div>
				<Consumer />
			</div>,
		),
	).toThrow(/AppContext.*onManualRefresh.*outside.*Provider/i);
});
