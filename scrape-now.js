import puppeteer from 'puppeteer';
import fs from 'fs';

const existing = fs.readFileSync('./warmups.md', 'utf8').split('\n')
  .filter(l => l.trim())
  .reduce((a, l) => {
    const m = l.match(/^([A-H][1-4])/);
    return { ...a, [m ? m[1] : '']: true };
  }, {});

console.log('Existing warmups:', Object.keys(existing).filter(x => x).sort().join(', '));
console.log('\n🚀 Launching Chrome...\n');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.instagram.com/10pwarmups/', { waitUntil: 'domcontentloaded' });
  
  console.log('✅ Chrome open at Instagram');
  console.log('📌 Please log in in the Chrome window');
  console.log('⏳ Waiting 30 seconds for you to log in...\n');
  
  await new Promise(r => setTimeout(r, 30000));

  console.log('📜 Scrolling to load posts...\n');
  
  let lastH = 0;
  for (let i = 0; i < 25; i++) {
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(r => setTimeout(r, 1200));
    const h = await page.evaluate('document.documentElement.scrollHeight');
    process.stdout.write(`\r  Scroll ${i+1}: ${h}px`);
    if (h === lastH) {
      console.log(' ✅');
      break;
    }
    lastH = h;
  }

  const posts = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]').forEach(a => {
      const m = a.href.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (m) items.push({ type: m[1], id: m[2] });
    });
    return items;
  });

  const unique = [...new Map(posts.map(p => [p.id, p])).values()];
  console.log(`\nFound ${unique.length} posts\n`);

  const found = [];
  for (let i = 0; i < unique.length; i++) {
    const p = unique[i];
    const url = `https://www.instagram.com/${p.type}/${p.id}/`;
    process.stdout.write(`\r[${i+1}/${unique.length}]`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 7000 });
      await new Promise(r => setTimeout(r, 200));
      const cap = await page.evaluate(() => {
        const m = document.querySelector('meta[property="og:description"]');
        return m ? m.getAttribute('content') : null;
      });
      const m = cap ? cap.match(/\b([A-H][1-4])\b/) : null;
      if (m) {
        found.push({ label: m[1], url });
        console.log(`\n  ✅ ${m[1]}`);
      }
    } catch(e) {}
  }

  console.log(`\n\n✨ Found:\n`);
  found.forEach(f => console.log(`${f.label} - ${f.url}`));

  const newOnes = found.filter(f => !existing[f.label]);
  if (newOnes.length > 0) {
    console.log(`\n📝 Adding ${newOnes.length} new ones...\n`);
    newOnes.forEach(f => {
      fs.appendFileSync('./warmups.md', `${f.label} - ${f.url}\n`);
      console.log(`  ✨ ${f.label}`);
    });
  }

  console.log(`\n✅ Done! Total: ${Object.keys(existing).filter(x => x).length + newOnes.length}/32\n`);
  process.exit(0);
})();
