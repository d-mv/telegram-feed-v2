const PALETTE = [
	"#A24A23",
	"#2E6A8E",
	"#4A7C59",
	"#7B4B94",
	"#9C6B2F",
	"#345995",
];

function hash(input: string): number {
	let value = 0;
	for (let index = 0; index < input.length; index += 1) {
		value = (value * 31 + input.charCodeAt(index)) >>> 0;
	}
	return value;
}

export function getAvatarInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function getAvatarColor(name: string): string {
	const value = hash(name || "unknown");
	return PALETTE[value % PALETTE.length]!;
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function getAvatarDataUrl(name: string): string {
	const initials = escapeXml(getAvatarInitials(name));
	const color = getAvatarColor(name);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="72" font-family="Arial, sans-serif" font-size="46" text-anchor="middle" fill="white">${initials}</text></svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
