<script>
	// コマンドリファレンスの詳細 (/learn?cmd=<name>)。
	import { t, FONT_MONO } from '$lib/design/theme';
	import RelatedLinks from './RelatedLinks.svelte';
	import { GROUP_LABELS } from './groups';
	import AskAI from '$lib/components/ai/AskAI.svelte';

	/** CommandDoc (learn/types.ts) */
	export let doc;
	/** ContentIndex — 関連リンクのタイトル解決に使う */
	export let index = null;

	$: aiPrompt = `Linux の \`${doc.name}\` コマンドについて、初心者にもわかるように説明してください。代表的なオプションと、実用的な使用例をいくつか、コマンド例つきで教えてください。`;
	$: explainUrl = `https://explainshell.com/explain?cmd=${encodeURIComponent(doc.name)}`;
	$: manUrl = `https://manpages.debian.org/${encodeURIComponent(doc.name)}`;

	$: articleTitle = (slug) =>
		index?.docs.find((d) => d.type === 'article' && d.id === slug)?.title ?? slug;
	$: relArticles = (doc.related_articles ?? []).map((slug) => ({ id: slug, title: articleTitle(slug) }));
	$: relScenarios = (doc.related_scenarios ?? []).map((id) => ({
		id,
		title: index?.scenarioTitles?.[id] ?? id
	}));
</script>

<!-- Heading -->
<div style="display:flex; align-items:center; gap:14px; margin-bottom:8px; flex-wrap:wrap;">
	<h1 style="margin:0; font-family:{FONT_MONO}; font-size:26px; font-weight:700; color:{t.accent};">{doc.name}</h1>
	<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim}; border:1px solid {t.border}; border-radius:4px; padding:2px 10px;">{GROUP_LABELS[doc.group] ?? doc.group}</span>
</div>
<p style="margin:0 0 14px 0; font-size:14.5px; line-height:1.8;">{doc.summary}</p>

<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;">
	<AskAI prompt={aiPrompt} label="このコマンドをAIに聞く" />
</div>

<!-- Synopsis -->
<section class="card" style="background:{t.surface}; border-color:{t.border};">
	<h2 class="label" style="color:{t.dim};">書式</h2>
	<code class="synopsis" style="background:{t.termBg}; border-color:{t.termBorder}; color:{t.termText}; font-family:{FONT_MONO};">{doc.synopsis}</code>
</section>

<!-- Options -->
{#if doc.options?.length}
	<section class="card" style="background:{t.surface}; border-color:{t.border};">
		<h2 class="label" style="color:{t.dim};">主要オプション</h2>
		<ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">
			{#each doc.options as op}
				<li style="display:flex; gap:12px; align-items:baseline; font-size:13.5px; line-height:1.6;">
					<code style="font-family:{FONT_MONO}; font-size:12.5px; background:{t.track}; color:{t.accent}; border-radius:4px; padding:2px 8px; white-space:nowrap; flex-shrink:0;">{op.flag}</code>
					<span style="color:{t.dim};">{op.desc}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- Examples -->
{#if doc.examples?.length}
	<section class="card" style="background:{t.surface}; border-color:{t.border};">
		<h2 class="label" style="color:{t.dim};">使用例</h2>
		<div style="display:flex; flex-direction:column; gap:14px;">
			{#each doc.examples as ex}
				<div>
					<code class="example" style="background:{t.termBg}; border-color:{t.termBorder}; color:{t.termText}; font-family:{FONT_MONO};"><span style="color:{t.termDim}; user-select:none;">$ </span>{ex.cmd}</code>
					<p style="margin:6px 0 0 2px; font-size:13px; line-height:1.6; color:{t.dim};">{ex.desc}</p>
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- Note -->
{#if doc.note}
	<section class="card note" style="border-color:rgba(217,180,74,0.4);">
		<p style="margin:0; font-size:13.5px; line-height:1.8; display:flex; gap:10px;">
			<i class="fas fa-triangle-exclamation" style="color:{t.amber}; margin-top:4px; flex-shrink:0;"></i>
			<span>{doc.note}</span>
		</p>
	</section>
{/if}

<!-- 外部の詳しい資料 -->
<section class="card" style="background:{t.surface}; border-color:{t.border};">
	<h2 class="label" style="color:{t.dim};">もっと詳しく（外部サイト）</h2>
	<div style="display:flex; flex-wrap:wrap; gap:8px;">
		<a href={explainUrl} target="_blank" rel="noopener" class="ext" style="border-color:{t.border}; color:{t.text};">
			<i class="fas fa-wand-magic-sparkles" style="color:{t.accent}; font-size:11px;"></i>explainshell<span style="color:{t.dim};">（コマンドを注釈表示）</span><i class="fas fa-arrow-up-right-from-square" style="font-size:9px; color:{t.dim};"></i>
		</a>
		<a href={manUrl} target="_blank" rel="noopener" class="ext" style="border-color:{t.border}; color:{t.text};">
			<i class="fas fa-book" style="color:{t.accent}; font-size:11px;"></i>Debian man ページ<i class="fas fa-arrow-up-right-from-square" style="font-size:9px; color:{t.dim};"></i>
		</a>
	</div>
</section>

<RelatedLinks
	commands={doc.related_commands ?? []}
	articles={relArticles}
	scenarios={relScenarios}
/>

<style>
	.card {
		border: 1px solid;
		border-radius: 10px;
		padding: 18px 20px;
		margin-bottom: 16px;
	}
	.card.note {
		background: rgba(217, 180, 74, 0.06);
	}
	.label {
		margin: 0 0 12px 0;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.ext {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: 1px solid;
		border-radius: 999px;
		padding: 6px 14px;
		font-size: 12.5px;
		text-decoration: none;
		transition: border-color 0.15s ease;
	}
	.ext:hover {
		border-color: var(--accent);
	}
	code.synopsis,
	code.example {
		display: block;
		border: 1px solid;
		border-radius: 8px;
		padding: 12px 14px;
		font-size: 13px;
		line-height: 1.6;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>
