import { render } from "@testing-library/react";
import { Spacer } from "./Spacer";

test("renders vertical spacer by default", () => {
  const { container } = render(<Spacer data-testid="spacer" />);
  expect(container.firstChild).toBeInTheDocument();
});

test("renders horizontal spacer", () => {
  const { container } = render(<Spacer direction="horizontal" />);
  expect(container.firstChild).toBeInTheDocument();
});
