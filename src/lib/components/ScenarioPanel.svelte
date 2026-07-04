<script>
	// 挑戦画面のミッションパネル (Refined - Challenge デザイン準拠)。
	// MISSION / CHECK / HINT / SOLUTION と、フッターの reset を1枚の aside にまとめる。
	// ロジックとテストフック (#m1-check-btn, #next-scenario, #reset-btn 等) は従来どおり維持。
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import { createEventDispatcher } from 'svelte';
	import { t, FONT_MONO } from '$lib/design/theme';

	export let scenario = null;
	/** booting → setting-up → ready → checking → ready / setup-failed */
	export let phase = 'booting';
	export let results = [];
	export let errorMsg = '';
	export let bootStalled = false;

	const dispatch = createEventDispatcher();

	let revealed = 0;
	let solStep = 'hidden'; // hidden → confirming → shown
	let confirmingReset = false;

	$: checking = phase === 'checking';
	$: raw = results && results.length ? results : null; // null = 未採点
	$: checkDefs = scenario?.check?.map((c) => c.description) ?? [];
	$: checks = checkDefs.map((description, i) => {
		const r = raw ? raw[i] : null;
		const pass = r ? r.pass : null;
		return {
			description,
			markIcon: pass === true ? 'fas fa-check' : pass === false ? 'fas fa-xmark' : 'fas fa-minus',
			markColor: pass === true ? t.accentText : pass === false ? t.red : t.dim,
			boxBg: pass === true ? t.accent : 'transparent',
			boxBorder: pass === true ? t.accent : pass === false ? t.red : t.border,
			textColor: pass === false ? t.red : t.text
		};
	});
	$: allPassed = !!raw && raw.every((r) => r.pass);
	$: someFailed = !!raw && !allPassed;
	$: passCount = raw ? raw.filter((r) => r.pass).length + '/' + raw.length + ' PASS' : '未採点';
	$: checkLabel = checking ? '判定中…' : '▶ CHECK — 修復できたか採点する';

	$: hints = scenario?.hints ?? [];
	$: shownHints = hints.slice(0, revealed).map((text, i) => ({ text, num: '0' + (i + 1) }));
	$: moreHints = revealed < hints.length;

	function revealNext() {
		revealed = Math.min(revealed + 1, hints.length);
	}
	function doCheck() {
		if (!checking) dispatch('check');
	}
	function doReset() {
		confirmingReset = false;
		revealed = 0;
		solStep = 'hidden';
		dispatch('reset');
	}
</script>

<aside class="mission" style="--surface:{t.surface}; --border:{t.border};">
	<div class="mission-body scrollbar">
		<!-- MISSION -->
		<section style="padding:20px 20px 16px 20px; border-bottom:1px solid {t.border};">
			<h2 class="label" style="color:{t.dim};">MISSION</h2>
			{#if scenario}
				<p style="margin:0; font-size:13.5px; line-height:1.8; color:{t.text}; white-space:pre-line;">{scenario.description}</p>
			{:else}
				<p style="margin:0; color:{t.dim};">シナリオを読み込み中…</p>
			{/if}
		</section>

		{#if phase === 'booting' || phase === 'setting-up'}
			<!-- 準備中ステータス -->
			<section style="padding:16px 20px; border-bottom:1px solid {t.border};">
				<p style="margin:0; font-size:13px; color:{t.dim};">
					<i class="fas fa-circle-notch fa-spin" style="margin-right:8px; color:{t.amber};"></i>
					{phase === 'booting' ? 'VM を起動中… (初回はディスク配信のため少し時間がかかります)' : 'シナリオを準備中…'}
				</p>
				{#if bootStalled}
					<p style="margin:10px 0 0 0; font-size:12px; line-height:1.6; color:{t.amber};">
						起動に時間がかかっています。ディスク (disks.webvm.io) に接続できていない可能性があります。再読み込み、または VPN / 拡張機能をご確認ください。
					</p>
				{/if}
			</section>
		{:else if phase === 'setup-failed'}
			<section style="padding:16px 20px; border-bottom:1px solid {t.border};">
				<p style="margin:0; font-size:13px; line-height:1.6; color:{t.red};">
					<i class="fas fa-triangle-exclamation" style="margin-right:8px;"></i>シナリオの準備に失敗しました。<br />{errorMsg}
				</p>
			</section>
		{:else}
			<!-- CHECK -->
			<section style="padding:16px 20px; border-bottom:1px solid {t.border};">
				<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
					<h2 class="label" style="color:{t.dim}; margin:0;">CHECK</h2>
					<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};">{passCount}</span>
				</div>
				<ul style="list-style:none; margin:0 0 14px 0; padding:0; display:flex; flex-direction:column; gap:8px;">
					{#each checks as c}
						<li style="display:flex; gap:10px; align-items:flex-start; font-size:13px; line-height:1.6;">
							<span style="width:18px; height:18px; flex-shrink:0; margin-top:1px; border-radius:4px; border:1px solid {c.boxBorder}; background:{c.boxBg}; color:{c.markColor}; display:flex; align-items:center; justify-content:center; font-size:10px;"><i class={c.markIcon}></i></span>
							<span style="color:{c.textColor};">{c.description}</span>
						</li>
					{/each}
				</ul>
				<button
					id="m1-check-btn"
					class="btn-primary"
					style="background:{t.accent}; color:{t.accentText};"
					disabled={checking}
					on:click={doCheck}
				>{checkLabel}</button>

				{#if allPassed}
					<div style="margin-top:12px; border:1px solid {t.accentBorder}; background:{t.accentDim}; border-radius:6px; padding:12px 14px;">
						<p id="m1-passed" style="margin:0 0 10px 0; font-size:13px; font-weight:600; color:{t.accent};"><i class="fas fa-check-circle" style="margin-right:6px;"></i>修復完了。お見事!</p>
						<a
							id="next-scenario"
							href="/play"
							data-sveltekit-reload
							class="cta"
							style="background:{t.accent}; color:{t.accentText};"
						>次の課題へ →</a>
					</div>
				{:else if someFailed}
					<p style="margin:10px 0 0 0; font-size:12px; color:{t.dim};">まだ直っていない項目がある。調査を続けよう。</p>
				{/if}
				{#if errorMsg}
					<p style="margin:10px 0 0 0; font-size:12px; color:{t.red};">{errorMsg}</p>
				{/if}
			</section>

			<!-- HINT -->
			{#if hints.length}
				<section style="padding:16px 20px; border-bottom:1px solid {t.border};">
					<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
						<h2 class="label" style="color:{t.dim}; margin:0;">HINT</h2>
						<span style="font-family:{FONT_MONO}; font-size:11px; color:{t.dim};">{revealed}/{hints.length}</span>
					</div>
					{#if revealed > 0}
						<ol style="margin:0 0 12px 0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px;">
							{#each shownHints as h}
								<li style="display:flex; gap:10px; font-size:13px; line-height:1.7;">
									<span style="font-family:{FONT_MONO}; color:{t.amber}; flex-shrink:0;">{h.num}</span>
									<span style="color:{t.text};">{h.text}</span>
								</li>
							{/each}
						</ol>
					{/if}
					{#if moreHints}
						<button id="hint-next-btn" class="btn-ghost hint" on:click={revealNext} style="border-color:{t.border}; color:{t.dim};">
							<i class="far fa-lightbulb" style="margin-right:6px;"></i>{revealed === 0 ? 'ヒントを見る' : '次のヒント'}
						</button>
					{/if}
				</section>
			{/if}

			<!-- SOLUTION -->
			{#if scenario?.solution}
				<section style="padding:16px 20px;">
					<h2 class="label" style="color:{t.dim};">SOLUTION</h2>
					{#if solStep === 'hidden'}
						<button id="solution-btn" class="btn-ghost sol" on:click={() => (solStep = 'confirming')} style="border-color:{t.border}; color:{t.dim};">
							<i class="fas fa-eye" style="margin-right:6px;"></i>解答を見る…
						</button>
					{:else if solStep === 'confirming'}
						<p style="margin:0 0 10px 0; font-size:12.5px; line-height:1.6; color:{t.text};">本当に解答を見る? 自力で直せた方が力になる。</p>
						<div style="display:flex; gap:8px;">
							<button id="solution-confirm-btn" class="btn-danger" on:click={() => (solStep = 'shown')} style="border-color:{t.red}; color:{t.red};">諦めて見る</button>
							<button class="btn-primary" on:click={() => (solStep = 'hidden')} style="background:{t.accent}; color:{t.accentText}; font-weight:600;">まだ粘る</button>
						</div>
					{:else}
						<div style="border-left:2px solid {t.amber}; padding:2px 0 2px 14px;">
							<p id="solution-text" style="margin:0; font-size:13px; line-height:1.8; white-space:pre-line; color:{t.text};">{scenario.solution}</p>
						</div>
					{/if}
				</section>
			{/if}
		{/if}
	</div>

	<!-- Footer: reset -->
	<div style="flex-shrink:0; border-top:1px solid {t.border}; padding:12px 20px;">
		{#if !confirmingReset}
			<button id="reset-btn" class="btn-text" on:click={() => (confirmingReset = true)} style="color:{t.dim};">
				<i class="fas fa-rotate-left" style="margin-right:6px;"></i>シナリオをリセット
			</button>
		{:else}
			<p style="margin:0 0 8px 0; font-size:12px; line-height:1.6; color:{t.text};">VM を初期状態に戻して最初からやり直す (これまでの操作は失われる)。よい?</p>
			<div style="display:flex; gap:8px;">
				<button id="reset-confirm-btn" class="btn-danger" on:click={doReset} style="border-color:{t.red}; color:{t.red};">リセットする</button>
				<button class="btn-ghost" on:click={() => (confirmingReset = false)} style="border-color:{t.border}; color:{t.dim};">やめる</button>
			</div>
		{/if}
	</div>
</aside>

<style>
	.mission {
		/* 幅は折りたたみラッパー (.panel-inner 400px) が決める。ここは親いっぱいに広がる */
		width: 100%;
		flex-shrink: 0;
		border-left: 1px solid var(--border);
		background: var(--surface);
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		box-sizing: border-box;
	}
	.mission-body {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}
	.label {
		margin: 0 0 10px 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
	}
	.btn-primary {
		width: 100%;
		padding: 10px 0;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.06em;
	}
	.btn-primary:hover {
		filter: brightness(1.1);
	}
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.cta {
		display: block;
		text-align: center;
		border-radius: 6px;
		padding: 8px 0;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.cta:hover {
		filter: brightness(1.1);
	}
	.btn-ghost,
	.btn-danger {
		background: transparent;
		border: 1px solid;
		border-radius: 6px;
		padding: 6px 14px;
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	.btn-text {
		background: transparent;
		border: none;
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
		padding: 0;
	}
</style>
