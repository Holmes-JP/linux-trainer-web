// 解説コンテンツ (content/) の型定義。
// manifest スキーマ (scenario/types.ts) とは独立した新領域。

/** コマンドの表示グルーピング (シナリオの category とは別軸) */
export type CommandGroup =
	| "files"
	| "text"
	| "permissions"
	| "processes"
	| "disk"
	| "services"
	| "logs"
	| "system"
	| "network";

export interface CommandOption {
	flag: string;
	desc: string;
}

export interface CommandExample {
	cmd: string;
	desc: string;
}

/** content/commands/<name>.yaml */
export interface CommandDoc {
	name: string;
	summary: string;
	group: CommandGroup;
	synopsis: string;
	options?: CommandOption[];
	examples?: CommandExample[];
	/** 演習環境での注意など補足 (amber の注記ボックスで表示) */
	note?: string;
	related_commands?: string[];
	related_articles?: string[];
	related_scenarios?: string[];
}

/** content/articles/<slug>.md の frontmatter + 本文 */
export interface Article {
	slug: string;
	title: string;
	summary: string;
	/** シナリオの category と同じ語彙。シナリオ連動の自動マッピングに使う */
	categories: string[];
	related_commands?: string[];
	related_scenarios?: string[];
	order?: number;
	/** Markdown 本文 (frontmatter を除いたもの) */
	body: string;
}

/** content/glossary.yaml の1語 */
export interface GlossaryTerm {
	term: string;
	reading?: string;
	def: string;
	related_articles?: string[];
	related_commands?: string[];
}

/** search-index.json 内の1ドキュメント (全文検索 + 一覧表示用メタ) */
export interface IndexDoc {
	type: "command" | "article" | "term";
	id: string;
	title: string;
	summary: string;
	group?: CommandGroup;
	categories?: string[];
	order?: number;
	/** 全文検索用のプレーンテキスト */
	text: string;
}

/** シナリオ詳細に出す関連解説への参照 */
export interface RelatedRef {
	type: "command" | "article";
	id: string;
	title: string;
}

/** scripts/build-content-index.mjs が生成する search-index.json 全体 */
export interface ContentIndex {
	docs: IndexDoc[];
	byScenario: Record<string, RelatedRef[]>;
	scenarioTitles: Record<string, string>;
}
