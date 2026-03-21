import { test, expect } from '@playwright/test';

test('manual validation', async ({ page }) => {
  await page.goto('http://localhost:4007');
  await page.waitForLoadState('networkidle');

  // 2. Click the '+' button in the sidebar to start a new chat.
  // The button text is '+'.
  const plusButton = page.locator('button', { hasText: '+' });
  await plusButton.waitFor({ state: 'visible', timeout: 5000 });
  await plusButton.click();
  
  // Wait for a moment to ensure the new chat is ready
  await page.waitForTimeout(1000);

  // 3. Type "Test: Reply with 'PowerDirector Wave 2 Verified'" into the chat input and press Enter.
  // I'll wait for a textarea to appear.
  const textarea = page.locator('textarea');
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  await textarea.fill("Test: Reply with 'PowerDirector Wave 2 Verified'");
  await page.keyboard.press('Enter');

  // 4. Wait for the agent to respond.
  // I'll look for the text 'PowerDirector Wave 2 Verified' in the page.
  await page.waitForSelector('text=PowerDirector Wave 2 Verified', { timeout: 60000 });

  // 5. Take a screenshot of the chat showing the agent's response.
  await page.screenshot({ path: 'tests/chat_response.png' });
  console.log('Saved chat_response.png');

  // 6. Navigate to the '/terminal' page and take a screenshot of the terminal interface.
  await page.goto('http://localhost:4007/terminal');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/terminal_page.png' });
  console.log('Saved terminal_page.png');

  // 7. Navigate to the '/logs' page and take a screenshot of the logs.
  await page.goto('http://localhost:4007/logs');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/logs_page.png' });
  console.log('Saved logs_page.png');
});
