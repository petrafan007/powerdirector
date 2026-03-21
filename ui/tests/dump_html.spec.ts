import { test } from '@playwright/test';
import fs from 'fs';

test('dump models html', async ({ page }) => {
  await page.goto('http://localhost:4007/config/models');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const html = await page.content();
  fs.writeFileSync('tests/models_config.html', html);
});
