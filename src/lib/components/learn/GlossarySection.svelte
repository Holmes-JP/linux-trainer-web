<script>
	// 用語集タブ。glossary.yaml を読み、定義カードを並べる。
	// ?term=<用語> 付きで来たときはその項目を強調してスクロールする (検索結果からの遷移)。
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { loadGlossary } from '$lib/learn/loader';

	/** 強調表示する用語 (URL の ?term=) */
	export let highlightTerm = null;
	/** ContentIndex — 関連記事タイトルの解決用 */
	export let index = null;

	let terms = [];
	let errorMsg = '';

	$: articleTitle = (slug) =>
		index?.docs.find((d) => d.type === 'article' && d.id === slug)?.title ?? slug;

	onMount(async () => {
		try {
			terms = await loadGlossary();
			if (highlightTerm) {
				await tick();
				document.getElementById(anchorId(highlightTerm))?.scrollIntoView({ block: 'center' });
			}
		} catch (e) {
			errorMsg = e.toString();
		}
	});

	function anchorId(term) {
		return `term-${encodeURIComponent(term)}`;
	}
</script>

{#if errorMsg}
	<p style="color:{t.red}; font-size:13px;">{errorMsg}</p>
{:else if terms.length === 0}
	<p style="color:{t.dim}; font-size:13px;">読み込み中…</p>
{:else}
	<div style="display:flex; flex-direction:column; gap:10px;">
		{#each terms as term}
			<div
				id={anchorId(term.term)}
				class="term-card"
				style="background:{t.surface}; border-color:{term.term === highlightTerm ? t.accentBorder : t.border};"
			>
				<div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
					<span style="font-size:15px; font-weight:700;">{term.term}</span>
					{#if term.reading}
						<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};">{term.reading}</span>
					{/if}
				</div>
				<p style="margin:0; font-size:13.5px; line-height:1.8; color:{t.dim};">{term.def}</p>
				{#if term.related_commands?.length || term.related_articles?.length}
					<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
						{#each term.related_articles ?? [] as slug}
							<a href="{base}/learn?article={encodeURIComponent(slug)}" data-sveltekit-reload class="mini-link" style="color:{t.accent};"><i class="fas fa-book-open" style="font-size:9px;"></i>{articleTitle(slug)}</a>
						{/each}
						{#each term.related_commands ?? [] as cmd}
							<a href="{base}/learn?cmd={encodeURIComponent(cmd)}" data-sveltekit-reload class="mini-link" style="color:{t.accent}; font-family:{FONT_MONO};"><i class="fas fa-terminal" style="font-size:9px;"></i>{cmd}</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.term-card {
		border: 1px solid;
		border-radius: 10px;
		padding: 16px 20px;
	}
	.mini-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11.5px;
		text-decoration: none;
	}
	.mini-link:hover {
		text-decoration: underline;
	}
</style>
