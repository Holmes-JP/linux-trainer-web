// M4 E2E: 選択 → 挑戦 → 完了記録 → 永続化の一周 (Spec.md §8 M4)。
//  1. /play の一覧に5シナリオが出る (完了 0/5)
//  2. locked-flag を選んで挑戦 → Check ❌ → ターミナルで修復 → Check ✅
//  3. 一覧に戻ると ✅ 完了バッジ + 完了 1/5
//  4. reload しても進捗が残る (localStorage)
// 使い方: M0_PORT=5174 node scripts/play-e2e.mjs
import { chromium } from 'playwright';

const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;

const browser = await chromium.launch();
const context = await browser.newContext(); // 同一 context = localStorage 共有
const page = await context.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));

// --- 1. 一覧 ---
await page.goto(`${base}/play`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
const listCount = await page.locator('[data-scenario]').count();
const progress0 = await page.locator('#progress-count').textContent();
console.log('[driver] list:', listCount, 'scenarios |', progress0.trim());

// --- 2. locked-flag: カード → 詳細 → 起動 ---
await page.click('[data-scenario="locked-flag"]');
await page.waitForSelector('#launch-btn', { timeout: 60000 }); // 詳細ページ
console.log('[driver] detail page shown');
await page.click('#launch-btn');
await page.waitForFunction(() => window.__PLAY__?.phase === 'ready', null, { timeout: 300000 });
console.log('[driver] setup done');

await page.click('#m1-check-btn');
await page.waitForFunction(() => window.__PLAY__?.results?.length > 0 && window.__PLAY__?.phase === 'ready', null, { timeout: 120000 });
let state = await page.evaluate(() => window.__PLAY__);
console.log('[driver] first check passed:', state.passed, '(false expected)');

// ターミナルから修復 (su root → chmod)
await page.click('#console');
await page.keyboard.type('su root\n', { delay: 30 });
await page.waitForTimeout(4000);
await page.keyboard.type('password\n', { delay: 30 });
await page.waitForTimeout(5000);
await page.keyboard.type('chmod 644 /home/user/flag.txt; exit\n', { delay: 30 });
await page.waitForTimeout(4000);

await page.click('#m1-check-btn');
await page.waitForFunction(() => window.__PLAY__?.phase === 'ready' && window.__PLAY__?.passed !== null, null, { timeout: 120000 });
state = await page.evaluate(() => window.__PLAY__);
console.log('[driver] second check passed:', state.passed, '(true expected)');

// --- 3. 一覧に戻って完了バッジ確認 ---
await page.click('#back-to-list');
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
const badge1 = await page.locator('[data-scenario="locked-flag"] .completed-badge').count();
const progress1 = (await page.locator('#progress-count').textContent()).trim();
console.log('[driver] after complete: badge =', badge1 === 1, '|', progress1);

// --- 4. reload して永続化確認 ---
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
const badge2 = await page.locator('[data-scenario="locked-flag"] .completed-badge').count();
const progress2 = (await page.locator('#progress-count').textContent()).trim();
console.log('[driver] after reload: badge =', badge2 === 1, '|', progress2);

await page.screenshot({ path: 'scripts/play-e2e.png' });
const ok =
	listCount >= 5 &&
	state.passed === true &&
	badge1 === 1 &&
	badge2 === 1 &&
	// Refined デザインの進捗表示は "1/20 修復済み" 形式 (スペース無し)
	progress2.replace(/\s/g, '').includes(`1/${listCount}`);
console.log('=== M4 E2E RESULT ===', ok ? 'PASS' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
