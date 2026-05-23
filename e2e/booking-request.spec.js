import { test, expect } from '@playwright/test';

test('anonymous user can submit a booking request', async ({ page }) => {
  await page.goto('/request');

  await expect(page.getByRole('heading', { name: /book your session/i })).toBeVisible();

  await page.getByPlaceholder('Jane Doe').fill('Casey Client');
  await page.getByPlaceholder('jane@email.com').fill('casey@example.com');
  await page.getByRole('button', { name: 'Portrait' }).click();
  await page.locator('input[type="datetime-local"]').fill('2030-12-01T10:00');

  await page.getByRole('button', { name: /request session/i }).click();
  await expect(page.getByRole('heading', { name: /request received/i })).toBeVisible({ timeout: 15000 });
});
