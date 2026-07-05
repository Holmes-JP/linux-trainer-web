<script>
	// ページ内 AI チャット (BYOK)。初期プロンプトを送り、追い質問もできる。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { onMount, createEventDispatcher, tick } from 'svelte';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { aiSettings, PROVIDER_LABEL } from '$lib/ai/settings';
	import { askAI } from '$lib/ai/client';

	export let initialPrompt = '';

	const dispatch = createEventDispatcher();
	let messages = []; // {role, content}
	let input = '';
	let loading = false;
	let errorMsg = '';
	let scroller;

	async function send(text) {
		const content = text.trim();
		if (!content || loading) return;
		errorMsg = '';
		messages = [...messages, { role: 'user', content }];
		loading = true;
		await scrollDown();
		try {
			const reply = await askAI($aiSettings, messages);
			messages = [...messages, { role: 'assistant', content: reply }];
		} catch (e) {
			errorMsg = e?.message ?? String(e);
		} finally {
			loading = false;
			await scrollDown();
		}
	}

	async function scrollDown() {
		await tick();
		if (scroller) scroller.scrollTop = scroller.scrollHeight;
	}

	function onSubmit() {
		const v = input;
		input = '';
		send(v);
	}
	function onKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSubmit();
		}
	}

	onMount(() => {
		if (initialPrompt) send(initialPrompt);
	});
</script>

<div class="ai-overlay" on:click|self={() => dispatch('close')} role="presentation">
	<div class="ai-card" style="background:{t.surface}; border-color:{t.border}; color:{t.text};">
		<div class="ai-head" style="border-color:{t.border};">
			<span style="font-weight:700; font-size:14px;"><i class="fas fa-robot" style="color:{t.accent}; margin-right:8px;"></i>AI に質問 <span style="font-weight:400; font-size:11px; color:{t.dim};">— {PROVIDER_LABEL[$aiSettings.provider]}</span></span>
			<button class="ai-x" on:click={() => dispatch('close')} style="color:{t.dim};" aria-label="閉じる"><i class="fas fa-xmark"></i></button>
		</div>

		<div class="ai-msgs scrollbar" bind:this={scroller}>
			{#each messages as m}
				<div class="ai-msg {m.role}">
					<div class="ai-bubble" style={m.role === 'user'
						? `background:${t.accentDim}; border-color:${t.accentBorder};`
						: `background:${t.track}; border-color:${t.border};`}>{m.content}</div>
				</div>
			{/each}
			{#if loading}
				<div class="ai-msg assistant">
					<div class="ai-bubble" style="background:{t.track}; border-color:{t.border}; color:{t.dim};"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;"></i>考え中…</div>
				</div>
			{/if}
			{#if errorMsg}
				<div class="ai-err" style="border-color:{t.red}; color:{t.red};"><i class="fas fa-triangle-exclamation" style="margin-right:6px;"></i>{errorMsg}</div>
			{/if}
		</div>

		<div class="ai-input-row" style="border-color:{t.border};">
			<textarea
				class="ai-ta"
				rows="1"
				placeholder="追い質問を入力 (Enter で送信)"
				bind:value={input}
				on:keydown={onKey}
				disabled={loading}
				style="background:{t.track}; border-color:{t.border}; color:{t.text};"
			></textarea>
			<button class="ai-send" on:click={onSubmit} disabled={loading || !input.trim()} style="background:{t.accent}; color:{t.accentText};" aria-label="送信"><i class="fas fa-paper-plane"></i></button>
		</div>
		<p class="ai-disc" style="color:{t.dim};">回答は AI によるもので誤りを含むことがあります。重要な操作は自分で確認してください。</p>
	</div>
</div>

<style>
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
		max-width: 560px;
		height: 78vh;
		max-height: 720px;
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
	.ai-msgs {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 0;
	}
	.ai-msg {
		display: flex;
	}
	.ai-msg.user {
		justify-content: flex-end;
	}
	.ai-bubble {
		max-width: 84%;
		border: 1px solid;
		border-radius: 10px;
		padding: 10px 13px;
		font-size: 13.5px;
		line-height: 1.75;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.ai-err {
		border: 1px solid;
		border-radius: 8px;
		padding: 9px 12px;
		font-size: 12.5px;
		line-height: 1.6;
	}
	.ai-input-row {
		display: flex;
		gap: 8px;
		align-items: flex-end;
		padding: 10px 12px;
		border-top: 1px solid;
		flex-shrink: 0;
	}
	.ai-ta {
		flex: 1;
		resize: none;
		font-family: var(--font-sans);
		font-size: 13.5px;
		line-height: 1.5;
		padding: 9px 11px;
		border-radius: 8px;
		border: 1px solid;
		outline: none;
		max-height: 120px;
	}
	.ai-ta:focus {
		border-color: var(--accent);
	}
	.ai-send {
		border: none;
		border-radius: 8px;
		width: 40px;
		height: 38px;
		flex-shrink: 0;
		cursor: pointer;
		font-size: 14px;
	}
	.ai-send:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.ai-disc {
		margin: 0;
		padding: 0 16px 12px 16px;
		font-size: 10.5px;
		line-height: 1.5;
		flex-shrink: 0;
	}
</style>
