import { test, expect } from '@playwright/test';

test('final release proof', async ({ page }) => {
  await page.goto('http://localhost:4007/config/models');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'ui/tests/final_models_config.png', fullPage: true });
  
  await page.goto('http://localhost:4007/');
  await page.waitForSelector('button:has-text("+")');
  await page.click('button:has-text("+")');
  await page.waitForSelector('input[placeholder="Chat name..."]');
  await page.fill('input[placeholder="Chat name..."]', 'Final Release Proof');
  await page.click('button:has-text("Create")');
  
  await page.waitForSelector('textarea[placeholder*="Type a message"]');
  await page.fill('textarea[placeholder*="Type a message"]', 'Test: Reply with "PowerDirector Wave 2 Certified"');
  await page.press('textarea[placeholder*="Type a message"]', 'Enter');
  
  await page.waitForTimeout(10000); // Wait for agent response
  await page.screenshot({ path: 'ui/tests/final_chat_response.png', fullPage: true });
});
