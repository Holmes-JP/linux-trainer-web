// 進捗の localStorage 永続化 (Spec.md §6 Progress)。MVP はバックエンド無し (§1.3)。
import { writable } from "svelte/store";
import { browser } from "$app/environment";

const STORAGE_KEY = "linux-trainer:progress:v1";

export interface CompletionRecord {
	/** 完了日時 (ISO 8601)。初回完了を保持 */
	completedAt: string;
	/** 最短クリア時間 (ミリ秒)。無い場合もある (旧データ互換) */
	bestMs?: number;
}

export interface ProgressState {
	/** 完了したシナリオ id → 完了記録 */
	completed: Record<string, CompletionRecord>;
}

function loadState(): ProgressState {
	if (!browser) return { completed: {} };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		if (parsed && typeof parsed.completed === "object" && parsed.completed !== null)
			return parsed as ProgressState;
	} catch {
		// 壊れたデータは捨てて初期化
	}
	return { completed: {} };
}

export const progress = writable<ProgressState>(loadState());

progress.subscribe((state) => {
	if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
});

/**
 * シナリオを完了として記録する。
 * completedAt は初回を保持し、bestMs は最短を保持する (再挑戦で更新)。
 * @param elapsedMs 今回のクリアに要した時間 (ミリ秒)。省略可
 */
export function markComplete(id: string, elapsedMs?: number): void {
	progress.update((s) => {
		const prev = s.completed[id];
		const bestMs =
			elapsedMs === undefined
				? prev?.bestMs
				: prev?.bestMs === undefined
					? elapsedMs
					: Math.min(prev.bestMs, elapsedMs);
		return {
			...s,
			completed: {
				...s.completed,
				[id]: {
					completedAt: prev?.completedAt ?? new Date().toISOString(),
					...(bestMs !== undefined ? { bestMs } : {})
				}
			}
		};
	});
}

/** デバッグ・テスト用: 進捗を全消去する */
export function resetProgress(): void {
	progress.set({ completed: {} });
}
