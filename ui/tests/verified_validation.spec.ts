import { test, expect } from '@playwright/test';

test('PowerDirector UI Validation', async ({ page }) => {
    // 1. Confirm page loads and version
    console.log('Navigating to /');
    await page.goto('http://localhost:4007');
    
    // Wait for the version to appear in the sidebar
    const versionLocator = page.locator('text=PowerDirector v1.2.0-beta.3');
    await expect(versionLocator).toBeVisible({ timeout: 15000 });
    console.log('Version confirmed: v1.2.0-beta.3');

    // 2. Start a new chat and send message
    console.log('Starting a new chat');
    await page.click('button[title="New chat"]');
    
    console.log('Typing message');
    await page.fill('textarea', "Test: Reply with 'PowerDirector Wave 2 Verified'");
    await page.press('textarea', 'Enter');
    console.log('Message sent');
    
    // 3. Wait for agent response
    console.log('Waiting for response...');
    // Increase timeout for agent response
    await expect(page.locator('text=System Agent').last()).toBeVisible({ timeout: 60000 });
    console.log('Agent responded');
    
    await page.screenshot({ path: 'tests/chat_response.png' });
    console.log('Chat screenshot taken');

    // 4. Navigate to Terminal
    console.log('Navigating to /terminal');
    // Using the button title as seen in the HTML from curl
    await page.click('button[title="Terminal"]');
    await page.waitForTimeout(5000); // Wait for PTY to init
    await page.screenshot({ path: 'tests/terminal_page.png' });
    console.log('Terminal screenshot taken');

    // 5. Navigate to Logs
    console.log('Navigating to /logs');
    await page.click('a[title="Logs"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/logs_page.png' });
    console.log('Logs screenshot taken');
});
