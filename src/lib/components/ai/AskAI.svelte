<script>
	// 「AIに聞く」ボタン。押すと選択モーダルを開く。
	//  - API 未設定: 4サービスを新しいタブで開く (自分のアカウント)
	//  - API 設定済: 「ここで聞く」でページ内チャット + 外部リンクも併記
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { aiSettings, isChatReady, PROVIDER_LABEL } from '$lib/ai/settings';
	import { HANDOFF_TARGETS } from '$lib/ai/handoff';
	import AiChat from './AiChat.svelte';
	import AiSettings from './AiSettings.svelte';

	/** AI に渡す完成済みプロンプト (文脈込み) */
	export let prompt = '';
	/** ボタン表示ラベル */
	export let label = 'AIに聞く';
	/** 'chip'(枠線ピル) | 'text'(控えめリンク) */
	export let variant = 'chip';

	let menuOpen = false;
	let chatOpen = false;
	let settingsOpen = false;

	$: chatReady = isChatReady($aiSettings);

	function openHere() {
		menuOpen = false;
		chatOpen = true;
	}
	function openSettings() {
		menuOpen = false;
		settingsOpen = true;
	}
	function handoff(target) {
		menuOpen = false;
		window.open(target.build(prompt), '_blank', 'noopener');
	}
	$: preview = prompt.length > 90 ? prompt.slice(0, 90) + '…' : prompt;
</script>

<button
	class="ask-btn {variant}"
	on:click={() => (menuOpen = true)}
	title="AI に質問する"
	style={variant === 'chip'
		? `color:${t.accent}; border-color:${t.accentBorder}; background:${t.accentDim};`
		: `color:${t.accent};`}
><i class="fas fa-robot" style="font-size:11px;"></i>{label}</button>

{#if menuOpen}
	<div class="ai-overlay" on:click|self={() => (menuOpen = false)} role="presentation">
		<div class="ai-card" style="background:{t.surface}; border-color:{t.border}; color:{t.text};">
			<div class="ai-head" style="border-color:{t.border};">
				<span style="font-weight:700; font-size:14px;"><i class="fas fa-robot" style="color:{t.accent}; margin-right:8px;"></i>AIに聞く</span>
				<button class="ai-x" on:click={() => (menuOpen = false)} style="color:{t.dim};" aria-label="閉じる"><i class="fas fa-xmark"></i></button>
			</div>
			<div class="ai-body scrollbar">
				<p class="ai-q" style="background:{t.track}; border-color:{t.border}; color:{t.dim};">{preview}</p>

				{#if chatReady}
					<button class="ai-here" on:click={openHere} style="background:{t.accent}; color:{t.accentText};">
						<i class="fas fa-comments" style="margin-right:8px;"></i>ここで聞く（{PROVIDER_LABEL[$aiSettings.provider]}）
					</button>
					<div class="ai-sep" style="color:{t.dim};"><span style="background:{t.surface};">または外部で開く</span></div>
				{:else}
					<p style="margin:0 0 10px 0; font-size:12px; color:{t.dim};">自分のアカウントで開きます（新しいタブ・キー不要）:</p>
				{/if}

				<div class="ai-targets">
					{#each HANDOFF_TARGETS as target}
						<button class="ai-target" on:click={() => handoff(target)} style="border-color:{t.border}; color:{t.text};">
							<i class={target.icon} style="color:{t.accent};"></i>{target.label}
							<i class="fas fa-arrow-up-right-from-square" style="font-size:9px; color:{t.dim}; margin-left:auto;"></i>
						</button>
					{/each}
				</div>

				{#if !chatReady}
					<button class="ai-cfg" on:click={openSettings} style="border-color:{t.border}; color:{t.dim};">
						<i class="fas fa-gear" style="margin-right:7px;"></i>API を設定してこのページ内で聞く
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if chatOpen}
	<AiChat initialPrompt={prompt} on:close={() => (chatOpen = false)} />
{/if}
{#if settingsOpen}
	<AiSettings on:close={() => (settingsOpen = false)} />
{/if}

<style>
	.ask-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		text-decoration: none;
		font-family: var(--font-sans);
	}
	.ask-btn.chip {
		font-size: 12.5px;
		font-weight: 600;
		border: 1px solid;
		border-radius: 999px;
		padding: 6px 14px;
		transition: filter 0.15s ease, border-color 0.15s ease;
	}
	.ask-btn.chip:hover {
		filter: brightness(1.12);
		border-color: var(--accent) !important;
	}
	.ask-btn.text {
		background: transparent;
		border: none;
		font-size: 12.5px;
		padding: 0;
	}
	.ask-btn.text:hover {
		text-decoration: underline;
	}
	.ai-overlay {
		position: fixed;
		inset: 0;
		z-index: 2000;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.ai-card {
		width: 100%;
		max-width: 400px;
		max-height: 86vh;
		border: 1px solid;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: var(--font-sans);
	}
	.ai-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 16px;
		border-bottom: 1px solid;
		flex-shrink: 0;
	}
	.ai-x {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 16px;
	}
	.ai-body {
		padding: 15px 16px;
		overflow-y: auto;
	}
	.ai-q {
		margin: 0 0 14px 0;
		border: 1px solid;
		border-radius: 8px;
		padding: 9px 12px;
		font-size: 12px;
		line-height: 1.6;
	}
	.ai-here {
		width: 100%;
		border: none;
		border-radius: 8px;
		padding: 11px 0;
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		margin-bottom: 6px;
	}
	.ai-here:hover {
		filter: brightness(1.1);
	}
	.ai-sep {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		margin: 10px 0;
		position: relative;
	}
	.ai-sep::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: var(--border);
	}
	.ai-sep span {
		position: relative;
		padding: 0 10px;
	}
	.ai-targets {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ai-target {
		display: flex;
		align-items: center;
		gap: 10px;
		border: 1px solid;
		border-radius: 8px;
		padding: 10px 13px;
		font-size: 13px;
		cursor: pointer;
		background: transparent;
		font-family: inherit;
		transition: border-color 0.15s ease;
	}
	.ai-target:hover {
		border-color: var(--accent);
	}
	.ai-cfg {
		width: 100%;
		margin-top: 12px;
		border: 1px dashed;
		border-radius: 8px;
		padding: 9px 0;
		font-size: 12.5px;
		cursor: pointer;
		background: transparent;
		font-family: inherit;
	}
</style>
