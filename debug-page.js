import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://www.instagram.com/10pwarmups/');
  console.log('Waiting for login...');
  await new Promise(r => setTimeout(r, 30000));

  const info = await page.evaluate(() => ({
    allAs: document.querySelectorAll('a').length,
    reelAs: document.querySelectorAll('a[href*="/reel/"]').length,
    pAs: document.querySelectorAll('a[href*="/p/"]').length,
    articles: document.querySelectorAll('article').length,
    divs: document.querySelectorAll('div[role="article"]').length,
    firstTenLinks: [...document.querySelectorAll('a')].slice(0, 10).map(a => a.href)
  }));

  console.log('\n📊 Page Info:');
  console.log(`  All <a> tags: ${info.allAs}`);
  console.log(`  /reel/ links: ${info.reelAs}`);
  console.log(`  /p/ links: ${info.pAs}`);
  console.log(`  <article>: ${info.articles}`);
  console.log(`  div[role="article"]: ${info.divs}`);
  console.log(`\nFirst 10 links:`);
  info.firstTenLinks.forEach((h, i) => console.log(`  ${i+1}. ${h}`));

  console.log('\n💡 Browser still open - check DevTools (F12) to inspect DOM\n');
  await new Promise(() => {});
})();
