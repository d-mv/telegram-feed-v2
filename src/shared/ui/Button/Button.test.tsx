import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Button } from "./Button";

test("renders image variant with img tag", () => {
	render(
		<Button variant="image" imgSrc="/icon.png" imgAlt="icon">
			hidden
		</Button>,
	);
	expect(screen.getByRole("img", { name: "icon" })).toBeInTheDocument();
});

test("defaults to non-submit button inside forms", async () => {
	const user = userEvent.setup();
	const onSubmit = vi.fn((event: SubmitEvent) => {
		event.preventDefault();
	});

	render(
		<form onSubmit={onSubmit}>
			<Button>Filters</Button>
		</form>,
	);

	await user.click(screen.getByRole("button", { name: "Filters" }));

	expect(onSubmit).not.toHaveBeenCalled();
});
