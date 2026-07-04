// 進捗の localStorage 永続化 (Spec.md §6 Progress)。MVP はバックエンド無し (§1.3)。
import { writable } from "svelte/store";
import { browser } from "$app/environment";

const STORAGE_KEY = "linux-trainer:progress:v1";

export interface ProgressState {
	/** 完了したシナリオ id → 完了日時 (ISO 8601) */
	completed: Record<string, { completedAt: string }>;
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

export function markComplete(id: string): void {
	progress.update((s) => ({
		...s,
		completed: { ...s.completed, [id]: { completedAt: new Date().toISOString() } }
	}));
}

/** デバッグ・テスト用: 進捗を全消去する */
export function resetProgress(): void {
	progress.set({ completed: {} });
}
