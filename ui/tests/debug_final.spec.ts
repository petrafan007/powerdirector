import { test, expect } from '@playwright/test';

test('PowerDirector UI Debug Final', async ({ page }) => {
    await page.goto('http://localhost:4007');
    await expect(page.locator('text=PowerDirector v1.2.0-beta.3')).toBeVisible({ timeout: 15000 });
    
    await page.click('button[title="New chat"]');
    await page.fill('input[placeholder="Chat name..."]', 'Debug Session');
    await page.click('button:has-text("Create")');
    
    const chatInput = page.locator('textarea');
    await chatInput.fill("Test: Reply with 'Wave 2 Final Verification'");
    await chatInput.press('Enter');
    
    console.log('Waiting 30 seconds for agent to respond...');
    await page.waitForTimeout(30000);
    
    await page.screenshot({ path: 'tests/debug_final.png', fullPage: true });
    console.log('Final debug screenshot taken');
    
    // Also grab logs page just in case
    await page.click('a[title="Logs"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/debug_logs.png', fullPage: true });
});
