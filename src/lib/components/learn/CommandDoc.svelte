<script>
	// コマンドリファレンスの詳細 (/learn?cmd=<name>)。
	import { t, FONT_MONO } from '$lib/design/theme';
	import RelatedLinks from './RelatedLinks.svelte';
	import { GROUP_LABELS } from './groups';

	/** CommandDoc (learn/types.ts) */
	export let doc;
	/** ContentIndex — 関連リンクのタイトル解決に使う */
	export let index = null;

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
<p style="margin:0 0 24px 0; font-size:14.5px; line-height:1.8;">{doc.summary}</p>

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
