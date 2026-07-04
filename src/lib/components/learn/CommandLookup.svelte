<script>
	// 挑戦中に使うコマンド辞典の検索。VM を止めないよう結果は別タブ (/learn?cmd=) で開く。
	// search-index.json から command doc だけを対象に部分一致検索する。
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { loadSearchIndex } from '$lib/learn/loader';
	import { searchDocs } from '$lib/learn/search';

	let commands = [];
	let ready = false;
	let failed = false;
	let query = '';

	onMount(async () => {
		try {
			const index = await loadSearchIndex();
			commands = index.docs.filter((d) => d.type === 'command');
			ready = true;
		} catch {
			failed = true;
		}
	});

	// クエリ空なら人気どころを数件だけ提示。入力中は部分一致で最大 8 件。
	const SUGGESTED = ['chmod', 'grep', 'ps', 'find', 'systemctl', 'tar'];
	$: hits = query.trim()
		? searchDocs(commands, query, 8).map((h) => h.doc)
		: commands.filter((c) => SUGGESTED.includes(c.id)).sort((a, b) => SUGGESTED.indexOf(a.id) - SUGGESTED.indexOf(b.id));

	function cmdHref(id) {
		return `${base}/learn?cmd=${encodeURIComponent(id)}`;
	}
</script>

<section class="lookup" style="border-bottom:1px solid {t.border};">
	<div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px;">
		<h2 class="label" style="color:{t.dim}; margin:0;">コマンド辞典</h2>
		<a
			href="{base}/learn"
			target="_blank"
			rel="noopener"
			class="all-link"
			style="color:{t.dim};"
		>すべて見る <i class="fas fa-arrow-up-right-from-square" style="font-size:9px;"></i></a>
	</div>

	{#if failed}
		<p style="margin:0; font-size:12px; color:{t.dim};">
			辞典を読み込めませんでした。<a href="{base}/learn" target="_blank" rel="noopener" style="color:{t.accent};">解説ページ</a> を開いてください。
		</p>
	{:else}
		<div style="position:relative;">
			<i class="fas fa-magnifying-glass" style="position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:11px; color:{t.dim};"></i>
			<input
				class="lookup-search"
				type="text"
				placeholder="コマンド名で調べる (例: chmod)"
				bind:value={query}
				disabled={!ready}
				style="background:{t.track}; border-color:{t.border}; color:{t.text};"
			/>
		</div>

		{#if !query.trim()}
			<p style="margin:8px 0 6px 0; font-size:11px; color:{t.dim};">よく使うコマンド:</p>
		{/if}

		<div class="results">
			{#each hits as c}
				<a
					href={cmdHref(c.id)}
					target="_blank"
					rel="noopener"
					class="result"
					style="border-color:{t.border};"
					title={c.summary}
				>
					<code style="font-family:{FONT_MONO}; color:{t.accent};">{c.id}</code>
					<span class="result-sum" style="color:{t.dim};">{c.summary}</span>
					<i class="fas fa-arrow-up-right-from-square" style="font-size:9px; color:{t.dim}; flex-shrink:0;"></i>
				</a>
			{/each}
			{#if query.trim() && hits.length === 0}
				<p style="margin:4px 0 0 0; font-size:12px; color:{t.dim};">一致するコマンドがありません。</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.lookup {
		padding: 16px 20px;
	}
	.label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
	}
	.all-link {
		font-size: 11px;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition: color 0.15s ease;
	}
	.all-link:hover {
		color: var(--accent) !important;
	}
	.lookup-search {
		width: 100%;
		box-sizing: border-box;
		font-family: var(--font-sans);
		font-size: 12.5px;
		padding: 8px 10px 8px 30px;
		border-radius: 6px;
		border: 1px solid;
		outline: none;
	}
	.lookup-search:focus {
		border-color: var(--accent);
	}
	.lookup-search:disabled {
		opacity: 0.6;
	}
	.results {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 220px;
		overflow-y: auto;
	}
	.result {
		display: flex;
		align-items: center;
		gap: 9px;
		border: 1px solid;
		border-radius: 6px;
		padding: 7px 11px;
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.result:hover {
		border-color: var(--accent);
		background: var(--surfaceHover);
	}
	.result code {
		font-size: 12.5px;
		font-weight: 700;
		flex-shrink: 0;
	}
	.result-sum {
		flex: 1;
		min-width: 0;
		font-size: 11.5px;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
