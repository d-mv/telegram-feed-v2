import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ScrollTopButton } from "./ScrollTopButton";

test("calls click handler", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(<ScrollTopButton onClick={onClick} />);

  await user.click(screen.getByRole("button", { name: "Scroll to top" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
