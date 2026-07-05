// AI 連携の設定 (localStorage 永続化)。
// 既定は「受け渡し方式」(APIキー不要・新タブ)。apiEnabled=true でページ内チャットが使える。
// キーはこの端末のブラウザにのみ保存し、送信先は各社 API のみ。サーバには送らない。
import { writable } from "svelte/store";

export type AiProvider = "anthropic" | "openai";

export interface AiSettings {
	/** ページ内チャット (BYOK) を有効にするか */
	apiEnabled: boolean;
	provider: AiProvider;
	anthropicKey: string;
	openaiKey: string;
	anthropicModel: string;
	openaiModel: string;
}

const STORAGE_KEY = "hl_ai_settings";

export const DEFAULT_SETTINGS: AiSettings = {
	apiEnabled: false,
	provider: "anthropic",
	anthropicKey: "",
	openaiKey: "",
	anthropicModel: "claude-opus-4-8",
	openaiModel: "gpt-4o-mini"
};

function load(): AiSettings {
	if (typeof localStorage === "undefined") return { ...DEFAULT_SETTINGS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export const aiSettings = writable<AiSettings>(load());

aiSettings.subscribe((v) => {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
	} catch {
		/* 保存できなくても致命的ではない */
	}
});

/** ページ内チャットを実際に使える状態か (有効フラグ + 選択プロバイダのキーが入っている) */
export function isChatReady(s: AiSettings): boolean {
	if (!s.apiEnabled) return false;
	return s.provider === "anthropic" ? !!s.anthropicKey : !!s.openaiKey;
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
	anthropic: "Claude (Anthropic)",
	openai: "ChatGPT (OpenAI)"
};
