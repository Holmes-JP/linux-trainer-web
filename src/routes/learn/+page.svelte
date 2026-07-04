<script>
	// 解説セクション (/play と同じクエリパラメータ単一ページ方式)。
	//   /learn                → ハブ (タブ + 全文検索)
	//   /learn?cmd=<name>     → コマンドリファレンス詳細
	//   /learn?article=<slug> → 仕組み解説記事
	//   /learn?tab=glossary&term=<用語> → 用語集 (該当語を強調)
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { t, FONT_MONO, themeMode, toggleTheme } from '$lib/design/theme';
	import '$lib/design/theme.css';
	import LearnHub from '$lib/components/learn/LearnHub.svelte';
	import CommandDoc from '$lib/components/learn/CommandDoc.svelte';
	import ArticleDoc from '$lib/components/learn/ArticleDoc.svelte';
	import { loadCommandDoc, loadArticle, loadSearchIndex } from '$lib/learn/loader';

	let mode = null; // 'hub' | 'command' | 'article' (onMount で確定)
	let index = null;
	let doc = null;
	let article = null;
	let tab = 'commands';
	let highlightTerm = null;
	let errorMsg = '';

	onMount(async () => {
		const params = new URLSearchParams(location.search);
		const cmd = params.get('cmd');
		const slug = params.get('article');
		tab = params.get('tab') ?? 'commands';
		highlightTerm = params.get('term');
		try {
			// ハブの一覧・検索も、詳細ページの関連リンク解決も search-index.json を使う
			index = await loadSearchIndex();
			if (cmd) {
				doc = await loadCommandDoc(cmd);
				mode = 'command';
			} else if (slug) {
				article = await loadArticle(slug);
				mode = 'article';
			} else {
				mode = 'hub';
			}
		} catch (e) {
			errorMsg = e.toString();
			mode = 'error';
		}
	});
</script>

<svelte:head>
	<title>解説 — Linux トラブルシューティング演習</title>
</svelte:head>

<main class="learn-root scrollbar">
	<!-- Top bar (ScenarioDetail と同じパターン) -->
	<header style="display:flex; align-items:center; gap:20px; height:52px; flex-shrink:0; padding:0 20px; border-bottom:1px solid {t.border}; background:{t.surface};">
		{#if mode === 'command' || mode === 'article'}
			<a href="{base}/learn" data-sveltekit-reload class="backlink" style="color:{t.dim};"><i class="fas fa-arrow-left" style="font-size:12px;"></i>解説トップ</a>
		{:else}
			<a href="{base}/play" data-sveltekit-reload class="backlink" style="color:{t.dim};"><i class="fas fa-arrow-left" style="font-size:12px;"></i>演習一覧</a>
		{/if}
		<div style="width:1px; height:20px; background:{t.border};"></div>
		<span style="font-family:{FONT_MONO}; font-size:12px; color:{t.dim};">LEARN — 仕組みとコマンドの解説</span>
		<div style="margin-left:auto; display:flex; align-items:center; gap:12px;">
			{#if mode === 'command' || mode === 'article'}
				<a href="{base}/play" data-sveltekit-reload class="backlink hide-mobile" style="color:{t.dim};"><i class="fas fa-screwdriver-wrench" style="font-size:12px;"></i>演習一覧</a>
			{/if}
			<button
				class="theme-toggle"
				title="テーマ切り替え (ライト/ダーク)"
				aria-label="テーマ切り替え"
				on:click={toggleTheme}
				style="color:{t.dim};"
			><i class="fas {$themeMode === 'dark' ? 'fa-sun' : 'fa-moon'}"></i></button>
		</div>
	</header>

	<div class="container" class:narrow={mode === 'command' || mode === 'article'}>
		{#if mode === null}
			<p style="color:{t.dim};">読み込み中…</p>
		{:else if mode === 'error'}
			<p style="color:{t.red};">{errorMsg}</p>
			<p style="font-size:13px;"><a href="{base}/learn" data-sveltekit-reload style="color:{t.accent};">解説トップに戻る</a></p>
		{:else if mode === 'command'}
			<CommandDoc {doc} {index} />
		{:else if mode === 'article'}
			<ArticleDoc {article} {index} />
		{:else}
			<LearnHub {index} initialTab={tab} {highlightTerm} />
		{/if}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
	}
	.learn-root {
		/* global.css が body { overflow:hidden } を掛けるため、ページ自身をスクロールコンテナにする */
		height: 100vh;
		overflow-y: auto;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		box-sizing: border-box;
	}
	.container {
		max-width: 880px;
		margin: 0 auto;
		padding: 36px 32px 96px 32px;
	}
	.container.narrow {
		max-width: 760px;
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

	@media (max-width: 720px) {
		.container {
			padding: 24px 16px 64px 16px;
		}
		.hide-mobile {
			display: none !important;
		}
	}
</style>
