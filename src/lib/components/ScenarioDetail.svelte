<script>
	// シナリオ詳細ページ (一覧 → 詳細 → 挑戦 の中間)。
	// 課題内容 / 想定コマンド / 攻略のコツ を表示し、そこからマシンを起動する。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { t, FONT_SANS, FONT_MONO } from '$lib/design/theme';
	import { progress } from '$lib/stores/progress';
	import { fmtDuration } from '$lib/util/format';

	export let scenario = null;
	export let scenarioId = '';
	export let errorMsg = '';

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

	// カテゴリごとの「よく使うコマンド」リファレンス (解答ではなく道具の紹介)
	const commandsByCategory = {
		permissions: [
			['ls -l', 'ファイルの所有者と権限 (rwx) を確認する'],
			['chmod', '権限を変更する (例: chmod 644 file)'],
			['chown', '所有者を変更する (例: chown user:user file)'],
			['id', '自分のユーザー / グループを確認する']
		],
		filesystem: [
			['ls -la', '隠しファイルも含めて一覧する'],
			['find', 'ファイルを名前・条件で探す (find /etc -name ...)'],
			['cat / less', 'ファイルの中身を見る'],
			['cp / mv', 'バックアップから復元・移動する'],
			['ln -sfn', 'シンボリックリンクを張り直す']
		],
		processes: [
			['ps aux', '動いているプロセスを一覧する'],
			['pgrep -a', '名前でプロセスを探す (PID を確認)'],
			['kill / pkill', 'プロセスを停止する'],
			['top', 'CPU 負荷の高いプロセスを見る']
		],
		disk: [
			['du -sb', '実サイズ (バイト) で使用量を集計する'],
			['ls -lS', 'ファイルをサイズの大きい順に並べる'],
			['find -size +1M', '大きいファイルを階層を跨いで探す'],
			['rm / : > file', '不要ファイルを削除・空に切り詰める']
		],
		services: [
			['service X status/start', 'init.d サービスの状態確認・起動'],
			['/etc/init.d/X', 'init スクリプトを直接実行する'],
			['pgrep -x', 'デーモンが常駐しているか確認する'],
			['cat', 'ログや設定ファイルを読んで原因を探す']
		],
		logs: [
			['cat / less', 'ログの中身を見る'],
			['grep / grep -c', 'キーワードを検索・件数を数える'],
			['awk', '列 (フィールド) を取り出す ($1, $(NF-1) など)'],
			['sort / uniq -c', 'IP や値ごとに集計する']
		]
	};

	$: cmds = scenario ? commandsByCategory[scenario.category] ?? [] : [];
	$: firstHint = scenario?.hints?.[0] ?? null;
</script>

<main
	class="detail-root scrollbar"
	style="--bg:{t.bg}; --text:{t.text}; --font-sans:{FONT_SANS};"
>
	<!-- Top bar -->
	<header style="display:flex; align-items:center; gap:20px; height:52px; flex-shrink:0; padding:0 20px; border-bottom:1px solid {t.border}; background:{t.surface};">
		<a href="/play" id="back-to-list" data-sveltekit-reload class="backlink" style="color:{t.dim};"><i class="fas fa-arrow-left" style="font-size:12px;"></i>一覧</a>
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

			<!-- Situation -->
			<section class="card">
				<h2 class="label" style="color:{t.dim};">状況</h2>
				<p style="margin:0; font-size:14px; line-height:1.9; white-space:pre-line;">{scenario.description}</p>
			</section>

			<!-- Expected commands -->
			{#if cmds.length}
				<section class="card">
					<h2 class="label" style="color:{t.dim};">想定コマンド <span style="font-weight:400; letter-spacing:0; text-transform:none; font-size:11px;">— このカテゴリでよく使う道具</span></h2>
					<ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">
						{#each cmds as [cmd, desc]}
							<li style="display:flex; gap:12px; align-items:baseline; font-size:13.5px; line-height:1.6;">
								<code style="font-family:{FONT_MONO}; font-size:12.5px; background:{t.track}; color:{t.accent}; border-radius:4px; padding:2px 8px; white-space:nowrap; flex-shrink:0;">{cmd}</code>
								<span style="color:{t.dim};">{desc}</span>
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

			<!-- Launch -->
			<a
				id="launch-btn"
				href="/play?id={scenarioId}&start=1"
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
		color: #e4ede7 !important;
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
		background: #121816;
		border: 1px solid #232e28;
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
</style>
