// 全文検索 (純粋関数)。
// 総量 ~150 doc × 数 KB なので、インデックスライブラリではなく
// NFKC 正規化 + substring 一致で足りる (日本語のトークナイズ問題も回避できる)。
import type { IndexDoc } from "./types";

export interface SearchHit {
	doc: IndexDoc;
	score: number;
	/** 本文ヒット時のマッチ前後の抜粋 (タイトル/概要ヒットのみなら null) */
	snippet: string | null;
}

/** 全角/半角・大文字小文字のゆれを吸収する */
export function normalize(s: string): string {
	return s.normalize("NFKC").toLowerCase();
}

/** text 中の keyword 初出位置の前後を抜き出す (元テキストの表記のまま) */
export function makeSnippet(text: string, keyword: string, radius = 40): string | null {
	const pos = normalize(text).indexOf(keyword);
	if (pos < 0) return null;
	// normalize は NFKC で長さが変わりうるが、コンテンツは大半が ASCII/かな漢字で
	// 1:1 に写るため位置ずれは実用上問題にならない (ずれても抜粋が数文字動くだけ)
	const start = Math.max(0, pos - radius);
	const end = Math.min(text.length, pos + keyword.length + radius);
	return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

/**
 * 空白区切りの複数キーワード AND で全文検索する。
 * ランク: タイトル一致 > 概要一致 > 本文一致 (タイトル完全一致は最優先)。
 */
export function searchDocs(docs: IndexDoc[], query: string, limit = 50): SearchHit[] {
	const keywords = normalize(query).split(/\s+/).filter(Boolean);
	if (keywords.length === 0) return [];
	const hits: SearchHit[] = [];
	for (const doc of docs) {
		const title = normalize(doc.title);
		const summary = normalize(doc.summary);
		const text = normalize(doc.text);
		let score = 0;
		let snippetKeyword: string | null = null;
		let miss = false;
		for (const kw of keywords) {
			if (title === kw) score += 1000;
			else if (title.includes(kw)) score += 100;
			else if (summary.includes(kw)) score += 30;
			else if (text.includes(kw)) {
				score += 1;
				snippetKeyword = snippetKeyword ?? kw;
			} else {
				miss = true;
				break;
			}
		}
		if (miss || score === 0) continue;
		hits.push({
			doc,
			score,
			snippet: snippetKeyword ? makeSnippet(doc.text, snippetKeyword) : null
		});
	}
	hits.sort((a, b) => b.score - a.score);
	return hits.slice(0, limit);
}
