import { test, expect } from '@playwright/test';

test('PowerDirector UI Debug', async ({ page }) => {
    await page.goto('http://localhost:4007');
    await expect(page.locator('text=PowerDirector v1.2.0-beta.3')).toBeVisible({ timeout: 15000 });
    
    await page.click('button[title="New chat"]');
    await page.fill('textarea', "Test: Reply with 'Wave 2 Debug'");
    await page.press('textarea', 'Enter');
    
    console.log('Waiting 15 seconds for UI state to settle...');
    await page.waitForTimeout(15000);
    
    await page.screenshot({ path: 'tests/debug_chat.png', fullPage: true });
    console.log('Debug screenshot taken');
});
