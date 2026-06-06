import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  console.log('Loading Instagram...\n');
  await page.goto('https://www.instagram.com/10pwarmups/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Scrolling to load ALL content...\n');
  
  let lastScrollHeight = await page.evaluate('document.documentElement.scrollHeight');
  let scrolls = 0;
  
  while (scrolls < 50) {
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(r => setTimeout(r, 1500));
    
    let newHeight = await page.evaluate('document.documentElement.scrollHeight');
    scrolls++;
    
    process.stdout.write(`\rScroll ${scrolls}: height=${newHeight}px`);
    
    if (newHeight === lastScrollHeight) {
      console.log(' [DONE]');
      break;
    }
    lastScrollHeight = newHeight;
  }

  const count = await page.evaluate('document.querySelectorAll("a[href*=\\"/reel/\\"], a[href*=\\"/p/\\"]").length');
  console.log(`✅ Total posts visible: ${count}\n`);

  const postIds = await page.evaluate(function() {
    const ids = [];
    const links = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    links.forEach(a => {
      const href = a.getAttribute('href');
      const m = href.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (m) ids.push(m[2]);
    });
    return ids;
  });

  console.log(`Found ${postIds.length} post links:`);
  [...new Set(postIds)].slice(0, 35).forEach((id, i) => console.log(`  ${i+1}. ${id}`));

  console.log('\n✅ Check the browser window to verify all posts loaded.\n');
  await new Promise(() => {});
})();
