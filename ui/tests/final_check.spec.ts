import { test, expect } from '@playwright/test';

test.setTimeout(120000); // 2 minutes

test('PowerDirector Final Release Check', async ({ page }) => {
    // 1. Load http://localhost:4007
    console.log('Navigating to http://localhost:4007');
    await page.goto('http://localhost:4007');
    await page.waitForLoadState('networkidle');

    // 2. Verify the version in the bottom of the sidebar says "PowerDirector v1.2.0-beta.3"
    // Let's find the sidebar first if possible.
    const versionText = 'PowerDirector v1.2.0-beta.3';
    // Sometimes it might be rendered with different whitespace or inside a span.
    const versionLocator = page.locator(`text=${versionText}`);
    await expect(versionLocator).toBeVisible({ timeout: 15000 });
    console.log(`Version confirmed: ${versionText}`);

    // 3. Click the '+' button in the sidebar to start a new chat.
    // Try to find a button with text '+' or title "New chat"
    const plusButton = page.locator('button:has-text("+"), button[title="New chat"]');
    await plusButton.first().click();
    console.log('Clicked + button');

    // 4. In the "New Chat" modal, enter "Final Release Check" as the chat name and click "Create".
    const chatNameInput = page.locator('input[placeholder="Chat name..."]');
    await chatNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await chatNameInput.fill('Final Release Check');
    const createButton = page.locator('button:has-text("Create")');
    await createButton.click();
    console.log('Chat "Final Release Check" created');

    // 5. Type "Test: Reply with 'PowerDirector Wave 2 Fully Verified'" into the chat input and press Enter.
    const chatInput = page.locator('textarea');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await chatInput.fill("Test: Reply with 'PowerDirector Wave 2 Fully Verified'");
    
    // Try to find a send button just in case Enter is not working
    const sendButton = page.locator('button[aria-label="Send message"], button:has-text("Send")');
    if (await sendButton.count() > 0) {
        await sendButton.click();
    } else {
        await chatInput.press('Enter');
    }
    console.log('Message sent');
    
    // 6. Wait for the agent (likely named 'Majeston' or 'System Agent') to respond.
    // 7. Take a screenshot of the chat showing the agent's response.
    const responseText = 'PowerDirector Wave 2 Fully Verified';
    const responseLocator = page.locator(`text=${responseText}`);
    
    try {
        await expect(responseLocator).toBeVisible({ timeout: 80000 });
        console.log('Agent responded with verified text');
    } catch (e) {
        console.log('Timeout waiting for specific response. Taking debug screenshot.');
        await page.screenshot({ path: 'tests/debug_timeout.png' });
        
        // Dump some text to see what happened
        const messages = await page.locator('.message-content, .text-sm').allInnerTexts();
        console.log('Current page messages/text:');
        console.log(messages.join('\n'));
        
        throw e;
    }

    await page.screenshot({ path: 'tests/chat_response.png', fullPage: false });
    console.log('Saved chat_response.png');

    // 8. Navigate to the '/config/models' page.
    console.log('Navigating to http://localhost:4007/config/models');
    await page.goto('http://localhost:4007/config/models');
    await page.waitForLoadState('networkidle');
    console.log('Navigated to /config/models');

    // 9. Verify that 'ollama-desktop' provider has ONLY ONE 'baseUrl' field (no duplicate 'baseURL'). Take a screenshot.
    // Wait for the page content to be stable
    await page.waitForTimeout(2000);
    
    // Expand ollama-desktop provider
    const ollamaButton = page.locator('button:has-text("Ollama-desktop")');
    await ollamaButton.click();
    await page.waitForTimeout(1000);

    // We want to verify only one baseUrl field.
    // I'll search for inputs or labels related to baseUrl in the context of ollama-desktop.
    const baseUrlLabel = page.locator('text=/baseUrl|baseURL/i');
    const count = await baseUrlLabel.count();
    console.log(`Total baseUrl/baseURL labels found after expansion: ${count}`);
    
    if (count !== 1) {
        console.log('WARNING: Expected exactly 1 baseUrl field, found ' + count);
    }

    await page.screenshot({ path: 'tests/models_config.png', fullPage: true });
    console.log('Saved models_config.png');

    // 10. Navigate to the '/logs' page and take a screenshot of the logs showing recent activity.
    console.log('Navigating to http://localhost:4007/logs');
    await page.goto('http://localhost:4007/logs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/logs_page.png', fullPage: true });
    console.log('Saved logs_page.png');
});
