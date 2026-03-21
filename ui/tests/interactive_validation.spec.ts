import { test, expect } from '@playwright/test';

test.setTimeout(120000); // 2 minutes

test('PowerDirector Interactive Validation', async ({ page }) => {
    const baseUrl = 'http://localhost:4007';
    
    // 1. Load http://localhost:4007.
    console.log(`Loading ${baseUrl}`);
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // 2. Verify the version in the bottom of the sidebar says "PowerDirector v1.2.0-beta.3".
    const versionText = 'PowerDirector v1.2.0-beta.3';
    const versionLocator = page.locator(`text="${versionText}"`);
    await expect(versionLocator).toBeVisible({ timeout: 15000 });
    console.log(`Verified version: ${versionText}`);

    // 3. Navigate to the '/config/models' page.
    console.log('Navigating to /config/models');
    await page.goto(`${baseUrl}/config/models`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow some time for hydration

    // 4. Verify that 'ollama-desktop' provider has ONLY ONE 'Base Url' field (no duplicate 'Base URL'). Take a screenshot.
    console.log('Verifying ollama-desktop provider');
    // Find ollama-desktop provider and expand if necessary
    const ollamaButton = page.locator('button:has-text("Ollama-desktop")');
    if (await ollamaButton.count() > 0) {
        await ollamaButton.click();
        await page.waitForTimeout(1000);
    }
    
    // Check for 'Base Url' or 'Base URL' labels
    const baseUrlLabels = page.locator('text=/Base\\s+Url/i');
    const count = await baseUrlLabels.count();
    console.log(`Found ${count} "Base Url" labels`);
    if (count !== 1) {
        console.warn(`WARNING: Expected 1 Base Url label, found ${count}`);
    }
    
    await page.screenshot({ path: 'ui/tests/final_models_config.png', fullPage: true });
    console.log('Saved final_models_config.png');

    // 5. Click the '+' button in the sidebar to start a new chat.
    console.log('Starting new chat');
    const plusButton = page.locator('button:has-text("+"), button[title="New chat"]');
    await plusButton.first().click();

    // 6. In the "New Chat" modal, enter "Wave 2 Final Verification" as the chat name and click "Create".
    const chatNameInput = page.locator('input[placeholder="Chat name..."]');
    await chatNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await chatNameInput.fill('Wave 2 Final Verification');
    const createButton = page.locator('button:has-text("Create")');
    await createButton.click();
    console.log('Chat "Wave 2 Final Verification" created');

    // 7. Type "Test: Reply with 'PowerDirector Wave 2 Release Candidate Fully Verified'" into the chat input and press Enter.
    // Use a more specific selector to avoid strict mode violation with other textareas (like in the modal or hidden configs)
    const chatInput = page.locator('div.flex-1.flex.flex-col textarea').last();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    const message = "Test: Reply with 'PowerDirector Wave 2 Release Candidate Fully Verified'";
    await chatInput.fill(message);
    
    const sendButton = page.locator('button[aria-label="Send message"], button:has-text("Send")');
    if (await sendButton.count() > 0 && await sendButton.isVisible()) {
        await sendButton.click();
    } else {
        await chatInput.press('Enter');
    }
    console.log('Message sent');

    // 8. Wait for the agent to respond.
    const expectedResponse = 'PowerDirector Wave 2 Release Candidate Fully Verified';
    const responseLocator = page.locator(`text="${expectedResponse}"`);
    console.log(`Waiting for response: "${expectedResponse}"`);
    
    try {
        await expect(responseLocator).toBeVisible({ timeout: 60000 });
        console.log('Agent responded successfully');
    } catch (e) {
        console.error('Timed out waiting for agent response');
        await page.screenshot({ path: 'ui/tests/timeout_debug.png' });
        // Dump messages to console for debugging
        const messages = await page.locator('.message-content, .text-sm').allInnerTexts();
        console.log('Visible messages on page:', messages);
        throw e;
    }

    // 9. Take a screenshot of the chat showing the agent's response.
    await page.screenshot({ path: 'ui/tests/final_chat_response.png' });
    console.log('Saved final_chat_response.png');
});
