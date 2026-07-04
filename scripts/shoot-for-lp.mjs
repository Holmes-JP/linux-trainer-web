// hackinglabo 特設ページ用のスクリーンショット撮影 (一時利用)。
// 使い方: node scripts/shoot-for-lp.mjs <outDir>
import { chromium } from 'playwright';

const OUT = process.argv[2];
if (!OUT) throw new Error('outDir を指定');

const BASE = 'https://holmes-jp.github.io/linux-trainer-web';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// 1. シナリオ一覧
await page.goto(`${BASE}/play`, { waitUntil: 'load' });
await page.waitForSelector('[data-scenario]', { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/trainer-list.png` });

// 2. シナリオ詳細
await page.goto(`${BASE}/play?id=find-big-file`, { waitUntil: 'load' });
await page.waitForSelector('#launch-btn', { timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/trainer-detail.png` });

// 3. 挑戦画面 (READY まで待って撮る。ダメなら BOOTING のまま撮る)
await page.goto(`${BASE}/play?id=find-big-file&start=1`, { waitUntil: 'load' });
try {
	await page.waitForSelector('#m1-check-btn:not([disabled])', { timeout: 240000 });
	await page.waitForTimeout(2000);
} catch {
	console.log('READY 待ちタイムアウト — 現状のまま撮影');
}
await page.screenshot({ path: `${OUT}/trainer-challenge.png` });

await browser.close();
console.log('done');
