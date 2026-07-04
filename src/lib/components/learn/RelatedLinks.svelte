<script>
	// 関連コンテンツ (記事 / コマンド / シナリオ) へのチップリンク。
	// CommandDoc / ArticleDoc / GlossarySection から共通で使う。
	import { base } from '$app/paths';
	import { t, FONT_MONO } from '$lib/design/theme';

	export let heading = '関連';
	/** string[] — コマンド名 */
	export let commands = [];
	/** {id, title}[] — 記事 */
	export let articles = [];
	/** {id, title}[] — シナリオ (演習) */
	export let scenarios = [];

	$: chips = [
		...articles.map((a) => ({
			icon: 'fas fa-book-open',
			label: a.title,
			href: `${base}/learn?article=${encodeURIComponent(a.id)}`,
			mono: false
		})),
		...commands.map((c) => ({
			icon: 'fas fa-terminal',
			label: c,
			href: `${base}/learn?cmd=${encodeURIComponent(c)}`,
			mono: true
		})),
		...scenarios.map((s) => ({
			icon: 'fas fa-screwdriver-wrench',
			label: s.title,
			href: `${base}/play?id=${encodeURIComponent(s.id)}`,
			mono: false
		}))
	];
</script>

{#if chips.length}
	<section class="card" style="background:{t.surface}; border-color:{t.border};">
		<h2 class="label" style="color:{t.dim};">{heading}</h2>
		<div style="display:flex; flex-wrap:wrap; gap:8px;">
			{#each chips as chip}
				<a
					href={chip.href}
					data-sveltekit-reload
					class="chip"
					style="border-color:{t.border}; color:{t.text}; {chip.mono ? `font-family:${FONT_MONO};` : ''}"
				>
					<i class={chip.icon} style="font-size:10px; color:{t.accent};"></i>{chip.label}
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.card {
		border: 1px solid;
		border-radius: 10px;
		padding: 18px 20px;
		margin-bottom: 16px;
	}
	.label {
		margin: 0 0 12px 0;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: 1px solid;
		border-radius: 999px;
		padding: 5px 13px;
		font-size: 12.5px;
		text-decoration: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.chip:hover {
		border-color: var(--accent);
		background: var(--surfaceHover);
	}
</style>
