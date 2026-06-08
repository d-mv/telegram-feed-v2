import type { Meta, StoryObj } from "@storybook/react-vite";
import { MockAppProvider } from "../../../test/mockApp";
import { getMockFeed, getMockFeedBatch } from "../model/mockFeed";
import { FeedView } from "./FeedView";

const meta = {
	title: "Feed/FeedView",
	component: FeedView,
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof FeedView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	decorators: [
		(Story) => (
			<MockAppProvider items={getMockFeed()}>
				<Story />
			</MockAppProvider>
		),
	],
};

export const LongFeed: Story = {
	decorators: [
		(Story) => (
			<MockAppProvider items={getMockFeedBatch(24)}>
				<Story />
			</MockAppProvider>
		),
	],
};
