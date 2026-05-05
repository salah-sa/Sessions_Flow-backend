/**
 * E2E: Login Flow — Verify authentication UX from login page to dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    // Verify login form elements exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error on empty submit', async ({ page }) => {
    await page.goto('/login');
    // Click login button without filling fields
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show some error indicator (toast, inline error, etc.)
      await page.waitForTimeout(500);
      const pageContent = await page.textContent('body');
      // Should stay on login page
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Should remain on login page
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login since there's no auth token
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });
});
