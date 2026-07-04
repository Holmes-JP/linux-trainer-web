// 全シナリオのスモークテスト。各シナリオについて次を検証する:
//  (a) setup が成功する
//  (b) 直後の Check が未解決 (壊れている)
//  (c) 冪等性: setup を再実行しても壊れず、状態が変わらない (Spec 鉄則①)
//  (d) manifest の verify_fix (模範修復) を適用すると全 check pass (解ける)
// verify_fix と id 一覧は manifest / index.yaml から読む (単一ソース)。
// 使い方: M0_PORT=5174 node scripts/scenario-smoke.mjs [id ...]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;
const root = fileURLToPath(new URL('..', import.meta.url));
const readManifest = (id) => load(readFileSync(`${root}scenarios/${id}/manifest.yaml`, 'utf8'));
const allIds = load(readFileSync(`${root}scenarios/index.yaml`, 'utf8')).scenarios;

const ids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : allIds;
const browser = await chromium.launch();
const summary = [];

const runCheck = async (page) => {
	await page.click('#m1-check-btn');
	await page.waitForFunction(
		() => window.__PLAY__?.results?.length > 0 && window.__PLAY__?.phase === 'ready',
		null, { timeout: 120000 }
	);
	return page.evaluate(() => window.__PLAY__);
};
// 「壊れている / 未解決」= 少なくとも1つの check が fail。
// (important.db を残す等の不変条件チェックは壊れた状態でも pass するため some() で判定)
const isBroken = (state) => state.results.some((r) => !r.pass);

for (const id of ids) {
	const page = await browser.newPage();
	page.on('pageerror', (e) => console.log(`[${id}] pageerror:`, e.message));
	const row = { id, setup: false, broken: false, idempotent: false, fixable: false };
	try {
		const fix = readManifest(id).verify_fix;
		if (!fix) throw new Error('manifest に verify_fix が無い');

		await page.goto(`${base}/play?id=${id}&start=1`, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(
			() => ['ready', 'setup-failed'].includes(window.__PLAY__?.phase),
			null, { timeout: 300000 }
		);
		let state = await page.evaluate(() => window.__PLAY__);
		row.setup = state.phase === 'ready';
		if (!row.setup) {
			console.log(`[${id}] setup FAILED:`, state.error);
		} else {
			// (b) 壊れている
			state = await runCheck(page);
			row.broken = isBroken(state);
			console.log(`[${id}] after setup:`, state.results.map((r) => `${r.pass ? '✅' : '❌'} ${r.description}`).join(' | '));

			// (c) 冪等性: setup 再実行が成功し、まだ壊れている
			const re = await page.evaluate(() => window.__PLAY_SETUP__());
			if (!re.ok) {
				console.log(`[${id}] re-setup FAILED (冪等性違反):`, re.error);
			} else {
				state = await runCheck(page);
				row.idempotent = isBroken(state);
				if (!row.idempotent) console.log(`[${id}] 冪等性: 再 setup 後に壊れていない`);
			}

			// (d) 模範修復で解ける
			const fixResult = await page.evaluate((cmd) => window.__PLAY_EXEC__(cmd, 'root'), fix);
			if (fixResult.exitCode !== 0) console.log(`[${id}] verify_fix exit=${fixResult.exitCode}: ${fixResult.stdout}`);
			state = await runCheck(page);
			row.fixable = state.passed === true;
			console.log(`[${id}] after fix:`, state.results.map((r) => `${r.pass ? '✅' : '❌'} ${r.description}`).join(' | '));
		}
	} catch (e) {
		console.log(`[${id}] ERROR:`, e.message);
	}
	summary.push(row);
	await page.close();
}

console.log('=== SMOKE SUMMARY ===');
const ok = (r) => r.setup && r.broken && r.idempotent && r.fixable;
for (const r of summary)
	console.log(`${ok(r) ? 'PASS' : 'FAIL'}  ${r.id}  (setup=${r.setup} broken=${r.broken} idempotent=${r.idempotent} fixable=${r.fixable})`);
await browser.close();
process.exit(summary.every(ok) ? 0 : 1);
