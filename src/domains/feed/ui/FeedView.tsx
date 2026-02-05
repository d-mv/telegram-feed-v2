export function FeedView() {
	return (
		<section className="feed-shell">
			<header className="feed-header">
				<p className="feed-eyebrow">Feed</p>
				<h1>Your feed is ready.</h1>
				<p className="feed-subtitle">
					We are warming up the river. The next step will stream real posts from
					Telegram.
				</p>
			</header>
			<div className="feed-list">
				{['Pinned channel update', 'Morning roundup', 'Product release'].map(
					(item) => (
						<article className="feed-card" key={item}>
							<div>
								<p className="feed-card-title">{item}</p>
								<p className="feed-card-meta">Placeholder · Just now</p>
							</div>
							<span className="feed-card-pill">Preview</span>
						</article>
					),
				)}
			</div>
		</section>
	)
}
