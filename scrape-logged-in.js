import puppeteer from 'puppeteer';
import fs from 'fs';

const existing = fs.readFileSync('./warmups.md', 'utf8').split('\n')
  .filter(l => l.trim())
  .reduce((a, l) => {
    const m = l.match(/^([A-H][1-4])/);
    return { ...a, [m ? m[1] : '']: true };
  }, {});

console.log('📱 Connecting to Chrome instance...\n');

(async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://127.0.0.1:9222'
  });

  const pages = await browser.pages();
  let page = pages[0];
  
  if (!page) {
    page = await browser.newPage();
  }

  console.log(`✅ Connected!\n`);
  
  // Navigate to Instagram
  console.log('🌐 Navigating to Instagram...\n');
  await page.goto('https://www.instagram.com/10pwarmups/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  console.log('⏳ Waiting 3 seconds for content...\n');
  await new Promise(r => setTimeout(r, 3000));

  console.log('📜 Scrolling to load all posts...\n');
  
  let lastHeight = 0;
  for (let i = 0; i < 30; i++) {
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(r => setTimeout(r, 1200));
    
    const newHeight = await page.evaluate('document.documentElement.scrollHeight');
    process.stdout.write(`\r  Scroll ${i+1}: ${newHeight}px`);
    
    if (newHeight === lastHeight) {
      console.log(' ✅\n');
      break;
    }
    lastHeight = newHeight;
  }

  const posts = await page.evaluate(() => {
    const items = [];
    const links = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        const match = href.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
        if (match) items.push({ type: match[1], id: match[2] });
      }
    });
    return items;
  });

  const unique = Array.from(new Map(posts.map(p => [p.id, p])).values());
  console.log(`Found ${unique.length} posts\n`);

  const found = [];
  for (let i = 0; i < unique.length; i++) {
    const post = unique[i];
    const url = `https://www.instagram.com/${post.type}/${post.id}/`;
    
    process.stdout.write(`\r[${i+1}/${unique.length}] Checking...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 250));
      
      const caption = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="og:description"]');
        return meta ? meta.getAttribute('content') : null;
      });

      if (caption && caption.match(/\b[A-H][1-4]\b/)) {
        const match = caption.match(/\b([A-H][1-4])\b/);
        if (match) {
          found.push({ label: match[1], url });
          console.log(`\n  ✅ ${match[1]}`);
        }
      }
    } catch(e) {
      // continue
    }
  }

  console.log(`\n\n📋 Found ${found.length} warmups:\n`);
  const newOnes = found.filter(f => !existing[f.label]);
  
  found.forEach(f => {
    const isNew = !existing[f.label];
    console.log(`${isNew ? '✨' : '  '} ${f.label} - ${f.url}`);
  });

  if (newOnes.length > 0) {
    console.log(`\n📝 Adding ${newOnes.length} new warmups...\n`);
    newOnes.forEach(f => {
      const line = `${f.label} - ${f.url}`;
      fs.appendFileSync('./warmups.md', line + '\n');
      console.log(`  ${line}`);
    });
  }

  const allFound = Object.keys(existing).concat(newOnes.map(f => f.label)).filter(x => x);
  console.log(`\n✅ Total: ${allFound.length}/32 warmups`);

  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
