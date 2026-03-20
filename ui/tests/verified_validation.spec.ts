import { test, expect } from '@playwright/test';

test('PowerDirector UI Validation', async ({ page }) => {
    // 1. Confirm page loads and version
    console.log('Navigating to /');
    await page.goto('http://localhost:4007');
    
    // Wait for the version to appear in the sidebar
    const versionLocator = page.locator('text=PowerDirector v1.2.0-beta.3');
    await expect(versionLocator).toBeVisible({ timeout: 15000 });
    console.log('Version confirmed: v1.2.0-beta.3');

    // 2. Start a new chat via modal
    console.log('Opening New Chat modal');
    await page.click('button[title="New chat"]');
    
    // Fill chat name in modal
    await page.fill('input[placeholder="Chat name..."]', 'Release Verification');
    await page.click('button:has-text("Create")');
    console.log('Chat created');

    // 3. Send message in the newly created chat
    console.log('Typing message');
    // The main chat area should now be visible with a textarea
    const chatInput = page.locator('textarea');
    await chatInput.fill("Test: Reply with 'PowerDirector Wave 2 Verified'");
    await chatInput.press('Enter');
    console.log('Message sent');
    
    // 4. Wait for agent response
    console.log('Waiting for response...');
    // "Majeston" is the agent name confirmed via CLI
    const majeston = page.locator('text=Majeston');
    await expect(majeston.last()).toBeVisible({ timeout: 60000 });
    console.log('Agent Majeston responded');
    
    await page.screenshot({ path: 'tests/chat_response.png' });
    console.log('Chat screenshot taken');

    // 5. Navigate to Terminal
    console.log('Navigating to /terminal');
    await page.click('button[title="Terminal"]');
    await page.waitForTimeout(5000); 
    await page.screenshot({ path: 'tests/terminal_page.png' });
    console.log('Terminal screenshot taken');

    // 6. Navigate to Logs
    console.log('Navigating to /logs');
    await page.click('a[title="Logs"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/logs_page.png' });
    console.log('Logs screenshot taken');
});
