import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Login|GalaOS/i);
  await expect(page.locator('body')).toBeVisible();
});

