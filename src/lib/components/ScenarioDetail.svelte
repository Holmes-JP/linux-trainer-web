<script>
	// シナリオ詳細ページ (一覧 → 詳細 → 挑戦 の中間)。
	// 課題内容 / 想定コマンド / 攻略のコツ を表示し、そこからマシンを起動する。
	import { onMount } from 'svelte';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { base } from '$app/paths';
	import { t, FONT_SANS, FONT_MONO } from '$lib/design/theme';
	import { progress, markComplete, unmarkComplete } from '$lib/stores/progress';
	import { fmtDuration } from '$lib/util/format';
	import { relatedForScenario } from '$lib/learn/related';
	import RelatedLinks from '$lib/components/learn/RelatedLinks.svelte';
	import AskAI from '$lib/components/ai/AskAI.svelte';

	export let scenario = null;
	export let scenarioId = '';
	export let errorMsg = '';

	// 関連する解説 (/learn)。取得に失敗しても詳細ページ自体は成立するので静かに非表示にする
	let relatedDocs = [];
	onMount(async () => {
		try {
			relatedDocs = await relatedForScenario(scenarioId);
		} catch {
			relatedDocs = [];
		}
	});
	$: relArticles = relatedDocs.filter((r) => r.type === 'article');
	$: relCommands = relatedDocs.filter((r) => r.type === 'command').map((r) => r.id);

	$: record = $progress.completed[scenarioId];

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

	// カテゴリごとの「よく使うコマンド」リファレンス (解答ではなく道具の紹介)。
	// 各トークンは [表示, 解説スラッグ] 形式。スラッグがあれば /learn?cmd=... へリンクする。
	const commandsByCategory = {
		permissions: [
			{ cmds: [['ls -l', 'ls']], desc: 'ファイルの所有者と権限 (rwx) を確認する' },
			{ cmds: [['chmod', 'chmod']], desc: '権限を変更する (例: chmod 644 file)' },
			{ cmds: [['chown', 'chown']], desc: '所有者を変更する (例: chown user:user file)' },
			{ cmds: [['id', 'id']], desc: '自分のユーザー / グループを確認する' }
		],
		filesystem: [
			{ cmds: [['ls -la', 'ls']], desc: '隠しファイルも含めて一覧する' },
			{ cmds: [['find', 'find']], desc: 'ファイルを名前・条件で探す (find /etc -name ...)' },
			{ cmds: [['cat', 'cat'], ['less', 'less']], desc: 'ファイルの中身を見る' },
			{ cmds: [['cp', 'cp'], ['mv', 'mv']], desc: 'バックアップから復元・移動する' },
			{ cmds: [['ln -sfn', 'ln']], desc: 'シンボリックリンクを張り直す' }
		],
		processes: [
			{ cmds: [['ps aux', 'ps']], desc: '動いているプロセスを一覧する' },
			{ cmds: [['pgrep -a', 'pgrep']], desc: '名前でプロセスを探す (PID を確認)' },
			{ cmds: [['kill', 'kill'], ['pkill', 'pkill']], desc: 'プロセスを停止する' },
			{ cmds: [['top', 'top']], desc: 'CPU 負荷の高いプロセスを見る' }
		],
		disk: [
			{ cmds: [['du -sb', 'du']], desc: '実サイズ (バイト) で使用量を集計する' },
			{ cmds: [['ls -lS', 'ls']], desc: 'ファイルをサイズの大きい順に並べる' },
			{ cmds: [['find -size +1M', 'find']], desc: '大きいファイルを階層を跨いで探す' },
			{ cmds: [['rm', 'rm'], [': > file', null]], desc: '不要ファイルを削除・空に切り詰める' }
		],
		services: [
			{ cmds: [['service X status/start', 'service']], desc: 'init.d サービスの状態確認・起動' },
			{ cmds: [['/etc/init.d/X', null]], desc: 'init スクリプトを直接実行する' },
			{ cmds: [['pgrep -x', 'pgrep']], desc: 'デーモンが常駐しているか確認する' },
			{ cmds: [['cat', 'cat']], desc: 'ログや設定ファイルを読んで原因を探す' }
		],
		logs: [
			{ cmds: [['cat', 'cat'], ['less', 'less']], desc: 'ログの中身を見る' },
			{ cmds: [['grep', 'grep']], desc: 'キーワードを検索・件数を数える (grep -c)' },
			{ cmds: [['awk', 'awk']], desc: '列 (フィールド) を取り出す ($1, $(NF-1) など)' },
			{ cmds: [['sort', 'sort'], ['uniq -c', 'uniq']], desc: 'IP や値ごとに集計する' }
		]
	};

	$: cmds = scenario ? commandsByCategory[scenario.category] ?? [] : [];
	$: firstHint = scenario?.hints?.[0] ?? null;
	$: aiPrompt = scenario
		? `Linux のトラブルシューティング演習に取り組んでいます。いきなり答えではなく、原因を切り分けるための考え方のヒントを段階的に教えてください。\n\n課題: ${scenario.title}\n状況: ${scenario.description}`
		: '';
</script>

<main class="detail-root scrollbar">
	<!-- Top bar -->
	<header style="display:flex; align-items:center; gap:20px; height:52px; flex-shrink:0; padding:0 20px; border-bottom:1px solid {t.border}; background:{t.surface};">
		<a href="{base}/play" id="back-to-list" data-sveltekit-reload class="backlink" style="color:{t.dim};"><i class="fas fa-arrow-left" style="font-size:12px;"></i>一覧</a>
		<div style="width:1px; height:20px; background:{t.border};"></div>
		<span style="font-family:{FONT_MONO}; font-size:12px; color:{t.dim};">SCENARIO BRIEFING</span>
	</header>

	<div class="container">
		{#if errorMsg}
			<p style="color:{t.red};">{errorMsg}</p>
		{:else if !scenario}
			<p style="color:{t.dim};">読み込み中…</p>
		{:else}
			<!-- Heading -->
			<div style="display:flex; align-items:center; gap:14px; margin-bottom:8px;">
				<span class="detail-icon" style="background:{t.track}; color:{diffColor[scenario.difficulty]};"><i class={catIcons[scenario.category] ?? 'fas fa-terminal'} style="font-size:18px;"></i></span>
				<h1 style="margin:0; font-size:24px; font-weight:700; line-height:1.3;">{scenario.title}</h1>
			</div>
			<div style="display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; align-items:center;">
				<span style="font-family:{FONT_MONO}; font-size:11px; color:{diffColor[scenario.difficulty]}; border:1px solid {diffBorder[scenario.difficulty]}; border-radius:4px; padding:2px 10px;">{scenario.difficulty.toUpperCase()}</span>
				<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};"><i class="{catIcons[scenario.category] ?? 'fas fa-terminal'}" style="margin-right:5px;"></i>{scenario.category}</span>
				{#if scenario.time_estimate_min}
					<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};"><i class="far fa-clock" style="margin-right:5px;"></i>~{scenario.time_estimate_min}min</span>
				{/if}
				{#if record}
					<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.accent}; border:1px solid {t.accentBorder}; border-radius:4px; padding:2px 10px;">
						<i class="fas fa-check" style="margin-right:5px;"></i>CLEARED{#if record.bestMs} · 最短 {fmtDuration(record.bestMs)}{/if}
					</span>
				{/if}
			</div>

			<!-- 手動で完了 / 取り消し -->
				<div style="margin-bottom:22px;">
					{#if record}
						<button class="manual-done" on:click={() => unmarkComplete(scenarioId)} style="border-color:{t.border}; color:{t.dim};">
							<i class="fas fa-rotate-left" style="margin-right:7px;"></i>完了を取り消す
						</button>
					{:else}
						<button class="manual-done" on:click={() => markComplete(scenarioId)} style="border-color:{t.accentBorder}; color:{t.accent};">
							<i class="fas fa-check" style="margin-right:7px;"></i>解決済み
						</button>
					{/if}
				</div>

				<!-- Situation -->
			<section class="card">
				<h2 class="label" style="color:{t.dim};">状況</h2>
				<p style="margin:0; font-size:14px; line-height:1.9; white-space:pre-line;">{scenario.description}</p>
			</section>

			<!-- Expected commands -->
			{#if cmds.length}
				<section class="card">
					<h2 class="label" style="color:{t.dim};">想定コマンド <span style="font-weight:400; letter-spacing:0; text-transform:none; font-size:11px;">— タップで解説へ (別タブ)</span></h2>
					<ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">
						{#each cmds as row}
							<li style="display:flex; gap:12px; align-items:baseline; font-size:13.5px; line-height:1.6;">
								<span style="display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap;">
									{#each row.cmds as [label, slug]}
										{#if slug}
											<a
												href="{base}/learn?cmd={encodeURIComponent(slug)}"
												target="_blank"
												rel="noopener"
												class="cmd-chip cmd-link"
												style="font-family:{FONT_MONO}; background:{t.track}; color:{t.accent};"
												title="{slug} の解説を別タブで開く"
											>{label}<i class="fas fa-arrow-up-right-from-square" style="font-size:8px; margin-left:5px; opacity:0.7;"></i></a>
										{:else}
											<code class="cmd-chip" style="font-family:{FONT_MONO}; background:{t.track}; color:{t.dim};">{label}</code>
										{/if}
									{/each}
								</span>
								<span style="color:{t.dim};">{row.desc}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!-- Tips -->
			<section class="card">
				<h2 class="label" style="color:{t.dim};">攻略のコツ</h2>
				<ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; font-size:13.5px; line-height:1.7;">
					<li style="display:flex; gap:10px;">
						<i class="fas fa-user-shield" style="color:{t.amber}; margin-top:3px; flex-shrink:0;"></i>
						<span>修復操作の多くは <strong>root 権限</strong> が必要。<code style="font-family:{FONT_MONO}; font-size:12px; background:{t.track}; color:{t.accent}; border-radius:4px; padding:1px 6px;">su root</code> (パスワード: <code style="font-family:{FONT_MONO}; font-size:12px; background:{t.track}; color:{t.accent}; border-radius:4px; padding:1px 6px;">password</code>) で root になれる。</span>
					</li>
					{#if firstHint}
						<li style="display:flex; gap:10px;">
							<i class="far fa-lightbulb" style="color:{t.amber}; margin-top:3px; flex-shrink:0;"></i>
							<span>{firstHint}</span>
						</li>
					{/if}
					<li style="display:flex; gap:10px;">
						<i class="fas fa-stairs" style="color:{t.amber}; margin-top:3px; flex-shrink:0;"></i>
						<span>行き詰まったら、挑戦画面で <strong>ヒント</strong> を1つずつ、最後は <strong>解答</strong> を開ける。</span>
					</li>
				</ul>
			</section>

			<!-- AI にヒントをもらう -->
				<div style="display:flex; justify-content:center; margin-bottom:18px;">
					<AskAI prompt={aiPrompt} label="AIにヒントをもらう" />
				</div>

				<!-- Related learn docs (取得できたときだけ出る) -->
			{#if relatedDocs.length}
				<RelatedLinks heading="関連する解説 — 仕組みから調べる" articles={relArticles} commands={relCommands} />
			{/if}

			<!-- Launch -->
			<a
				id="launch-btn"
				href="{base}/play?id={scenarioId}&start=1"
				data-sveltekit-reload
				class="launch"
				style="background:{t.accent}; color:{t.accentText};"
			>
				<i class="fas fa-play" style="margin-right:8px;"></i>マシンを起動して挑戦する
			</a>
			<p style="margin:12px 0 0 0; text-align:center; font-size:11.5px; color:{t.dim};">
				ブラウザの中で本物の Debian が起動します (初回は少し時間がかかります)。
			</p>
		{/if}
	</div>
</main>

<style>
	.detail-root {
		height: 100vh;
		overflow-y: auto;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		box-sizing: border-box;
	}
	.container {
		max-width: 720px;
		margin: 0 auto;
		padding: 40px 24px 80px 24px;
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
		color: var(--text) !important;
	}
	.detail-icon {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 18px 20px;
		margin-bottom: 16px;
	}
	.label {
		margin: 0 0 12px 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.launch {
		display: block;
		text-align: center;
		border-radius: 8px;
		padding: 14px 0;
		margin-top: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-decoration: none;
		transition: filter 0.15s ease;
	}
	.launch:hover {
		filter: brightness(1.1);
	}
	.manual-done {
		background: transparent;
		border: 1px solid;
		border-radius: 8px;
		padding: 8px 16px;
		font-family: var(--font-mono);
		font-size: 12.5px;
		cursor: pointer;
		transition: filter 0.15s ease;
	}
	.manual-done:hover {
		filter: brightness(1.12);
	}
	.cmd-chip {
		display: inline-flex;
		align-items: center;
		font-size: 12.5px;
		border-radius: 4px;
		padding: 2px 8px;
		white-space: nowrap;
		border: 1px solid transparent;
		text-decoration: none;
	}
	.cmd-link {
		transition: border-color 0.15s ease, filter 0.15s ease;
	}
	.cmd-link:hover {
		border-color: var(--accent);
		filter: brightness(1.08);
	}

	@media (max-width: 720px) {
		.container {
			padding: 28px 16px 64px 16px;
		}
	}
</style>
