// Captures PNG screenshots of Storybook stories.
//
//   1. bun run build-storybook   (produces ./storybook-static)
//   2. bun run screenshots
//
// Output: ./screenshots/<story-id>.png
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "storybook-static");
const outDir = join(root, "screenshots");

// Story id -> capture options. Ids are derived from the story `title` + export
// name, lowercased and kebab-cased (Storybook convention).
const shots = [
	{ id: "feed-feedview--default", file: "feed-mobile.png", width: 430 },
	{ id: "feed-feedview--long-feed", file: "feed-long.png", width: 430 },
	{ id: "feed-feedview--default", file: "feed-desktop.png", width: 1024 },
];

const MIME = {
	".html": "text/html",
	".js": "text/javascript",
	".mjs": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".map": "application/json",
};

function startServer() {
	const server = createServer(async (req, res) => {
		try {
			const url = new URL(req.url, "http://localhost");
			let pathname = decodeURIComponent(url.pathname);
			if (pathname === "/") pathname = "/index.html";
			const filePath = normalize(join(staticDir, pathname));
			if (!filePath.startsWith(staticDir)) {
				res.writeHead(403).end();
				return;
			}
			const body = await readFile(filePath);
			res.writeHead(200, {
				"content-type": MIME[extname(filePath)] ?? "application/octet-stream",
			});
			res.end(body);
		} catch {
			res.writeHead(404).end();
		}
	});
	return new Promise((resolve) => {
		server.listen(0, () => resolve(server));
	});
}

async function main() {
	await mkdir(outDir, { recursive: true });
	const server = await startServer();
	const { port } = server.address();
	const base = `http://localhost:${port}`;

	const browser = await chromium.launch();
	try {
		for (const shot of shots) {
			const page = await browser.newPage({
				viewport: { width: shot.width, height: 900 },
				deviceScaleFactor: 2,
			});
			const url = `${base}/iframe.html?id=${shot.id}&viewMode=story`;
			await page.goto(url, { waitUntil: "networkidle" });
			// Give antd / images a beat to settle.
			await page.waitForTimeout(1200);
			await page.screenshot({
				path: join(outDir, shot.file),
				fullPage: true,
			});
			console.log(`captured ${shot.file}`);
			await page.close();
		}
	} finally {
		await browser.close();
		server.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
