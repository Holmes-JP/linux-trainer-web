// 記事本文 (Markdown) → HTML。
// コンテンツはこのリポジトリ内で執筆する信頼済みテキストなのでサニタイズは不要。
import { marked } from "marked";

marked.setOptions({
	gfm: true, // テーブル記法を使う
	breaks: false
});

export function renderMarkdown(md: string): string {
	return marked.parse(md, { async: false }) as string;
}
