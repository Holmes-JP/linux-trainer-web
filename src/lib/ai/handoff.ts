// 受け渡し (ディープリンク) 方式: ユーザー自身のアカウントで開いている各 AI に、
// 文脈を仕込んだプロンプトを載せて新しいタブで開く。こちらは資格情報に一切触れない。
export interface HandoffTarget {
	key: string;
	label: string;
	/** static/ai-icons/ 配下の本物のファビコン名 */
	iconFile: string;
	build: (prompt: string) => string;
}

export const HANDOFF_TARGETS: HandoffTarget[] = [
	{
		key: "chatgpt",
		label: "ChatGPT",
		iconFile: "chatgpt.png",
		build: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`
	},
	{
		key: "claude",
		label: "Claude",
		iconFile: "claude.png",
		build: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`
	},
	{
		key: "gemini",
		label: "Gemini",
		iconFile: "gemini.png",
		build: (p) => `https://gemini.google.com/app?q=${encodeURIComponent(p)}`
	},
	{
		key: "perplexity",
		label: "Perplexity",
		iconFile: "perplexity.png",
		build: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}`
	}
];
