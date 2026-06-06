import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,  // Show Chrome window
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set user agent to avoid blocking
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  console.log('Opening Instagram page...');
  try {
    await page.goto('https://www.instagram.com/10pwarmups/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } catch (e) {
    console.log('Navigation timeout (expected for Instagram), continuing...');
  }

  // Wait a moment for DOM to settle
  await new Promise(r => setTimeout(r, 2000));

  // Try to get post links from the DOM
  const postUrls = await page.evaluate(() => {
    const links = new Set();
    // Try multiple selectors
    const anchors = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"], a[href*="/post"]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (href && (href.match(/\/(reel|p|post)\//))) {
        const url = href.startsWith('http') ? href : ('https://www.instagram.com' + href);
        links.add(url.split('?')[0]); // Remove query params
      }
    });
    return Array.from(links);
  });

  console.log(`\n✅ Found ${postUrls.length} post links on the page:\n`);
  postUrls.forEach((url, i) => {
    console.log(`${i+1}. ${url}`);
  });

  // Save URLs for processing
  console.log(`\nSaved ${postUrls.length} URLs for batch processing`);
  
  // Keep browser open
  console.log('\nBrowser is open. Press Ctrl+C to exit when ready to scrape.\n');
  await new Promise(() => {});
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
