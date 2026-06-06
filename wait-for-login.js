import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('🌐 Opening Instagram in headless: false mode\n');
  await page.goto('https://www.instagram.com/10pwarmups/');

  console.log('✅ Browser is open at https://www.instagram.com/10pwarmups/');
  console.log('📌 Please log in using the Chrome window');
  console.log('⏳ Once logged in, press Enter here to continue scraping...\n');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      console.log('\n✅ Continuing with scraping...\n');
      resolve();
    });
  });

  // Now scrape
  await new Promise(r => setTimeout(r, 2000));

  console.log('📜 Scrolling to load all posts...\n');
  
  let lastHeight = 0;
  for (let i = 0; i < 50; i++) {
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(r => setTimeout(r, 1500));
    
    const newHeight = await page.evaluate('document.documentElement.scrollHeight');
    process.stdout.write(`\r  Scroll ${i+1}: ${newHeight}px`);
    
    if (newHeight === lastHeight) {
      console.log(' [DONE]\n');
      break;
    }
    lastHeight = newHeight;
  }

  // Extract all post IDs
  const posts = await page.evaluate(() => {
    const items = [];
    const links = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        const match = href.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
        if (match) {
          items.push({
            type: match[1],
            id: match[2],
            url: `https://www.instagram.com/${match[1]}/${match[2]}/`
          });
        }
      }
    });
    return items;
  });

  // Remove duplicates
  const unique = Array.from(new Map(posts.map(p => [p.id, p])).values());
  console.log(`\n✅ Found ${unique.length} unique posts\n`);

  // Now fetch each one and extract label
  const found = [];
  for (let i = 0; i < unique.length; i++) {
    const post = unique[i];
    process.stdout.write(`\r[${i+1}/${unique.length}] Extracting labels...`);
    
    try {
      await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 300));
      
      const caption = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="og:description"]');
        return meta ? meta.getAttribute('content') : null;
      });

      if (caption) {
        const match = caption.match(/\b([A-H][1-4])\b/);
        if (match) {
          found.push({
            label: match[1],
            url: post.url
          });
        }
      }
    } catch(e) {
      // continue
    }
  }

  console.log(`\n\n📋 Found ${found.length} warmups:\n`);
  found.forEach(f => {
    console.log(`${f.label}: ${f.url}`);
  });

  console.log('\n✅ Scraping complete!\n');
  console.log('🌐 Browser stays open. Press Ctrl+C to close.\n');

  await new Promise(() => {});
})();
