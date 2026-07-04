<script>
	// 解説トップ (/learn)。全文検索 + タブ (コマンド / 解説記事 / 用語集)。
	// 検索は search-index.json 全体を対象にし、入力中はタブの代わりに結果を表示する。
	import { base } from '$app/paths';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { searchDocs } from '$lib/learn/search';
	import { GROUP_LABELS, GROUP_ORDER } from './groups';
	import GlossarySection from './GlossarySection.svelte';

	/** ContentIndex (search-index.json) */
	export let index;
	/** 初期タブ (?tab=) */
	export let initialTab = 'commands';
	/** 用語集で強調する用語 (?term=) */
	export let highlightTerm = null;

	const TABS = [
		{ key: 'commands', label: 'コマンド', icon: 'fas fa-terminal' },
		{ key: 'articles', label: '仕組み解説', icon: 'fas fa-book-open' },
		{ key: 'glossary', label: '用語集', icon: 'fas fa-spell-check' }
	];
	let tab = TABS.some((x) => x.key === initialTab) ? initialTab : 'commands';
	let query = '';

	const typeLabel = { command: 'コマンド', article: '解説', term: '用語' };
	const typeIcon = { command: 'fas fa-terminal', article: 'fas fa-book-open', term: 'fas fa-spell-check' };

	function hitHref(doc) {
		if (doc.type === 'command') return `${base}/learn?cmd=${encodeURIComponent(doc.id)}`;
		if (doc.type === 'article') return `${base}/learn?article=${encodeURIComponent(doc.id)}`;
		return `${base}/learn?tab=glossary&term=${encodeURIComponent(doc.id)}`;
	}

	$: hits = query.trim() ? searchDocs(index.docs, query) : [];

	// コマンドタブ: group ごとにまとめる
	$: commandGroups = GROUP_ORDER.map((g) => ({
		key: g,
		label: GROUP_LABELS[g],
		items: index.docs.filter((d) => d.type === 'command' && d.group === g)
	})).filter((g) => g.items.length > 0);

	$: articleList = index.docs
		.filter((d) => d.type === 'article')
		.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

	$: counts = {
		commands: index.docs.filter((d) => d.type === 'command').length,
		articles: articleList.length,
		glossary: index.docs.filter((d) => d.type === 'term').length
	};

	function chipStyle(active) {
		return active
			? `background:${t.accent}; color:${t.bg}; border-color:${t.accent};`
			: `background:transparent; color:${t.dim}; border-color:${t.border};`;
	}
</script>

<!-- Hero + search -->
<section style="margin-bottom:28px;">
	<h1 style="margin:0 0 8px 0; font-size:26px; line-height:1.3; font-weight:700;">仕組みがわかれば、直せる。</h1>
	<p style="margin:0 0 18px 0; font-size:14px; line-height:1.7; color:{t.dim};">
		Linux の仕組みの解説と、コマンドリファレンス、用語集。演習で詰まったらここで調べよう。
	</p>
	<div style="position:relative; max-width:520px;">
		<i class="fas fa-magnifying-glass" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:13px; color:{t.dim};"></i>
		<!-- svelte-ignore a11y-autofocus -->
		<input
			class="big-search"
			type="text"
			placeholder="全文検索 (コマンド / 解説 / 用語)"
			bind:value={query}
			autofocus
			style="background:{t.track}; border-color:{t.border}; color:{t.text};"
		/>
	</div>
</section>

{#if query.trim()}
	<!-- 検索結果 -->
	<p style="font-family:{FONT_MONO}; font-size:12px; color:{t.dim}; margin:0 0 14px 0;">
		{hits.length} 件ヒット
	</p>
	<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:36px;">
		{#each hits as hit}
			<a href={hitHref(hit.doc)} data-sveltekit-reload class="hit-card" style="background:{t.surface}; border-color:{t.border};">
				<span class="hit-type" style="color:{t.accent}; border-color:{t.accentBorder};"><i class={typeIcon[hit.doc.type]} style="font-size:9px;"></i>{typeLabel[hit.doc.type]}</span>
				<span style="flex:1; min-width:0;">
					<span style="display:block; font-size:14px; font-weight:600; line-height:1.5; {hit.doc.type === 'command' ? `font-family:${FONT_MONO};` : ''}">{hit.doc.title}</span>
					<span style="display:block; margin-top:2px; font-size:12.5px; line-height:1.6; color:{t.dim};">{hit.doc.summary}</span>
					{#if hit.snippet}
						<span style="display:block; margin-top:4px; font-size:12px; line-height:1.6; color:{t.dim}; opacity:0.8;"><i class="fas fa-quote-left" style="font-size:8px; margin-right:5px;"></i>{hit.snippet}</span>
					{/if}
				</span>
			</a>
		{/each}
		{#if hits.length === 0}
			<p style="color:{t.dim}; font-size:13px; margin:0;">一致するものがありません。キーワードを短くするか、空白で区切って減らしてみてください。</p>
		{/if}
	</div>
{:else}
	<!-- タブ -->
	<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:24px;">
		{#each TABS as tb}
			<button class="chip" style={chipStyle(tab === tb.key)} on:click={() => (tab = tb.key)}>
				<i class={tb.icon} style="font-size:10px; margin-right:6px;"></i>{tb.label}
				<span style="opacity:0.7; margin-left:5px;">{counts[tb.key]}</span>
			</button>
		{/each}
	</div>

	{#if tab === 'commands'}
		{#each commandGroups as group}
			<section style="margin-bottom:30px;">
				<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
					<span style="font-family:{FONT_MONO}; font-size:12px; letter-spacing:0.12em; color:{t.accent};">{group.label}</span>
					<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};">{group.items.length}</span>
					<div style="flex:1; height:1px; background:{t.border};"></div>
				</div>
				<div class="cmd-grid">
					{#each group.items as cmd}
						<a href="{base}/learn?cmd={encodeURIComponent(cmd.id)}" data-sveltekit-reload class="cmd-card" style="background:{t.surface}; border-color:{t.border};">
							<code style="font-family:{FONT_MONO}; font-size:13.5px; font-weight:700; color:{t.accent};">{cmd.title}</code>
							<span style="display:block; margin-top:4px; font-size:12px; line-height:1.6; color:{t.dim};">{cmd.summary}</span>
						</a>
					{/each}
				</div>
			</section>
		{/each}
	{:else if tab === 'articles'}
		<div style="display:flex; flex-direction:column; gap:10px;">
			{#each articleList as article, i}
				<a href="{base}/learn?article={encodeURIComponent(article.id)}" data-sveltekit-reload class="article-card" style="background:{t.surface}; border-color:{t.border};">
					<span style="font-family:{FONT_MONO}; font-size:13px; color:{t.dim}; width:24px; flex-shrink:0;">{String(i + 1).padStart(2, '0')}</span>
					<span style="flex:1; min-width:0;">
						<span style="display:block; font-size:14.5px; font-weight:600; line-height:1.5;">{article.title}</span>
						<span style="display:block; margin-top:3px; font-size:12.5px; line-height:1.6; color:{t.dim};">{article.summary}</span>
					</span>
					<i class="fas fa-chevron-right" style="font-size:11px; color:{t.dim}; flex-shrink:0;"></i>
				</a>
			{/each}
		</div>
	{:else}
		<GlossarySection {highlightTerm} {index} />
	{/if}
{/if}

<style>
	.big-search {
		width: 100%;
		box-sizing: border-box;
		font-family: var(--font-sans);
		font-size: 14px;
		padding: 11px 14px 11px 38px;
		border-radius: 8px;
		border: 1px solid;
		outline: none;
	}
	.big-search:focus {
		border-color: var(--accent);
	}
	.chip {
		font-family: var(--font-mono);
		font-size: 12.5px;
		padding: 7px 15px;
		border-radius: 999px;
		cursor: pointer;
		border: 1px solid;
	}
	.hit-card {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		border: 1px solid;
		border-radius: 8px;
		padding: 13px 16px;
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.hit-card:hover {
		border-color: var(--accent);
		background: var(--surfaceHover);
	}
	.hit-type {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 10px;
		border: 1px solid;
		border-radius: 4px;
		padding: 2px 7px;
		flex-shrink: 0;
		margin-top: 2px;
		white-space: nowrap;
	}
	.cmd-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 10px;
	}
	.cmd-card {
		display: block;
		border: 1px solid;
		border-radius: 8px;
		padding: 12px 15px;
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.cmd-card:hover {
		border-color: var(--accent);
		background: var(--surfaceHover);
	}
	.article-card {
		display: flex;
		align-items: center;
		gap: 14px;
		border: 1px solid;
		border-radius: 8px;
		padding: 15px 18px;
		text-decoration: none;
		color: var(--text);
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.article-card:hover {
		border-color: var(--accent);
		background: var(--surfaceHover);
	}

	@media (max-width: 720px) {
		.cmd-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
