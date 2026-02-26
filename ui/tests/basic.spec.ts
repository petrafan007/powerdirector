import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/PowerDirector/);
});

test('dashboard loads', async ({ page }) => {
    await page.goto('/');

    // Check if some key elements are present
    // For example, the sidebar layout usually has some specific text or roles
    // Let's look for "PowerDirector" text or similar
    await expect(page.locator('body')).toContainText('PowerDirector');
});
