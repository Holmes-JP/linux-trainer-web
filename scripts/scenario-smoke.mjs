// 全シナリオのスモークテスト:
//  各シナリオについて (a) setup が成功する (b) 直後の Check が全項目 ❌ (正しく壊れている)
//  (c) solution 相当の修復を control channel で適用すると全項目 ✅ (解ける) を確認する。
// 使い方: M0_PORT=5174 node scripts/scenario-smoke.mjs [id ...]
import { chromium } from 'playwright';

const port = process.env.M0_PORT ?? '5173';
const base = `http://localhost:${port}`;

// solution を control channel (root) で適用するためのコマンド
const FIXES = {
	'locked-flag': 'chmod 644 /home/user/flag.txt',
	'lost-config': 'cp /etc/myapp/app.conf.bak /etc/myapp/app.conf',
	'rogue-process': 'pkill -x cryptominer; rm -f /usr/local/bin/cryptominer',
	'log-flood': 'rm -f /var/log/webapp/access.log',
	'dead-service': 'chmod +x /usr/local/bin/sensord && /etc/init.d/sensor-agent start && sleep 1',
	'log-detective': 'echo 6 > /home/user/answer.txt',
	'backdoor-cleanup': 'pkill -x backdoord; rm -f /usr/local/sbin/backdoord /etc/rc.local.d/backdoor.sh',
	'broken-symlink': 'ln -sfn /etc/webapp/settings.prod.conf /etc/webapp/current.conf',
	'top-offender': 'echo 10.0.0.66 > /home/user/answer.txt',
	'web-permissions': 'chown user:user /var/www/html/uploads',
	'disk-hog': 'rm -f /var/data/dump1.bin /var/data/cache.tmp',
	'flaky-service': 'chmod +x /usr/local/sbin/monitord && mkdir -p /var/lib/monitord && /etc/init.d/monitor start && sleep 1',
	'loose-permissions': 'chmod 755 /usr/local/bin/deploy.sh && chmod 600 /etc/deploy/secrets.env',
	'recursive-ownership': 'chown -R user:user /home/user/project',
	'find-error': 'echo 3 > /home/user/answer.txt',
	'runaway-loop': 'pkill -x busyloop',
	'find-big-file': 'rm -f /var/lib/app/cache/data/blob.bin',
	'missing-dir': 'mkdir -p /var/spool/myapp && chown user:user /var/spool/myapp',
	'stopped-service': '/etc/init.d/heartbeat start && sleep 1',
	'wrong-config': "sed -i 's/^enabled = false/enabled = true/' /etc/api-gateway/gateway.conf"
};

const ids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(FIXES);
const browser = await chromium.launch();
const summary = [];

for (const id of ids) {
	const page = await browser.newPage();
	page.on('pageerror', e => console.log(`[${id}] pageerror:`, e.message));
	const row = { id, setup: false, broken: false, fixable: false };
	try {
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
			// (b) 壊れていることの確認: 全 check が fail のはず
			await page.click('#m1-check-btn');
			await page.waitForFunction(
				() => window.__PLAY__?.results?.length > 0 && window.__PLAY__?.phase === 'ready',
				null, { timeout: 120000 }
			);
			state = await page.evaluate(() => window.__PLAY__);
			// 「壊れている」= 未解決 = 少なくとも1つの check が fail。
			// (important.db を残す等の不変条件チェックは壊れた状態でも pass するため、
			//  「全 check fail」ではなく「全 check pass ではない」で判定する)
			row.broken = state.results.some(r => !r.pass);
			console.log(`[${id}] after setup:`, state.results.map(r => `${r.pass ? '✅' : '❌'} ${r.description}`).join(' | '));

			// (c) 修復を適用して全 pass になること
			const fixResult = await page.evaluate((cmd) => window.__PLAY_EXEC__(cmd, 'root'), FIXES[id]);
			if (fixResult.exitCode !== 0) console.log(`[${id}] fix cmd exit=${fixResult.exitCode}: ${fixResult.stdout}`);
			await page.click('#m1-check-btn');
			await page.waitForFunction(
				() => window.__PLAY__?.phase === 'ready' && window.__PLAY__?.passed !== null,
				null, { timeout: 120000 }
			);
			state = await page.evaluate(() => window.__PLAY__);
			row.fixable = state.passed === true;
			console.log(`[${id}] after fix:`, state.results.map(r => `${r.pass ? '✅' : '❌'} ${r.description}`).join(' | '));
		}
	} catch (e) {
		console.log(`[${id}] ERROR:`, e.message);
	}
	summary.push(row);
	await page.close();
}

console.log('=== SMOKE SUMMARY ===');
for (const r of summary)
	console.log(`${r.setup && r.broken && r.fixable ? 'PASS' : 'FAIL'}  ${r.id}  (setup=${r.setup} broken=${r.broken} fixable=${r.fixable})`);
await browser.close();
process.exit(summary.every(r => r.setup && r.broken && r.fixable) ? 0 : 1);
