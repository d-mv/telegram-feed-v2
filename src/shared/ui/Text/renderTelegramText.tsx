import type { ReactNode, CSSProperties } from "react";
import { requestOpenTarget } from "../../../domains/app/openTarget";

type TelegramEntity = {
	className?: unknown;
	offset?: unknown;
	length?: unknown;
	url?: unknown;
	language?: unknown;
};

function getEntityBounds(entity: TelegramEntity) {
	if (typeof entity.offset !== "number" || typeof entity.length !== "number") {
		return null;
	}
	if (entity.offset < 0 || entity.length <= 0) {
		return null;
	}
	return {
		start: entity.offset,
		end: entity.offset + entity.length,
	};
}

function isSafeHref(href: string): boolean {
	try {
		const { protocol } = new URL(href);
		return ["http:", "https:", "mailto:", "tel:", "tg:"].includes(protocol);
	} catch {
		return false;
	}
}

function isTelegramLink(href: string) {
	try {
		const parsed = new URL(href);
		return (
			parsed.protocol === "tg:" ||
			parsed.hostname === "t.me" ||
			parsed.hostname === "telegram.me"
		);
	} catch {
		return false;
	}
}

function normalizeUrl(url: string) {
	if (
		url.startsWith("http://") ||
		url.startsWith("https://") ||
		url.startsWith("tg://")
	) {
		return url;
	}
	return `https://${url}`;
}

function renderLink(key: string, value: string, href: string) {
	const commonStyle: CSSProperties = {
		display: "inline-block",
		maxWidth: "100%",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		verticalAlign: "bottom",
		textDecoration: "underline",
	};

	if (isTelegramLink(href)) {
		return (
			<button
				key={key}
				type="button"
				style={{
					...commonStyle,
					background: "none",
					border: "none",
					padding: 0,
					color: "inherit",
					font: "inherit",
					cursor: "pointer",
					textAlign: "left",
				}}
				onClick={(event) => {
					event.stopPropagation();
					requestOpenTarget(href);
				}}
				onKeyDown={(event) => event.stopPropagation()}
			>
				{value}
			</button>
		);
	}

	return (
		<a
			key={key}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			onClick={(event) => event.stopPropagation()}
			onKeyDown={(event) => event.stopPropagation()}
			style={commonStyle}
		>
			{value}
		</a>
	);
}

function renderEntity(
	key: string,
	value: string,
	entity: TelegramEntity,
): ReactNode {
	switch (entity.className) {
		case "MessageEntityBold":
			return <strong key={key}>{value}</strong>;
		case "MessageEntityItalic":
			return <em key={key}>{value}</em>;
		case "MessageEntityUnderline":
			return <u key={key}>{value}</u>;
		case "MessageEntityStrike":
			return <s key={key}>{value}</s>;
		case "MessageEntityCode":
			return <code key={key}>{value}</code>;
		case "MessageEntityPre":
			return (
				<pre
					key={key}
					data-language={
						typeof entity.language === "string" ? entity.language : undefined
					}
				>
					<code>{value}</code>
				</pre>
			);
		case "MessageEntityTextUrl":
			if (typeof entity.url !== "string" || entity.url === "") {
				return value;
			}
			if (!isSafeHref(entity.url)) {
				return value;
			}
			return renderLink(key, value, entity.url);
		case "MessageEntityUrl":
			return renderLink(key, value, normalizeUrl(value));
		default:
			return value;
	}
}

export function renderTelegramText(
	text: string,
	entities: unknown,
): ReactNode[] | null {
	if (!Array.isArray(entities) || entities.length === 0) {
		return null;
	}

	const normalized = entities
		.map((entity) =>
			entity && typeof entity === "object" ? (entity as TelegramEntity) : null,
		)
		.filter((entity): entity is TelegramEntity => entity !== null)
		.map((entity) => {
			const bounds = getEntityBounds(entity);
			if (!bounds || bounds.end > text.length) {
				return null;
			}
			return { entity, ...bounds };
		})
		.filter(
			(
				entity,
			): entity is { entity: TelegramEntity; start: number; end: number } =>
				entity !== null,
		)
		.sort((a, b) => a.start - b.start || a.end - b.end);

	if (normalized.length === 0) {
		return null;
	}

	const nodes: ReactNode[] = [];
	let cursor = 0;

	for (const segment of normalized) {
		if (segment.start < cursor) {
			continue;
		}
		if (segment.start > cursor) {
			nodes.push(
				<span key={`text-${cursor}`}>{text.slice(cursor, segment.start)}</span>,
			);
		}

		const value = text.slice(segment.start, segment.end);
		nodes.push(
			renderEntity(
				`entity-${segment.start}-${segment.end}`,
				value,
				segment.entity,
			),
		);
		cursor = segment.end;
	}

	if (cursor < text.length) {
		nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor)}</span>);
	}

	return nodes;
}
