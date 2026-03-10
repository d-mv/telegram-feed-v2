import { expect, test } from '@playwright/test';

test('clicking Filters opens dialog without page reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

  const initialUrl = page.url();
  let mainFrameNavigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      mainFrameNavigations += 1;
    }
  });

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Filters' }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
  await expect(page).toHaveURL(initialUrl);
  expect(mainFrameNavigations).toBe(0);
});
