<script>
	// ミッションパネル内に置く折りたたみ式 AI チャット。
	// 端末を見ながら相談できるよう、モーダルではなくサイドバー常駐にする。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { aiSettings, PROVIDER_LABEL } from '$lib/ai/settings';
	import { askAI } from '$lib/ai/client';
	import { renderAiMarkdown } from '$lib/ai/markdown';

	/** 現在の課題 (title/description)。AI に状況を伝えるのに使う */
	export let scenario = null;

	let expanded = true;
	let messages = [];
	let input = '';
	let loading = false;
	let errorMsg = '';
	let scroller;

	$: providerShort = PROVIDER_LABEL[$aiSettings.provider].split(' ')[0];

	// 端末 (xterm) の見えている出力を読み取り、AI に「今の画面」を渡す。
	function readTerminal() {
		if (typeof document === 'undefined') return '';
		const rows = document.querySelectorAll('#console .xterm-rows > div');
		if (!rows.length) return '';
		const text = Array.from(rows)
			.map((r) => (r.textContent || '').replace(/\s+$/, ''))
			.join('\n')
			.replace(/\n{2,}/g, '\n')
			.replace(/^\n+|\n+$/g, '');
		// 末尾 ~40 行だけ (直近の状況)
		return text.split('\n').slice(-40).join('\n');
	}

	function buildSystemExtra() {
		const parts = [];
		if (scenario) {
			parts.push(`現在の課題: ${scenario.title}\n${scenario.description}`);
			if (scenario.hints?.length)
				parts.push(
					'この課題のヒント (ユーザーには一度に全部見せず、行き詰まったら順に小出しにする):\n' +
						scenario.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')
				);
			if (scenario.solution)
				parts.push(
					'模範解法 (答え。あなたの背景理解用。ユーザーには安易に教えず、まず自力で気づけるよう誘導する。どうしても行き詰まったときだけ段階的に):\n' +
						scenario.solution
				);
		}
		const term = readTerminal();
		if (term)
			parts.push(
				'端末の最近の出力 (これがユーザーの今の画面です。ここから現状を判断してください):\n```\n' +
					term +
					'\n```'
			);
		return parts.join('\n\n');
	}

	async function send(text) {
		const content = text.trim();
		if (!content || loading) return;
		errorMsg = '';
		messages = [...messages, { role: 'user', content }];
		loading = true;
		await scrollDown(); // 自分の送信時のみ末尾へ寄せる
		try {
			const reply = await askAI($aiSettings, messages, buildSystemExtra());
			messages = [...messages, { role: 'assistant', content: reply }];
			// AI の返答では自動スクロールしない (読んでいる位置を保つ)
		} catch (e) {
			errorMsg = e?.message ?? String(e);
		} finally {
			loading = false;
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
</script>

<section class="ai-sb" style="border-bottom:1px solid {t.border};">
	<div class="ai-sb-head">
		<button class="ai-sb-toggle" on:click={() => (expanded = !expanded)} style="color:{t.text};" aria-expanded={expanded}>
			<i class="fas fa-chevron-right chev" class:open={expanded} style="color:{t.dim}; font-size:10px;"></i>
			<i class="fas fa-robot" style="color:{t.accent}; font-size:12px;"></i>
			<span class="label" style="color:{t.dim};">AI アシスタント</span>
		</button>
		<span style="font-family:{FONT_MONO}; font-size:10px; color:{t.dim};">{providerShort}</span>
	</div>

	{#if expanded}
		<div class="ai-sb-body" transition:slide={{ duration: 220 }}>
			<div class="ai-sb-msgs scrollbar" class:has-msgs={messages.length > 0 || loading} bind:this={scroller}>
				{#if messages.length === 0 && !loading}
					<p class="ai-sb-empty" style="color:{t.dim};">端末を見ながら、このページ内で AI に相談できます。</p>
				{/if}
				{#each messages as m}
					{#if m.role === 'user'}
						<div class="ai-sb-msg user"><div class="bubble" style="background:{t.accentDim}; border-color:{t.accentBorder};">{m.content}</div></div>
					{:else}
						<div class="ai-sb-msg assistant"><div class="bubble md" style="background:{t.track}; border-color:{t.border};">{@html renderAiMarkdown(m.content)}</div></div>
					{/if}
				{/each}
				{#if loading}
					<div class="ai-sb-msg assistant"><div class="bubble" style="background:{t.track}; border-color:{t.border}; color:{t.dim};"><i class="fas fa-circle-notch fa-spin" style="margin-right:6px;"></i>考え中…</div></div>
				{/if}
				{#if errorMsg}
					<div class="ai-sb-err" style="border-color:{t.red}; color:{t.red};"><i class="fas fa-triangle-exclamation" style="margin-right:5px;"></i>{errorMsg}</div>
				{/if}
			</div>

			{#if scenario && messages.length === 0}
				<button class="ai-sb-hint" on:click={() => send('いま何をすればいいですか？現在の状態を踏まえて、次に実行すべきコマンドを教えてください。')} disabled={loading} style="border-color:{t.accentBorder}; color:{t.accent};">
					<i class="far fa-lightbulb" style="margin-right:6px;"></i>いま何をすべきか聞く
				</button>
			{/if}

			<div class="ai-sb-input">
				<textarea
					class="ai-sb-ta"
					rows="1"
					placeholder="質問を入力 (Enter で送信)"
					bind:value={input}
					on:keydown={onKey}
					disabled={loading}
					style="background:{t.track}; border-color:{t.border}; color:{t.text};"
				></textarea>
				<button class="ai-sb-send" on:click={onSubmit} disabled={loading || !input.trim()} style="background:{t.accent}; color:{t.accentText};" aria-label="送信"><i class="fas fa-paper-plane"></i></button>
			</div>
		</div>
	{/if}
</section>

<style>
	.ai-sb {
		padding: 14px 20px;
	}
	.ai-sb-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.ai-sb-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		font-family: inherit;
	}
	.chev {
		transition: transform 0.2s ease;
	}
	.chev.open {
		transform: rotate(90deg);
	}
	.label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
	}
	.ai-sb-body {
		overflow: hidden;
	}
	.ai-sb-msgs {
		margin-top: 10px;
		/* 中身に合わせて縮み、増えたら max まで伸びてスクロール。右下ハンドルで拡大縮小も可 */
		min-height: 0;
		max-height: 75vh;
		resize: vertical;
		overflow-y: auto;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	/* メッセージがあるときだけ、少し余裕のある高さを確保 */
	.ai-sb-msgs.has-msgs {
		min-height: 180px;
	}
	.ai-sb-empty {
		margin: 4px 0;
		font-size: 12px;
		line-height: 1.6;
	}
	.ai-sb-msg {
		display: flex;
	}
	.ai-sb-msg.user {
		justify-content: flex-end;
	}
	.bubble {
		max-width: 88%;
		border: 1px solid;
		border-radius: 9px;
		padding: 8px 11px;
		font-size: 12.5px;
		line-height: 1.7;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.bubble.md {
		white-space: normal;
	}
	.ai-sb-err {
		border: 1px solid;
		border-radius: 7px;
		padding: 8px 10px;
		font-size: 12px;
		line-height: 1.6;
	}
	.ai-sb-hint {
		width: 100%;
		margin-top: 10px;
		background: transparent;
		border: 1px solid;
		border-radius: 7px;
		padding: 8px 0;
		font-size: 12.5px;
		cursor: pointer;
		font-family: inherit;
	}
	.ai-sb-hint:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.ai-sb-input {
		display: flex;
		gap: 7px;
		align-items: flex-end;
		margin-top: 10px;
	}
	.ai-sb-ta {
		flex: 1;
		resize: vertical;
		font-family: var(--font-sans);
		font-size: 12.5px;
		line-height: 1.5;
		padding: 8px 10px;
		border-radius: 7px;
		border: 1px solid;
		outline: none;
		min-height: 34px;
		max-height: 200px;
	}
	.ai-sb-ta:focus {
		border-color: var(--accent);
	}
	.ai-sb-send {
		border: none;
		border-radius: 7px;
		width: 36px;
		height: 34px;
		flex-shrink: 0;
		cursor: pointer;
		font-size: 13px;
	}
	.ai-sb-send:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Markdown 描画 (チャット用にコンパクト) */
	.bubble.md :global(p) {
		margin: 0 0 8px 0;
	}
	.bubble.md :global(p:last-child) {
		margin-bottom: 0;
	}
	.bubble.md :global(h1),
	.bubble.md :global(h2),
	.bubble.md :global(h3),
	.bubble.md :global(h4) {
		font-size: 13px;
		font-weight: 700;
		margin: 12px 0 6px 0;
		line-height: 1.4;
	}
	.bubble.md :global(ul),
	.bubble.md :global(ol) {
		margin: 0 0 8px 0;
		padding-left: 20px;
	}
	.bubble.md :global(li) {
		margin-bottom: 3px;
	}
	.bubble.md :global(code) {
		font-family: var(--font-mono);
		font-size: 11.5px;
		background: var(--termBg);
		color: var(--accent);
		border-radius: 4px;
		padding: 1px 5px;
	}
	.bubble.md :global(pre) {
		background: var(--termBg);
		border: 1px solid var(--termBorder);
		border-radius: 7px;
		padding: 10px 12px;
		overflow-x: auto;
		margin: 0 0 8px 0;
	}
	.bubble.md :global(pre code) {
		background: transparent;
		color: var(--termText);
		padding: 0;
		font-size: 11.5px;
		line-height: 1.65;
	}
	.bubble.md :global(a) {
		color: var(--accent);
	}
	.bubble.md :global(table) {
		border-collapse: collapse;
		font-size: 11.5px;
		margin: 0 0 8px 0;
	}
	.bubble.md :global(th),
	.bubble.md :global(td) {
		border: 1px solid var(--border);
		padding: 4px 8px;
		text-align: left;
	}
	.bubble.md :global(blockquote) {
		margin: 0 0 8px 0;
		padding: 2px 0 2px 10px;
		border-left: 2px solid var(--accentBorder);
	}
</style>
