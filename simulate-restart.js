import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  let initialNavigation = true;

  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.text()}`);
  });

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
        const url = frame.url();
        console.log(`Page navigated/reloaded to: ${url}`);
        if (initialNavigation) {
            initialNavigation = false;
            console.log('Initial navigation confirmed.');
            return;
        }
        // If it reloaded back to the target URL after we started polling, we can finish.
        if (url.includes('/config/update')) {
            console.log('SUCCESS: Reload completed!');
            process.exit(0);
        }
    }
  });

  console.log('Navigating to http://localhost:4007/config/update...');
  try {
    await page.goto('http://localhost:4007/config/update', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.log(`Initial navigation error (expected if down): ${e.message}`);
    initialNavigation = false; 
  }

  console.log('Injecting polling script...');
  await page.evaluate(() => {
    const poll = async () => {
        console.log('Polling health...');
        try {
            const h = await fetch('/api/health', { cache: 'no-store' });
            if (h.status === 200) {
                console.log('Gateway is BACK! Reloading in 1s...');
                setTimeout(() => window.location.reload(), 1000);
                return;
            }
        } catch (e) { console.log('Down...'); }
        setTimeout(poll, 500);
    };
    poll();
  });

  console.log('Polling script is running. Waiting for reload...');
  console.log('READY_FOR_RESTART_TRIGGER');

  // Keep it running for a while.
  setTimeout(() => {
    console.log('Timeout waiting for reload (10 minutes).');
    process.exit(1);
  }, 600000); 

})();
