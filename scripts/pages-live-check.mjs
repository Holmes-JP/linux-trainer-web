// GitHub Pages 本番の疎通確認 (一覧描画 + serviceWorker による cross-origin isolation)。
// 使い方: node scripts/pages-live-check.mjs
import { chromium } from 'playwright';

const URL = 'https://holmes-jp.github.io/linux-trainer-web/play';

const browser = await chromium.launch();
const page = await browser.newPage();
try {
	await page.goto(URL, { waitUntil: 'load' });
	// serviceWorker が COI ヘッダ注入のため一度 reload するので、カード出現まで余裕を持って待つ
	await page.waitForSelector('[data-scenario]', { timeout: 60000 });
	const cards = await page.locator('[data-scenario]').count();
	const coi = await page.evaluate(() => window.crossOriginIsolated);
	console.log(`scenario cards: ${cards}`);
	console.log(`crossOriginIsolated: ${coi}`);
	if (cards < 1) throw new Error('シナリオ一覧が空');
	if (!coi) throw new Error('cross-origin isolation が有効になっていない (CheerpX が起動できない)');
	console.log('OK');
} finally {
	await browser.close();
}
