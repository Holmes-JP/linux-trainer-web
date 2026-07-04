<script>
	// シナリオ一覧 (Refined - Scenario List デザイン準拠)。
	// トップバー / ヒーロー+進捗 / 難易度・カテゴリフィルタ / LEVEL 1-3 の学習パス。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { base } from '$app/paths';
	import { progress, resetProgress } from '$lib/stores/progress';
	import { t, FONT_SANS, FONT_MONO, themeMode, toggleTheme } from '$lib/design/theme';
	import { fmtDuration } from '$lib/util/format';

	/** Scenario[] (loader が読み込んだ manifest メタ) */
	export let scenarios = [];

	let diff = 'all';
	let cat = 'all';
	let query = '';
	let confirmingReset = false;

	const catIcons = {
		permissions: 'fas fa-lock',
		filesystem: 'fas fa-folder-open',
		processes: 'fas fa-microchip',
		disk: 'fas fa-hard-drive',
		services: 'fas fa-gears',
		logs: 'fas fa-file-lines'
	};
	const diffColor = { easy: t.accent, medium: t.amber, hard: t.red };
	const tierOrder = { easy: 0, medium: 1, hard: 2 };
	const cats = ['all', 'permissions', 'filesystem', 'processes', 'disk', 'services', 'logs'];
	const levelDefs = [
		{ key: 'easy', badge: 'LEVEL 1', name: '基本操作で直す' },
		{ key: 'medium', badge: 'LEVEL 2', name: '調査して原因を絞る' },
		{ key: 'hard', badge: 'LEVEL 3', name: '複合的な障害対応' }
	];

	// 推奨順 = 難易度 easy→hard (index.yaml 内順は安定ソートで保持)。番号 01.. を全体に振る。
	$: sorted = [...scenarios]
		.map((s, i) => ({ ...s, _i: i }))
		.sort((a, b) => (tierOrder[a.difficulty] - tierOrder[b.difficulty]) || (a._i - b._i))
		.map((s, i) => ({
			...s,
			num: String(i + 1).padStart(2, '0'),
			icon: catIcons[s.category] ?? 'fas fa-terminal',
			completed: !!$progress.completed[s.id],
			bestMs: $progress.completed[s.id]?.bestMs
		}));
	$: nextId = (sorted.find((s) => !s.completed) ?? {}).id;
	$: q = query.trim().toLowerCase();
	$: visible = sorted.filter(
		(s) =>
			(diff === 'all' || s.difficulty === diff) &&
			(cat === 'all' || s.category === cat) &&
			(q === '' || `${s.title} ${s.id} ${s.category}`.toLowerCase().includes(q))
	);

	function pickRandom() {
		// 未完了を優先。無ければ全体からランダム
		const pool = sorted.filter((s) => !s.completed);
		const from = pool.length ? pool : sorted;
		if (!from.length) return;
		const pick = from[Math.floor(Math.random() * from.length)];
		location.href = `${base}/play?id=${pick.id}`;
	}
	function doReset() {
		confirmingReset = false;
		resetProgress();
	}
	$: levels = levelDefs
		.map((lv) => ({
			...lv,
			color: diffColor[lv.key],
			items: visible.filter((s) => s.difficulty === lv.key),
			doneLabel:
				sorted.filter((s) => s.difficulty === lv.key && s.completed).length +
				'/' +
				sorted.filter((s) => s.difficulty === lv.key).length
		}))
		.filter((lv) => lv.items.length > 0);

	$: completedCount = sorted.filter((s) => s.completed).length;
	$: total = sorted.length;
	$: progressPct = total ? Math.round((completedCount / total) * 100) : 0;

	function chipStyle(active, color) {
		const c = color ?? t.accent;
		return active
			? `background:${c}; color:${t.bg}; border-color:${c};`
			: `background:transparent; color:${t.dim}; border-color:${t.border};`;
	}
</script>

<main class="list-root scrollbar">
	<!-- Top bar -->
	<header class="topbar">
		<div style="display:flex; align-items:center; gap:12px;">
			<span style="font-family:{FONT_MONO}; font-size:14px; color:{t.accent};">user@webvm:~$</span>
			<span style="font-weight:600; font-size:15px; letter-spacing:0.02em;">Linux トラブルシューティング演習</span>
		</div>
		<div style="display:flex; align-items:center; gap:16px;">
			<span style="font-family:{FONT_MONO}; font-size:12px; color:{t.dim};">POWERED BY WEBVM / CHEERPX</span>
			<button
				class="theme-toggle"
				title="テーマ切り替え (ライト/ダーク)"
				aria-label="テーマ切り替え"
				on:click={toggleTheme}
				style="color:{t.dim};"
			><i class="fas {$themeMode === 'dark' ? 'fa-sun' : 'fa-moon'}"></i></button>
		</div>
	</header>

	<div class="container">
		<!-- Hero / progress -->
		<section class="hero">
			<div style="max-width:520px;">
				<h1 style="margin:0 0 8px 0; font-size:26px; line-height:1.3; font-weight:700;">壊れたサーバーを、直せ。</h1>
				<p style="margin:0 0 14px 0; font-size:14px; line-height:1.7; color:{t.dim};">
					ブラウザの中で本物の Debian が起動する。シナリオを選ぶと環境が「壊れた状態」で用意されるので、ターミナルで調査・修復し、Check で採点しよう。
				</p>
				<button class="random-btn" on:click={pickRandom} style="border-color:{t.accentBorder}; color:{t.accent};">
					<i class="fas fa-shuffle" style="margin-right:7px;"></i>ランダムに挑戦
				</button>
			</div>
			<div class="progress-card">
				<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">
					<span style="font-family:{FONT_MONO}; font-size:11px; letter-spacing:0.1em; color:{t.dim};">PROGRESS</span>
					<span id="progress-count" style="font-family:{FONT_MONO}; font-size:14px; color:{t.accent};">
						{completedCount}<span style="color:{t.dim};">/{total} 修復済み</span>
					</span>
				</div>
				<div style="height:6px; border-radius:3px; background:{t.track}; overflow:hidden;">
					<div style="height:100%; width:{progressPct}%; background:{t.accent}; border-radius:3px; transition:width 0.4s ease;"></div>
				</div>
				<div style="margin-top:12px; display:flex; justify-content:flex-end;">
					{#if !confirmingReset}
						<button class="reset-link" on:click={() => (confirmingReset = true)} style="color:{t.dim};" disabled={completedCount === 0}>
							<i class="fas fa-rotate-left" style="margin-right:5px;"></i>進捗をリセット
						</button>
					{:else}
						<span style="display:flex; align-items:center; gap:8px; font-size:11px; color:{t.text};">
							全消去?
							<button class="reset-link" on:click={doReset} style="color:{t.red};">はい</button>
							<button class="reset-link" on:click={() => (confirmingReset = false)} style="color:{t.dim};">やめる</button>
						</span>
					{/if}
				</div>
			</div>
		</section>

		<!-- Filters -->
		<section class="filters">
			<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
				<span style="font-family:{FONT_MONO}; font-size:11px; letter-spacing:0.1em; color:{t.dim}; margin-right:2px;">難易度</span>
				{#each [['all', null], ['easy', diffColor.easy], ['medium', diffColor.medium], ['hard', diffColor.hard]] as [label, color]}
					<button class="chip" style={chipStyle(diff === label, color)} on:click={() => (diff = label)}>{label}</button>
				{/each}
			</div>
			<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
				<span style="font-family:{FONT_MONO}; font-size:11px; letter-spacing:0.1em; color:{t.dim}; margin-right:2px;">カテゴリ</span>
				{#each cats as c}
					<button class="chip" style={chipStyle(cat === c, null)} on:click={() => (cat = c)}>{c}</button>
				{/each}
			</div>
			<div style="position:relative; margin-left:auto;">
				<i class="fas fa-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:11px; color:{t.dim};"></i>
				<input
					class="search"
					type="text"
					placeholder="検索 (タイトル / カテゴリ)"
					bind:value={query}
					style="background:{t.track}; border-color:{t.border}; color:{t.text};"
				/>
			</div>
		</section>

		{#if visible.length === 0}
			<p style="color:{t.dim}; font-size:13px; margin:0 0 36px 0;">条件に一致するシナリオがありません。</p>
		{/if}

		<!-- Learning path -->
		{#each levels as lv}
			<section style="margin-bottom:36px;">
				<div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
					<span style="font-family:{FONT_MONO}; font-size:12px; letter-spacing:0.12em; color:{lv.color}; border:1px solid {lv.color}; border-radius:4px; padding:2px 10px;">{lv.badge}</span>
					<span style="font-size:14px; font-weight:600;">{lv.name}</span>
					<span style="font-family:{FONT_MONO}; font-size:12px; color:{t.dim};">{lv.doneLabel}</span>
					<div style="flex:1; height:1px; background:{t.border};"></div>
				</div>
				<div class="card-grid">
					{#each lv.items as s}
						<a
							href="{base}/play?id={s.id}"
							data-scenario={s.id}
							data-sveltekit-reload
							class="card"
							class:is-next={s.id === nextId}
							style="--card-border:{s.id === nextId ? t.accentBorder : t.border};"
						>
							<span style="font-family:{FONT_MONO}; font-size:13px; color:{s.completed ? t.accent : t.dim}; width:24px; flex-shrink:0;">{s.num}</span>
							<span class="card-icon" style="color:{diffColor[s.difficulty]};"><i class={s.icon} style="font-size:14px;"></i></span>
							<span style="flex:1; min-width:0;">
								<span style="display:block; font-size:14px; font-weight:600; line-height:1.4;">{s.title}</span>
								<span style="display:flex; gap:10px; margin-top:3px; font-family:{FONT_MONO}; font-size:11px; color:{t.dim};">
									<span>{s.category}</span>
									<span>~{s.time_estimate_min ?? '?'}min</span>
								</span>
							</span>
							{#if s.completed}
								<span style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">
									<span class="completed-badge" style="font-family:{FONT_MONO}; font-size:11px; color:{t.accent}; display:flex; align-items:center; gap:5px;">
										<i class="fas fa-check"></i>FIXED
									</span>
									{#if s.bestMs}
										<span style="font-family:{FONT_MONO}; font-size:10px; color:{t.dim};"><i class="far fa-clock" style="margin-right:3px;"></i>最短 {fmtDuration(s.bestMs)}</span>
									{/if}
								</span>
							{:else if s.id === nextId}
								<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.bg}; background:{t.accent}; border-radius:4px; padding:3px 8px; flex-shrink:0;">▶ 次はこれ</span>
							{/if}
						</a>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</main>

<style>
	.list-root {
		/* global.css が body { overflow:hidden } を全ルートに掛けるため、
		   一覧はページ自身をスクロールコンテナにする */
		height: 100vh;
		overflow-y: auto;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		box-sizing: border-box;
		padding: 0 0 96px 0;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 32px;
		height: 56px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}
	.container {
		max-width: 880px;
		margin: 0 auto;
		padding: 40px 32px 0 32px;
	}
	.hero {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 32px;
		flex-wrap: wrap;
		margin-bottom: 32px;
	}
	.progress-card {
		min-width: 260px;
		flex: 0 0 auto;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px 20px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		align-items: center;
		margin-bottom: 28px;
	}
	.chip {
		font-family: var(--font-mono);
		font-size: 12px;
		padding: 5px 12px;
		border-radius: 999px;
		cursor: pointer;
		border: 1px solid;
	}
	.random-btn {
		background: transparent;
		border: 1px solid;
		border-radius: 6px;
		padding: 8px 16px;
		font-family: var(--font-mono);
		font-size: 13px;
		cursor: pointer;
		transition: filter 0.15s ease;
	}
	.random-btn:hover {
		filter: brightness(1.15);
	}
	.reset-link {
		background: transparent;
		border: none;
		font-size: 11px;
		cursor: pointer;
		padding: 0;
	}
	.theme-toggle {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 14px;
		padding: 4px 6px;
		transition: color 0.15s ease;
	}
	.theme-toggle:hover {
		color: var(--accent) !important;
	}
	.reset-link:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.search {
		font-family: var(--font-sans);
		font-size: 12.5px;
		padding: 6px 10px 6px 28px;
		border-radius: 6px;
		border: 1px solid;
		outline: none;
		width: 220px;
	}
	.search:focus {
		border-color: var(--accent);
	}
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 10px;
	}
	.card {
		display: flex;
		align-items: center;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--card-border);
		border-radius: 8px;
		padding: 14px 16px;
		text-decoration: none;
		color: var(--text);
		position: relative;
		overflow: hidden;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.card:hover {
		border-color: var(--accent);
		background: var(--surface-hover);
	}
	.card-icon {
		width: 34px;
		height: 34px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		background: var(--track);
	}

	@media (max-width: 720px) {
		.topbar {
			padding: 0 16px;
		}
		.container {
			padding: 28px 16px 0 16px;
		}
		.card-grid {
			grid-template-columns: 1fr;
		}
		.search {
			width: 100%;
		}
		.hero {
			gap: 20px;
		}
		.progress-card {
			min-width: 0;
			width: 100%;
		}
	}
</style>
