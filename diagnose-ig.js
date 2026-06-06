import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  console.log('Opening Instagram...\n');
  await page.goto('https://www.instagram.com/10pwarmups/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  console.log('Waiting 3 seconds for content to load...');
  await new Promise(r => setTimeout(r, 3000));

  // Check page content
  const pageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      allLinks: document.querySelectorAll('a').length,
      reelLinks: Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/reel/')).length,
      pLinks: Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/p/')).length,
      articles: document.querySelectorAll('article').length,
      firstFewHrefs: Array.from(document.querySelectorAll('a'))
        .slice(0, 10)
        .map(a => a.href)
        .filter(h => h && h.includes('instagram')),
      bodyText: document.body.innerText.substring(0, 200)
    };
  });

  console.log('\nPage Info:');
  console.log(`  Title: ${pageInfo.title}`);
  console.log(`  Total links: ${pageInfo.allLinks}`);
  console.log(`  Reel links: ${pageInfo.reelLinks}`);
  console.log(`  Photo links: ${pageInfo.pLinks}`);
  console.log(`  Articles: ${pageInfo.articles}`);
  console.log(`\nFirst few links:`);
  pageInfo.firstFewHrefs.forEach((h, i) => console.log(`  ${i+1}. ${h}`));
  console.log(`\nFirst 200 chars of body:`);
  console.log(`  ${pageInfo.bodyText.replace(/\n/g, ' ')}\n`);

  console.log('💡 Check the Chrome window to see what loaded');
  console.log('   Press F12 to open DevTools and inspect the HTML\n');

  await new Promise(() => {});
})().catch(err => {
  console.error(err);
  process.exit(1);
});
