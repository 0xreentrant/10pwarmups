import puppeteer from 'puppeteer';
import fs from 'fs';

const postIds = [
  'DZJGLxbypcvhh11fkhGUp78NRrjDHUuqz5M7Ik0',
  'DZGc-XCTcsI',
  'DZD23WOzNca',
  'DZDZcdqJT7rBdsqQUJCNxto5P30qOPfMPVSoj00',
  'DZCYCEztd0V',
  'DZBeSE1TSAS',
  'DY-JEOgpdGD76lhVvLCQXa1Uf-vBAuBKkvbLqU0',
  'DY4-2LkJBZ6u7TNdZSAUYVj4rCzNtdV6PFEPMw0',
  'DY3IoeJTus3',
  'DY00ra8ztRy',
  'DYy4FQONxL2',
  'DYy1VwczXkF'
];

const existing = fs.readFileSync('./warmups.md', 'utf8').split('\n')
  .filter(l => l.trim())
  .reduce((a, l) => ({ ...a, [l.split(' -')[0]]: l.split(' - ')[1] }), {});

console.log('Existing warmups:', Object.keys(existing).sort().join(', '), '\n');

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const found = [];
  
  for (let i = 0; i < postIds.length; i++) {
    const postId = postIds[i];
    const url = `https://www.instagram.com/reel/${postId}/`;
    
    process.stdout.write(`\r[${i+1}/${postIds.length}] Fetching...`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await new Promise(r => setTimeout(r, 300));
      
      const caption = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="og:description"]');
        return meta ? meta.getAttribute('content') : null;
      });

      if (caption) {
        const match = caption.match(/\b([A-H][1-4])\b/);
        if (match) {
          const label = match[1];
          found.push({ label, url, postId });
          console.log(`\n  ✅ ${label}: ${postId}`);
        } else {
          console.log(`\n  ℹ️  No label in: ${caption.substring(0, 60)}`);
        }
      }
    } catch(e) {
      console.log(`\n  ❌ ${postId}: ${e.message}`);
    }
  }

  console.log(`\n\n📋 Extracted labels:\n`);
  found.forEach(f => {
    console.log(`${f.label} - https://www.instagram.com/reel/${f.postId}/`);
  });

  // Check which are new
  const newWarmups = found.filter(f => !existing[f.label]);
  console.log(`\n📝 New warmups to add (${newWarmups.length}):\n`);
  
  for (const item of newWarmups) {
    const line = `${item.label} - https://www.instagram.com/reel/${item.postId}/`;
    fs.appendFileSync('./warmups.md', line + '\n');
    console.log(`✨ ${line}`);
  }

  console.log(`\n✅ Done! Added ${newWarmups.length} new warmups`);
  await browser.close();
  process.exit(0);
})();
