import { expect, test } from "@playwright/test";

test.describe("auth screen", () => {
	test("shows phone login form by default", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
		await expect(
			page.getByRole("button", { name: /Send code/i }),
		).toBeVisible();
	});

	test("switches to QR login when QR tab is selected", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button", { name: "QR" }).click();
		await expect(
			page.getByRole("button", { name: /Refresh QR/i }),
		).toBeVisible();
	});

	test("switching back to phone mode shows phone input again", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByRole("button", { name: "QR" }).click();
		await page.getByRole("button", { name: "Phone" }).click();
		await expect(
			page.getByRole("button", { name: /Send code/i }),
		).toBeVisible();
	});
});

test.describe("notification deep links (unauthenticated)", () => {
	test("shows toast when focusItemId is present but user is not logged in", async ({
		page,
	}) => {
		await page.goto("/?focusItemId=12345");
		await expect(
			page.getByText(/open links after logging in/i),
		).toBeVisible({ timeout: 5000 });
	});

	test("shows toast when focusChannelKey is present but user is not logged in", async ({
		page,
	}) => {
		await page.goto("/?focusChannelKey=dm:1");
		await expect(
			page.getByText(/open links after logging in/i),
		).toBeVisible({ timeout: 5000 });
	});

	test("does not navigate away from root when deep link param is present", async ({
		page,
	}) => {
		await page.goto("/?focusItemId=99");
		await expect(page).toHaveURL("/");
	});
});
