<script>
	// シナリオ選択 + 挑戦ページ (Spec.md §8 M4)。
	//   /play           → シナリオ一覧 (VM は起動しない)
	//   /play?id=<id>   → その id のシナリオに挑戦 (boot → setup → 修復 → Check)
	// 完了は localStorage (progress store) に記録される。
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import WebVM from '$lib/WebVM.svelte';
	import { fmtDuration } from '$lib/util/format';
	import * as configObj from '/config_terminal';
	import ScenarioPanel from '$lib/components/ScenarioPanel.svelte';
	import ScenarioList from '$lib/components/ScenarioList.svelte';
	import ScenarioDetail from '$lib/components/ScenarioDetail.svelte';
	import { ControlChannel, runSetup, runChecks } from '$lib/scenario/runner';
	import { loadScenario, loadScenarioIndex } from '$lib/scenario/loader';
	import { markComplete } from '$lib/stores/progress';
	import { t, themes, FONT_SANS, FONT_MONO } from '$lib/design/theme';
	import '$lib/design/theme.css';

	// 挑戦画面 (Refined - Challenge) の見た目マップ
	const catIcons = {
		permissions: 'fas fa-lock',
		filesystem: 'fas fa-folder-open',
		processes: 'fas fa-microchip',
		disk: 'fas fa-hard-drive',
		services: 'fas fa-gears',
		logs: 'fas fa-file-lines'
	};
	const diffColor = { easy: t.accent, medium: t.amber, hard: t.red };
	const diffBorder = {
		easy: t.accentBorder,
		medium: 'rgba(217,180,74,0.4)',
		hard: 'rgba(229,115,104,0.4)'
	};
	const phaseMap = {
		booting: { label: 'BOOTING…', color: t.amber },
		'setting-up': { label: 'SETTING UP…', color: t.amber },
		ready: { label: 'READY', color: t.accent },
		checking: { label: 'CHECKING…', color: t.amber },
		'setup-failed': { label: 'FAILED', color: t.red }
	};
	$: ph = phaseMap[phase] ?? phaseMap.ready;
	// xterm は CSS var を解決できないため実 hex を使う (ターミナルは常に暗色)
	const termTheme = {
		background: themes.dark.termBg,
		foreground: themes.dark.termText,
		cursor: themes.dark.accent,
		cursorAccent: themes.dark.termBg,
		selectionBackground: 'rgba(74,222,128,0.25)'
	};

	let mode = null; // 'list' | 'detail' | 'challenge' (onMount で確定)
	let scenarioId = null;
	let allScenarios = [];
	let scenario = null;
	let scenarioPromise = null;
	let webvm = null; // WebVM コンポーネント参照 (resetVM 呼び出し用)
	let channel = null;
	let phase = 'booting'; // booting → setting-up → ready → checking → ready / setup-failed
	let results = [];
	let passed = null;
	let errorMsg = '';
	let mounted = false;
	let bootStalled = false; // 起動が長引いているか (再読み込みを促す用)
	let showTimer = true; // ヘッダの経過時間表示 (クリックで切り替え)

	// 自動テスト (scripts/play-e2e.mjs 等) から状態を観測するためのフック
	function publishState() {
		if (typeof window === 'undefined') return;
		window.__PLAY__ = { scenarioId, phase, results, passed, error: errorMsg };
	}
	$: scenarioId, phase, results, passed, errorMsg, publishState();

	// 対話シェルの初期化中に setup を走らせると bash がジョブ制御の警告を
	// ターミナルに出すため、プロンプトが描画されるまで setup を遅らせる。
	let shellStarted = null;
	const shellStartedPromise = new Promise((resolve) => (shellStarted = resolve));
	function handleProcessCreated() {
		shellStarted();
	}
	async function waitForShellPrompt(timeoutMs = 20000) {
		const t0 = Date.now();
		while (Date.now() - t0 < timeoutMs) {
			const rows = document.querySelectorAll('#console .xterm-rows > div');
			const text = Array.from(rows)
				.map((r) => r.textContent)
				.join('\n');
			if (/[$#]\s*$/m.test(text)) return;
			await new Promise((r) => setTimeout(r, 300));
		}
		// タイムアウト時はそのまま進める (setup を止めるほどの問題ではない)
	}

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		scenarioId = params.get('id');
		const start = params.get('start');
		if (scenarioId) {
			// 詳細・挑戦どちらも manifest が要る
			scenarioPromise = loadScenario(scenarioId).then((s) => (scenario = s));
			scenarioPromise.catch((e) => {
				errorMsg = e.toString();
				phase = 'setup-failed';
			});
			if (start) {
				// 挑戦モード: VM を起動する。booting が長引けば再読み込みを促す。
				mode = 'challenge';
				setTimeout(() => {
					if (phase === 'booting') bootStalled = true;
				}, 45000);
			} else {
				// 詳細モード: VM は起動しない
				mode = 'detail';
			}
		} else {
			// 一覧表示: index を読み、各 manifest のメタ情報を集める
			mode = 'list';
			try {
				const ids = await loadScenarioIndex();
				allScenarios = await Promise.all(ids.map((id) => loadScenario(id)));
			} catch (e) {
				errorMsg = e.toString();
			}
		}
		mounted = true;
	});

	let solveStartMs = 0; // 修復開始 (ready になった) 時刻。クリア時間の計測用
	let lastSolveMs = 0; // クリア時に確定した経過時間 (表示を止めるため)
	let nowMs = 0; // 1秒ごとに更新される現在時刻 (タイマー表示用)
	let timerInterval = null;
	// 経過時間 (ms)。クリア後は確定値で止める
	$: elapsedMs = passed ? lastSolveMs : solveStartMs ? Math.max(0, nowMs - solveStartMs) : 0;

	function startTimer() {
		nowMs = Date.now();
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			nowMs = Date.now();
		}, 1000);
	}
	onDestroy(() => timerInterval && clearInterval(timerInterval));

	// Ctrl+Enter で Check (ターミナルにフォーカスがあっても効く)
	function handleKey(e) {
		if (mode === 'challenge' && e.ctrlKey && e.key === 'Enter') {
			e.preventDefault();
			handleCheck();
		}
	}

	async function handleCxReady(cx, ctrlDevice) {
		channel = new ControlChannel(cx, ctrlDevice);
		// 検証・デバッグ用: control channel / setup 再実行を叩けるようにする
		if (typeof window !== 'undefined') {
			window.__PLAY_EXEC__ = (cmd, runAs) => channel.exec(cmd, runAs);
			// 冪等性テスト用: setup を再実行し {ok} を返す (二重実行で壊れないことの検証)
			window.__PLAY_SETUP__ = async () => {
				try {
					await runSetup(channel, scenario);
					return { ok: true };
				} catch (e) {
					return { ok: false, error: String(e) };
				}
			};
		}
		phase = 'setting-up';
		try {
			await scenarioPromise; // manifest の取得完了を待ってから壊す
			await shellStartedPromise; // 対話シェルのプロセス生成を待つ
			await waitForShellPrompt(); // プロンプト描画まで待つ (端末獲得の競合を避ける)
			await runSetup(channel, scenario);
			phase = 'ready';
			solveStartMs = Date.now(); // 計測開始
			startTimer();
		} catch (e) {
			errorMsg = e.toString();
			phase = 'setup-failed';
		}
	}

	async function handleCheck() {
		if (!channel || !scenario || phase === 'checking') return;
		phase = 'checking';
		try {
			results = await runChecks(channel, scenario);
			passed = results.every((r) => r.pass);
			if (passed) {
				lastSolveMs = solveStartMs ? Date.now() - solveStartMs : 0;
				if (timerInterval) clearInterval(timerInterval); // タイマー停止
				markComplete(scenario.id, lastSolveMs || undefined);
			}
		} catch (e) {
			errorMsg = e.toString();
		}
		phase = 'ready';
	}

	async function handleReset() {
		if (webvm) await webvm.resetVM(); // overlay 破棄 + reload → fresh boot + setup 再実行
	}

	// ミッションパネルの折りたたみ。幅を 400px⇔0 でスライドさせ、
	// アニメーション中は xterm を追随フィットさせて滑らかに見せる。
	let panelCollapsed = false;
	let panelAnimTimer = null;
	function togglePanel() {
		panelCollapsed = !panelCollapsed;
		if (panelAnimTimer) clearInterval(panelAnimTimer);
		let n = 0;
		panelAnimTimer = setInterval(() => {
			if (webvm) webvm.refit();
			if (++n >= 9) {
				clearInterval(panelAnimTimer);
				panelAnimTimer = null;
			}
		}, 40); // 9×40=360ms > トランジション 280ms
	}
</script>

<svelte:window on:keydown={handleKey} />

{#if mode === 'challenge'}
	<!-- 挑戦画面: 専用フルスクリーンレイアウト (Refined - Challenge)。
	     トップバー / ターミナル列 / ミッションパネル。 -->
	<main
		class="challenge-root scrollbar"
		style="display:flex; flex-direction:column; width:100vw; height:100vh; overflow:hidden;
		       background:{t.bg}; color:{t.text}; font-family:{FONT_SANS};"
	>
		<!-- Top bar -->
		<header class="challenge-header" style="border-bottom:1px solid {t.border}; background:{t.surface};">
			<a
				href="{base}/play"
				id="back-to-list"
				data-sveltekit-reload
				class="backlink"
				style="color:{t.dim};"
			><i class="fas fa-arrow-left" style="font-size:12px;"></i>一覧</a>
			<div style="width:1px; height:20px; background:{t.border};"></div>
			<div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
				{#if scenario}
					<span style="font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{scenario.title}</span>
					<span style="font-family:{FONT_MONO}; font-size:11px; color:{diffColor[scenario.difficulty]}; border:1px solid {diffBorder[scenario.difficulty]}; border-radius:4px; padding:2px 8px; flex-shrink:0;">{scenario.difficulty.toUpperCase()}</span>
					<span class="hide-mobile" style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim}; flex-shrink:0;"><i class="{catIcons[scenario.category] ?? 'fas fa-terminal'}" style="margin-right:5px;"></i>{scenario.category}</span>
					{#if scenario.time_estimate_min}
						<span class="hide-mobile" style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim}; flex-shrink:0;"><i class="far fa-clock" style="margin-right:5px;"></i>~{scenario.time_estimate_min}min</span>
					{/if}
				{/if}
			</div>
			{#if solveStartMs}
				<div class="timer-toggle" role="button" tabindex="0" on:click={() => (showTimer = !showTimer)} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (showTimer = !showTimer))} style="flex-shrink:0; font-family:{FONT_MONO}; font-size:11px; color:{passed ? t.accent : t.dim};" title={showTimer ? '経過時間を隠す (クリック)' : '経過時間を表示 (クリック)'}>
					<i class="far fa-clock" style="margin-right:5px;"></i>{showTimer ? fmtDuration(elapsedMs) : '--:--'}
				</div>
			{/if}
			<div style="display:flex; align-items:center; gap:8px; flex-shrink:0; font-family:{FONT_MONO}; font-size:11px; color:{ph.color};">
				<span style="width:7px; height:7px; border-radius:50%; background:{ph.color};"></span>{ph.label}
			</div>
			<div style="width:1px; height:20px; background:{t.border};"></div>
			<button
				id="panel-toggle"
				class="panel-toggle"
				title={panelCollapsed ? 'ミッションパネルを開く' : 'ミッションパネルを折りたたむ'}
				aria-label="ミッションパネルの開閉"
				on:click={togglePanel}
				style="color:{t.dim};"
			><i class="fas {panelCollapsed ? 'fa-angles-left' : 'fa-angles-right'}"></i></button>
			</header>

		<div class="challenge-body">
			<!-- Terminal column -->
			<div class="challenge-term" style="flex:1; min-width:0; background:{t.termBg}; display:flex; flex-direction:column;">
				<div style="display:flex; align-items:center; gap:8px; padding:8px 16px; border-bottom:1px solid {t.termBorder}; font-family:{FONT_MONO}; font-size:11px; color:{t.termDim}; flex-shrink:0;">
					<i class="fas fa-terminal" style="font-size:10px;"></i>debian@webvm — /bin/bash
				</div>
				<div style="flex:1; position:relative; min-height:0;">
					<WebVM
						bind:this={webvm}
						configObj={configObj}
						cacheId={`blocks_play_${scenarioId}`}
						cxReadyCallback={handleCxReady}
						processCallback={handleProcessCreated}
						bare={true}
						termFontFamily={FONT_MONO}
						termTheme={termTheme}
					/>
				</div>
			</div>

			<!-- Mission panel (折りたたみ可・スライドアニメーション) -->
			<div class="panel-wrap" style="width:{panelCollapsed ? 0 : 400}px;">
				<div class="panel-inner">
					<ScenarioPanel
						{scenario}
						{phase}
						{results}
						{errorMsg}
						{bootStalled}
						on:check={handleCheck}
						on:reset={handleReset}
					/>
				</div>
			</div>
		</div>
	</main>
{:else if mode === 'detail'}
	<ScenarioDetail {scenario} {scenarioId} {errorMsg} />
{:else if mode === 'list'}
	{#if errorMsg}
		<main style="min-height:100vh; background:#0b0f0d; color:#e57368; padding:32px; font-family:'IBM Plex Sans JP',sans-serif;">
			{errorMsg}
		</main>
	{:else}
		<ScenarioList scenarios={allScenarios} />
	{/if}
{/if}

<style>
	:global(body) {
		margin: 0;
	}
	.backlink {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-size: 13px;
		flex-shrink: 0;
		transition: color 0.15s ease;
	}
	.backlink:hover {
		color: var(--text, #e4ede7) !important;
	}
	.timer-toggle {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 4px;
		transition: opacity 0.15s ease;
	}
	.timer-toggle:hover {
		opacity: 0.7;
	}
	.panel-toggle {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 14px;
		padding: 4px 6px;
		flex-shrink: 0;
		transition: color 0.15s ease;
	}
	.panel-toggle:hover {
		color: var(--accent) !important;
	}
	/* パネルの折りたたみ: 幅をスライドさせる。inner は 400px 固定で中身が潰れないようにする */
	.panel-wrap {
		flex-shrink: 0;
		overflow: hidden;
		transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.panel-inner {
		width: 400px;
		height: 100%;
	}
	.challenge-header {
		display: flex;
		align-items: center;
		gap: 20px;
		height: 52px;
		flex-shrink: 0;
		padding: 0 20px;
	}
	.challenge-body {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	/* --- モバイル: ターミナルとパネルを縦積みに --- */
	@media (max-width: 820px) {
		.challenge-header {
			gap: 12px;
			padding: 0 12px;
		}
		.hide-mobile {
			display: none !important;
		}
		.challenge-body {
			flex-direction: column;
		}
		.challenge-term {
			flex: 0 0 auto !important;
			height: 50vh;
		}
		/* パネルは全幅・下段に。折りたたみの固定幅を打ち消す */
		.panel-wrap {
			width: 100% !important;
			flex: 1;
			min-height: 0;
		}
		.panel-inner {
			width: 100%;
		}
		/* パネル折りたたみトグルはモバイルでは意味が薄いので隠す */
		#panel-toggle {
			display: none;
		}
	}
</style>
