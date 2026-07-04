// 解説セクション (/learn) の E2E。VM を起動しないので高速に回る。
//  (a) ハブ: タブ (コマンド/仕組み解説/用語集) とコマンドカードが描画される
//  (b) 全文検索: 本文にしかない語でヒットし、スニペットが出る
//  (c) コマンド詳細 (?cmd=) : 書式・使用例・注記が描画される
//  (d) 記事 (?article=) : Markdown がレンダリングされる (テーブル含む)
//  (e) 用語集 (?tab=glossary&term=) : 該当語のカードが描画される
// 使い方: M0_PORT=5173 node scripts/learn-e2e.mjs
import { chromium } from 'playwright';

const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

const results = [];
const check = (name, cond) => {
	results.push([name, !!cond]);
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
};

// (a) ハブ
await page.goto(`${base}/learn`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.cmd-card', { timeout: 15000 });
check('hub: コマンドカードが描画される', (await page.locator('.cmd-card').count()) >= 10);
check('hub: タブが3つある', (await page.locator('.chip').count()) === 3);

// タブ切り替え
await page.click('.chip:has-text("仕組み解説")');
await page.waitForSelector('.article-card');
check('hub: 記事タブに記事が並ぶ', (await page.locator('.article-card').count()) >= 2);
await page.click('.chip:has-text("用語集")');
await page.waitForSelector('.term-card');
check('hub: 用語集タブに用語が並ぶ', (await page.locator('.term-card').count()) >= 10);

// (b) 全文検索 (「見落としやすい」は permissions 記事の本文にしかない)
await page.fill('.big-search', '見落としやすい');
await page.waitForSelector('.hit-card', { timeout: 5000 });
const hitText = await page.locator('.hit-card').first().textContent();
check('search: 本文の語でヒットする', hitText.includes('パーミッション'));
check('search: スニペットが表示される', hitText.includes('見落としやすい'));

// (c) コマンド詳細
await page.goto(`${base}/learn?cmd=chmod`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('h1:has-text("chmod")', { timeout: 15000 });
const cmdBody = await page.locator('.container').textContent();
check('cmd: 書式が描画される', cmdBody.includes('書式') && cmdBody.includes('モード'));
check('cmd: 使用例が描画される', cmdBody.includes('chmod 644'));
check('cmd: 注記 (note) が描画される', cmdBody.includes('su root'));
check('cmd: 関連リンクが描画される', cmdBody.includes('chown'));

// (d) 記事
await page.goto(`${base}/learn?article=permissions`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.prose h2', { timeout: 15000 });
check('article: 見出しがレンダリングされる', (await page.locator('.prose h2').count()) >= 3);
check('article: テーブルがレンダリングされる', (await page.locator('.prose table').count()) >= 2);
check(
	'article: コードブロックがレンダリングされる',
	(await page.locator('.prose pre').count()) >= 1
);

// (e) 用語集の強調表示
await page.goto(`${base}/learn?tab=glossary&term=PID`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.term-card', { timeout: 15000 });
check('glossary: term 指定で用語カードが出る', (await page.locator('#term-PID').count()) === 1);

check('console: ページエラーなし', pageErrors.length === 0);
if (pageErrors.length) console.log('pageerrors:', pageErrors);

await browser.close();
const allOk = results.every(([, ok]) => ok);
console.log(`=== LEARN E2E: ${allOk ? 'ALL PASS' : 'FAILED'} (${results.length} checks) ===`);
process.exit(allOk ? 0 : 1);
