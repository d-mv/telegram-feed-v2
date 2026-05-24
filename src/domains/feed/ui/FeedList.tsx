import { Spin } from "antd";
import type { RefObject } from "react";
import type { FeedItem } from "../../../types";
import { FeedCard } from "./FeedCard";

type FeedListProps = {
	items: FeedItem[];
	isLoadingOlder: boolean;
	topSentinelRef: RefObject<HTMLDivElement>;
	onFocus: (item: FeedItem) => void;
};

export function FeedList({
	items,
	isLoadingOlder,
	topSentinelRef,
	onFocus,
}: FeedListProps) {
	return (
		<div>
			<div ref={topSentinelRef} style={{ height: 1 }} />
			{isLoadingOlder && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 8,
						padding: "16px 0",
					}}
					aria-live="polite"
				>
					<Spin size="small" />
					<span>Loading older...</span>
				</div>
			)}
			{items.map((item) => (
				<FeedCard key={item.id} item={item} onFocus={onFocus} />
			))}
		</div>
	);
}
