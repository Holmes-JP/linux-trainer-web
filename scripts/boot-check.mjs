// 単独ブラウザで locked-flag の VM 起動時間を測る (起動不良の切り分け用)
import { chromium } from 'playwright';
const port = process.env.M0_PORT ?? '5173';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (/error|fail|cheerpx|CheerpX/i.test(t)) console.log('[console]', t.slice(0,160)); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`http://localhost:${port}/play?id=locked-flag`, { waitUntil: 'domcontentloaded' });
// phase の推移を追う
let last = '';
const deadline = Date.now() + 180000;
while (Date.now() < deadline) {
	const st = await page.evaluate(() => window.__PLAY__ ?? null);
	if (st && st.phase !== last) { console.log(`+${Math.round((Date.now()-t0)/1000)}s  phase=${st.phase}` + (st.error ? ` error=${st.error}` : '')); last = st.phase; }
	if (st && (st.phase === 'ready' || st.phase === 'setup-failed')) break;
	await page.waitForTimeout(1000);
}
console.log(`total ${Math.round((Date.now()-t0)/1000)}s, final phase=${last}`);
await browser.close();
