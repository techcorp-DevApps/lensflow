import { test, expect, request as pwRequest } from '@playwright/test';

test('client gallery loads after correct password entry', async ({ page, baseURL }) => {
  const api = await pwRequest.newContext({ baseURL });
  const seedRes = await api.get('/__test__/seed');
  expect(seedRes.ok()).toBe(true);
  const { galleryId } = await seedRes.json();
  expect(galleryId).toBeTruthy();

  await page.goto(`/client-gallery/${galleryId}`);
  await expect(page.getByPlaceholder(/gallery password/i)).toBeVisible({ timeout: 15000 });

  // Wrong password first → inline error
  await page.getByPlaceholder(/gallery password/i).fill('wrong');
  await page.getByRole('button', { name: /view gallery/i }).click();
  await expect(page.getByText(/incorrect password/i)).toBeVisible();

  // Correct password → images load
  await page.getByPlaceholder(/gallery password/i).fill('gallery-pass');
  await page.getByRole('button', { name: /view gallery/i }).click();
  await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });
});
