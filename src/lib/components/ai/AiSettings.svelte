<script>
	// AI 設定モーダル。ページ内チャット (BYOK) の有効化と API キー登録。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { createEventDispatcher } from 'svelte';
	import { t, FONT_MONO } from '$lib/design/theme';
	import { aiSettings, PROVIDER_LABEL } from '$lib/ai/settings';

	const dispatch = createEventDispatcher();
	let s = { ...$aiSettings };

	function save() {
		aiSettings.set({ ...s });
		dispatch('close');
	}
	function disableApi() {
		s.apiEnabled = false;
		aiSettings.set({ ...s });
		dispatch('close');
	}
</script>

<div class="ai-overlay" on:click|self={() => dispatch('close')} role="presentation">
	<div class="ai-card" style="background:{t.surface}; border-color:{t.border}; color:{t.text};">
		<div class="ai-head" style="border-color:{t.border};">
			<span style="font-weight:700; font-size:15px;"><i class="fas fa-robot" style="color:{t.accent}; margin-right:8px;"></i>AI 設定</span>
			<button class="ai-x" on:click={() => dispatch('close')} style="color:{t.dim};" aria-label="閉じる"><i class="fas fa-xmark"></i></button>
		</div>

		<div class="ai-body scrollbar">
			<p style="margin:0 0 14px 0; font-size:12.5px; line-height:1.7; color:{t.dim};">
				既定では「AIに聞く」は各サービスを<strong>新しいタブ</strong>で開きます（自分のアカウント・キー不要）。
				下で API を有効にすると、<strong>このページ内</strong>で直接やり取りできます。
			</p>

			<label class="ai-toggle" style="border-color:{t.border};">
				<input type="checkbox" bind:checked={s.apiEnabled} />
				<span>ページ内チャット (API) を有効にする</span>
			</label>

			{#if s.apiEnabled}
				<div class="ai-field">
					<span class="ai-label" style="color:{t.dim};">プロバイダ</span>
					<div style="display:flex; gap:8px; flex-wrap:wrap;">
						{#each ['anthropic', 'openai'] as p}
							<button
								class="ai-seg"
								on:click={() => (s.provider = p)}
								style={s.provider === p
									? `background:${t.accent}; color:${t.accentText}; border-color:${t.accent};`
									: `background:transparent; color:${t.dim}; border-color:${t.border};`}
							>{PROVIDER_LABEL[p]}</button>
						{/each}
					</div>
				</div>

				{#if s.provider === 'anthropic'}
					<div class="ai-field">
						<span class="ai-label" style="color:{t.dim};">Anthropic API キー</span>
						<input class="ai-input" type="password" placeholder="sk-ant-..." bind:value={s.anthropicKey} style="background:{t.track}; border-color:{t.border}; color:{t.text};" />
					</div>
					<div class="ai-field">
						<span class="ai-label" style="color:{t.dim};">モデル</span>
						<input class="ai-input" type="text" placeholder="claude-opus-4-8" bind:value={s.anthropicModel} style="background:{t.track}; border-color:{t.border}; color:{t.text}; font-family:{FONT_MONO};" />
						<span style="font-size:11px; color:{t.dim};">例: claude-opus-4-8 / claude-sonnet-4-6 / claude-haiku-4-5</span>
					</div>
					<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" class="ai-getkey" style="color:{t.accent};">キーを取得 <i class="fas fa-arrow-up-right-from-square" style="font-size:9px;"></i></a>
				{:else}
					<div class="ai-field">
						<span class="ai-label" style="color:{t.dim};">OpenAI API キー</span>
						<input class="ai-input" type="password" placeholder="sk-..." bind:value={s.openaiKey} style="background:{t.track}; border-color:{t.border}; color:{t.text};" />
					</div>
					<div class="ai-field">
						<span class="ai-label" style="color:{t.dim};">モデル</span>
						<input class="ai-input" type="text" placeholder="gpt-4o-mini" bind:value={s.openaiModel} style="background:{t.track}; border-color:{t.border}; color:{t.text}; font-family:{FONT_MONO};" />
						<span style="font-size:11px; color:{t.dim};">例: gpt-4o-mini / gpt-4o</span>
					</div>
					<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="ai-getkey" style="color:{t.accent};">キーを取得 <i class="fas fa-arrow-up-right-from-square" style="font-size:9px;"></i></a>
				{/if}

				<div class="ai-note" style="border-color:rgba(217,180,74,0.4); background:rgba(217,180,74,0.06);">
					<i class="fas fa-shield-halved" style="color:{t.amber}; margin-right:8px;"></i>
					<span style="font-size:11.5px; line-height:1.7; color:{t.text};">
						キーは<strong>この端末のブラウザ (localStorage)</strong> にのみ保存され、送信先は各社の API だけです。当サイトのサーバーには送られません。共用 PC では使用後に無効化してください。
					</span>
				</div>
			{/if}
		</div>

		<div class="ai-foot" style="border-color:{t.border};">
			{#if $aiSettings.apiEnabled}
				<button class="ai-btn ghost" on:click={disableApi} style="border-color:{t.border}; color:{t.dim};">無効化</button>
			{/if}
			<button class="ai-btn primary" on:click={save} style="background:{t.accent}; color:{t.accentText};">保存</button>
		</div>
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
		max-width: 440px;
		max-height: 88vh;
		border: 1px solid;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: var(--font-sans);
	}
	.ai-head,
	.ai-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		flex-shrink: 0;
	}
	.ai-head {
		border-bottom: 1px solid;
	}
	.ai-foot {
		border-top: 1px solid;
		gap: 8px;
		justify-content: flex-end;
	}
	.ai-body {
		padding: 16px 18px;
		overflow-y: auto;
	}
	.ai-x {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 16px;
	}
	.ai-toggle {
		display: flex;
		align-items: center;
		gap: 10px;
		border: 1px solid;
		border-radius: 8px;
		padding: 11px 13px;
		font-size: 13.5px;
		cursor: pointer;
		margin-bottom: 14px;
	}
	.ai-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 13px;
	}
	.ai-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
	}
	.ai-input {
		font-family: var(--font-sans);
		font-size: 13px;
		padding: 9px 11px;
		border-radius: 6px;
		border: 1px solid;
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}
	.ai-input:focus {
		border-color: var(--accent);
	}
	.ai-seg {
		font-size: 12.5px;
		padding: 7px 14px;
		border-radius: 999px;
		border: 1px solid;
		cursor: pointer;
	}
	.ai-getkey {
		display: inline-block;
		font-size: 12px;
		text-decoration: none;
		margin-bottom: 12px;
	}
	.ai-note {
		display: flex;
		align-items: flex-start;
		border: 1px solid;
		border-radius: 8px;
		padding: 11px 13px;
		margin-top: 4px;
	}
	.ai-btn {
		border-radius: 6px;
		padding: 8px 18px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
	}
	.ai-btn.ghost {
		background: transparent;
	}
	.ai-btn.primary {
		border: none;
	}
</style>
