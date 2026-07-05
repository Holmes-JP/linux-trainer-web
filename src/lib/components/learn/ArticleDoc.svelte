<script>
	// 仕組み解説記事の表示 (/learn?article=<slug>)。
	// 本文は Markdown → HTML (marked)。コンテンツは自リポジトリで執筆する信頼済みテキスト。
	import { base } from '$app/paths';
	import { t } from '$lib/design/theme';
	import { renderMarkdown } from '$lib/learn/markdown';
	import RelatedLinks from './RelatedLinks.svelte';

	/** Article (learn/types.ts) */
	export let article;
	/** ContentIndex — 関連シナリオのタイトル解決に使う */
	export let index = null;

	// 記事内画像は /article-images/... のようなルート絶対で書く。
	// GitHub Pages のサブパス配信 (base=/linux-trainer-web) でも壊れないよう base を前置する。
	$: bodyHtml = renderMarkdown(article.body).replaceAll('src="/', `src="${base}/`);

	$: relScenarios = [
		// 明示指定 + カテゴリ一致 (byScenario の逆を辿る) をシンプルに: byScenario を全走査
		...new Map(
			Object.entries(index?.byScenario ?? {})
				.filter(([, refs]) => refs.some((r) => r.type === 'article' && r.id === article.slug))
				.map(([id]) => [id, { id, title: index?.scenarioTitles?.[id] ?? id }])
		).values()
	];
</script>

<h1 style="margin:0 0 10px 0; font-size:26px; font-weight:700; line-height:1.4;">{article.title}</h1>
<p style="margin:0 0 28px 0; font-size:14px; line-height:1.8; color:{t.dim};">{article.summary}</p>

<div class="prose">
	{@html bodyHtml}
</div>

<div style="height:1px; background:{t.border}; margin:36px 0 24px 0;"></div>

<RelatedLinks
	heading="関連する解説と演習"
	commands={article.related_commands ?? []}
	articles={[]}
	scenarios={relScenarios}
/>

<style>
	.prose {
		font-size: 14.5px;
		line-height: 1.95;
	}
	.prose :global(h2) {
		font-size: 18px;
		font-weight: 700;
		margin: 34px 0 14px 0;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}
	.prose :global(h3) {
		font-size: 15px;
		font-weight: 700;
		margin: 26px 0 10px 0;
	}
	.prose :global(p) {
		margin: 0 0 16px 0;
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 16px 0;
		padding-left: 24px;
	}
	.prose :global(li) {
		margin-bottom: 6px;
	}
	.prose :global(code) {
		font-family: var(--font-mono);
		font-size: 12.5px;
		background: var(--track);
		color: var(--accent);
		border-radius: 4px;
		padding: 1px 6px;
	}
	.prose :global(pre) {
		background: var(--termBg);
		border: 1px solid var(--termBorder);
		border-radius: 8px;
		padding: 14px 16px;
		overflow-x: auto;
		margin: 0 0 16px 0;
	}
	.prose :global(pre code) {
		background: transparent;
		color: var(--termText);
		padding: 0;
		font-size: 12.5px;
		line-height: 1.7;
	}
	.prose :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0 0 16px 0;
		font-size: 13.5px;
		line-height: 1.7;
	}
	.prose :global(th),
	.prose :global(td) {
		border: 1px solid var(--border);
		padding: 8px 12px;
		text-align: left;
		vertical-align: top;
	}
	.prose :global(th) {
		background: var(--track);
		font-size: 12.5px;
	}
	.prose :global(blockquote) {
		margin: 0 0 16px 0;
		padding: 2px 0 2px 16px;
		border-left: 3px solid var(--accentBorder);
		color: var(--dim);
	}
	.prose :global(a) {
		color: var(--accent);
	}
	.prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 28px 0;
	}
	.prose :global(figure) {
		margin: 20px 0;
		text-align: center;
	}
	.prose :global(img) {
		max-width: min(100%, 420px);
		height: auto;
		border: 1px solid var(--border);
		border-radius: 10px;
		display: block;
		margin: 0 auto;
	}
	.prose :global(figcaption) {
		margin-top: 8px;
		font-size: 12px;
		color: var(--dim);
	}
	/* インライン SVG 図解 (CSS 変数でテーマ追従) */
	.prose :global(.diagram) {
		margin: 22px 0;
		text-align: center;
	}
	.prose :global(.diagram svg) {
		max-width: 100%;
		height: auto;
	}
	.prose :global(.diagram text) {
		font-family: var(--font-sans);
	}
	.prose :global(.diagram .mono) {
		font-family: var(--font-mono);
	}
</style>
