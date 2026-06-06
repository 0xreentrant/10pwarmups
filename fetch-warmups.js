import puppeteer from 'puppeteer';
import fs from 'fs';

const warmupFile = './warmups.md';
const existing = fs.readFileSync(warmupFile, 'utf8')
  .split('\n')
  .filter(line => line.trim())
  .reduce((acc, line) => {
    const match = line.match(/^([A-H][1-4])\s-/);
    if (match) acc[match[1]] = true;
    return acc;
  }, {});

const expected = [];
for (let s of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
  for (let i = 1; i <= 4; i++) {
    expected.push(s + i);
  }
}

const missing = expected.filter(w => !existing[w]);
console.log(`Current: ${Object.keys(existing).sort().join(', ')}`);
console.log(`Missing ${missing.length}/32: ${missing.join(', ')}\n`);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  console.log('🌐 Opening Instagram page...\n');
  
  try {
    await page.goto('https://www.instagram.com/10pwarmups/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } catch(e) {
    console.log('(timeout, continuing)\n');
  }

  // Smart scrolling - keep track of new links found
  console.log('📜 Scrolling and loading posts...\n');
  let allLinks = new Set();
  let newLinksCount = 0;
  
  for (let scroll = 0; scroll < 30; scroll++) {
    // Get current links
    const currentLinks = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && (href.includes('/reel/') || href.includes('/p/'))) {
          const url = href.split('?')[0].replace(/\/$/, '');
          if (url.match(/\/(reel|p)\/[A-Za-z0-9_-]+$/)) {
            urls.add(url);
          }
        }
      });
      return Array.from(urls);
    });

    // Count new ones
    const newCount = currentLinks.filter(l => !allLinks.has(l)).length;
    if (newCount > 0) {
      newLinksCount += newCount;
      console.log(`  Scroll ${scroll+1}: Found ${newCount} new posts (total: ${allLinks.size + newCount})`);
      currentLinks.forEach(l => allLinks.add(l));
    }

    if (newCount === 0 && scroll > 5) {
      console.log(`  (no new posts, stopping)\n`);
      break;
    }

    // Scroll down
    await page.evaluate('window.scrollBy(0, window.innerHeight * 2)');
    await new Promise(r => setTimeout(r, 1200));
  }

  const links = Array.from(allLinks).sort();
  console.log(`\n📊 Total links found: ${links.length}\n`);

  // Visit each and extract caption
  const found = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const url = `https://www.instagram.com${link}`;
    
    process.stdout.write(`\r[${i+1}/${links.length}] Checking...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 300));
      
      const caption = await page.evaluate(() => {
        // og:description
        const meta = document.querySelector('meta[property="og:description"]');
        if (meta) return meta.getAttribute('content');
        return null;
      });

      if (caption && caption.match(/\b[A-H][1-4]\b/)) {
        const match = caption.match(/\b([A-H][1-4])\b/);
        if (match) {
          const label = match[1];
          if (!existing[label]) {
            found.push({ label, url });
            console.log(`\n  ✅ ${label}`);
          }
        }
      }
    } catch(e) {
      // continue
    }
  }

  // Add new ones to warmups.md using sed
  console.log(`\n📝 Adding ${found.length} new warmups...\n`);
  for (const item of found) {
    const line = `${item.label} - ${item.url}`;
    // Append to file
    fs.appendFileSync(warmupFile, line + '\n');
    console.log(`  ${line}`);
  }

  // Final count
  const nowCount = Object.keys(existing).length + found.length;
  console.log(`\n✅ Done! Now have ${nowCount}/32 warmups`);
  const nowMissing = expected.filter(w => !existing[w] && !found.find(f => f.label === w));
  if (nowMissing.length > 0) {
    console.log(`   Still missing: ${nowMissing.join(', ')}`);
  }

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
