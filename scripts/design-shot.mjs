// Refined デザインの見た目確認: 一覧と挑戦画面のスクショを撮る。
import { chromium } from 'playwright';
const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.on('pageerror', e => console.log('[pageerror]', e.message));

// 1. 一覧
await page.goto(`${base}/play`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
await page.waitForTimeout(1200); // フォント適用待ち
await page.screenshot({ path: 'scripts/design-list.png' });
console.log('[shot] list saved');

// 2. 挑戦 (setup 完了まで待つ)
await page.goto(`${base}/play?id=locked-flag`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__PLAY__?.phase === 'ready', null, { timeout: 300000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/design-challenge.png' });
console.log('[shot] challenge saved');

// 3. 採点後 (完了表示)
await page.click('#console');
await page.keyboard.type('su root\n', { delay: 25 });
await page.waitForTimeout(4000);
await page.keyboard.type('password\n', { delay: 25 });
await page.waitForTimeout(5000);
await page.keyboard.type('chmod 644 /home/user/flag.txt; exit\n', { delay: 25 });
await page.waitForTimeout(4000);
await page.click('#m1-check-btn');
await page.waitForFunction(() => window.__PLAY__?.passed === true, null, { timeout: 120000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/design-challenge-done.png' });
console.log('[shot] challenge-done saved');

await browser.close();
