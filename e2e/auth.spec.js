import { test, expect } from '@playwright/test';

test('sign-in → dashboard renders user data', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('e2e@example.com');
  await page.getByLabel(/password/i).fill('e2e-password');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/total bookings/i)).toBeVisible();
});
