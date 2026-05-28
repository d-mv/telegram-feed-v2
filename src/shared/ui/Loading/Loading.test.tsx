import { render, screen } from "@testing-library/react";
import { Loading } from "./Loading";

test("renders a loading spinner", () => {
	render(<Loading />);
	// Ant Design Spin renders role="img" for the spinner
	expect(document.querySelector(".ant-spin")).toBeTruthy();
});
