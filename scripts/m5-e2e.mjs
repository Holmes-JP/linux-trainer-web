// M5 E2E: (1) / が /play へリダイレクト (2) Reset で壊れた状態に戻る
//   locked-flag を解く → Reset → 再び Check が ❌ に戻ることを確認する。
// 使い方: M0_PORT=5174 node scripts/m5-e2e.mjs
import { chromium } from 'playwright';

const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

// --- 1. / → /play リダイレクト ---
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
const redirected = page.url().includes('/play');
console.log('[driver] / redirected to /play:', redirected, `(${page.url()})`);

// --- 2. locked-flag: カード → 詳細 → 起動 → 解く ---
await page.click('[data-scenario="locked-flag"]');
await page.waitForSelector('#launch-btn', { timeout: 60000 });
await page.click('#launch-btn');
await page.waitForFunction(() => window.__PLAY__?.phase === 'ready', null, { timeout: 300000 });
await page.click('#console');
await page.keyboard.type('su root\n', { delay: 30 });
await page.waitForTimeout(4000);
await page.keyboard.type('password\n', { delay: 30 });
await page.waitForTimeout(5000);
await page.keyboard.type('chmod 644 /home/user/flag.txt; exit\n', { delay: 30 });
await page.waitForTimeout(4000);
await page.click('#m1-check-btn');
await page.waitForFunction(() => window.__PLAY__?.phase === 'ready' && window.__PLAY__?.passed !== null, null, { timeout: 120000 });
let state = await page.evaluate(() => window.__PLAY__);
console.log('[driver] solved:', state.passed === true);
const nextVisible = (await page.locator('#next-scenario').count()) === 1;
console.log('[driver] completion CTA visible:', nextVisible);

// --- 3. Reset → 壊れた状態に戻る ---
await page.click('#reset-btn');
await page.click('#reset-confirm-btn');
// reset は location.reload() する。古い (解決済み) 状態を拾わないよう、
// fresh ページ (passed=null) で setup 完了 (phase=ready) するまで待つ
await page.waitForFunction(
	() => window.__PLAY__?.phase === 'ready' && window.__PLAY__?.passed === null,
	null, { timeout: 300000 }
);
await page.click('#m1-check-btn');
await page.waitForFunction(() => window.__PLAY__?.results?.length > 0 && window.__PLAY__?.phase === 'ready', null, { timeout: 120000 });
state = await page.evaluate(() => window.__PLAY__);
const backToBroken = state.passed === false;
console.log('[driver] after reset, broken again:', backToBroken, state.results.map(r => r.pass));

await page.screenshot({ path: 'scripts/m5-e2e.png' });
const ok = redirected && nextVisible && backToBroken;
console.log('=== M5 E2E RESULT ===', ok ? 'PASS' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
