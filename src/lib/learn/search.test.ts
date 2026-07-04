// learn/search.ts (全文検索の純粋関数) のユニットテスト。
import { describe, it, expect } from "vitest";
import { normalize, makeSnippet, searchDocs } from "./search";
import type { IndexDoc } from "./types";

const docs: IndexDoc[] = [
	{
		type: "command",
		id: "chmod",
		title: "chmod",
		summary: "ファイルの権限を変更する",
		group: "permissions",
		text: "chmod 644 file.txt 所有者は読み書き グループとその他は読み取りのみ"
	},
	{
		type: "article",
		id: "permissions",
		title: "パーミッションの仕組み",
		summary: "rwx と数値表記を理解する",
		categories: ["permissions"],
		order: 10,
		text: "ディレクトリの x は見落としやすい。x が無いディレクトリは辿り着けない。root は権限を無視できる"
	},
	{
		type: "term",
		id: "PID",
		title: "PID",
		summary: "プロセスID",
		text: "動いているプロセスに振られる一意な番号"
	}
];

describe("normalize", () => {
	it("NFKC で全角英数・半角カナのゆれを吸収する", () => {
		expect(normalize("ＣＨＭＯＤ")).toBe("chmod");
		expect(normalize("ﾊﾟｰﾐｯｼｮﾝ")).toBe("パーミッション");
	});
	it("大文字小文字を吸収する", () => {
		expect(normalize("PID")).toBe("pid");
	});
});

describe("searchDocs", () => {
	it("タイトル一致 > 概要一致 > 本文一致 の順に並ぶ", () => {
		const hits = searchDocs(docs, "権限");
		expect(hits.length).toBe(2);
		// chmod は summary ヒット (30)、permissions 記事は本文ヒット (1)
		expect(hits[0].doc.id).toBe("chmod");
		expect(hits[1].doc.id).toBe("permissions");
	});
	it("タイトル完全一致が最優先になる", () => {
		const hits = searchDocs(docs, "chmod");
		expect(hits[0].doc.id).toBe("chmod");
		expect(hits[0].score).toBeGreaterThanOrEqual(1000);
	});
	it("全角・大文字の入力でもヒットする (NFKC 正規化)", () => {
		expect(searchDocs(docs, "ＣＨＭＯＤ")[0].doc.id).toBe("chmod");
		expect(searchDocs(docs, "pid")[0].doc.id).toBe("PID");
	});
	it("空白区切りの複数キーワードは AND になる", () => {
		expect(searchDocs(docs, "権限 root").map((h) => h.doc.id)).toEqual(["permissions"]);
		expect(searchDocs(docs, "権限 存在しない語")).toEqual([]);
	});
	it("本文のみのヒットにはスニペットが付く", () => {
		const hits = searchDocs(docs, "見落としやすい");
		expect(hits.length).toBe(1);
		expect(hits[0].snippet).toContain("見落としやすい");
	});
	it("タイトルヒットにはスニペットを付けない", () => {
		expect(searchDocs(docs, "chmod")[0].snippet).toBeNull();
	});
	it("空クエリは空配列を返す", () => {
		expect(searchDocs(docs, "")).toEqual([]);
		expect(searchDocs(docs, "   ")).toEqual([]);
	});
});

describe("makeSnippet", () => {
	const text = "あ".repeat(100) + "キーワード" + "い".repeat(100);
	it("マッチ位置の前後を抜き出し、省略記号を付ける", () => {
		const snippet = makeSnippet(text, "キーワード");
		expect(snippet).toContain("キーワード");
		expect(snippet!.startsWith("…")).toBe(true);
		expect(snippet!.endsWith("…")).toBe(true);
		expect(snippet!.length).toBeLessThan(100);
	});
	it("見つからなければ null", () => {
		expect(makeSnippet(text, "無い")).toBeNull();
	});
});
