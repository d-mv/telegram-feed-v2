import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Button } from "./Button";

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
