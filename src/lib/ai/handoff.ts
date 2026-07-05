// 受け渡し (ディープリンク) 方式: ユーザー自身のアカウントで開いている各 AI に、
// 文脈を仕込んだプロンプトを載せて新しいタブで開く。こちらは資格情報に一切触れない。
export interface HandoffTarget {
	key: string;
	label: string;
	icon: string;
	build: (prompt: string) => string;
}

export const HANDOFF_TARGETS: HandoffTarget[] = [
	{
		key: "chatgpt",
		label: "ChatGPT",
		icon: "fas fa-comment-dots",
		build: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`
	},
	{
		key: "claude",
		label: "Claude",
		icon: "fas fa-robot",
		build: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`
	},
	{
		key: "gemini",
		label: "Gemini",
		icon: "fas fa-gem",
		build: (p) => `https://gemini.google.com/app?q=${encodeURIComponent(p)}`
	},
	{
		key: "perplexity",
		label: "Perplexity",
		icon: "fas fa-magnifying-glass",
		build: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`
	}
];
