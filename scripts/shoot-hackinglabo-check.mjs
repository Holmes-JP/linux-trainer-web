// hackinglabo ローカルの視覚確認用スクショ (一時利用)。
// 使い方: node scripts/shoot-hackinglabo-check.mjs <outDir>
import { chromium } from 'playwright';

const OUT = process.argv[2];
const BASE = 'http://localhost:9000';
const browser = await chromium.launch();

async function shot(path, viewport, out, fullPage = false) {
	const page = await browser.newPage({ viewport });
	await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
	await page.waitForTimeout(1200);
	await page.screenshot({ path: `${OUT}/${out}`, fullPage });
	await page.close();
}

await shot('/trainer', { width: 1440, height: 900 }, 'lp-desktop.png', true);
await shot('/trainer', { width: 375, height: 812 }, 'lp-mobile.png', true);
await shot('/', { width: 1440, height: 900 }, 'home-1440.png');
await shot('/', { width: 1150, height: 900 }, 'home-1150.png');
await shot('/', { width: 1024, height: 900 }, 'home-1024.png');

await browser.close();
console.log('done');
