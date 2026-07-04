// learn/loader.ts (content YAML/Markdown → 型) のユニットテスト。
// scenario/loader.test.ts と同じ流儀: 実物のコンテンツファイルを parse して検証する。
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { parseCommandDoc, parseArticle, parseGlossary } from "./loader";

const contentPath = (rel: string) =>
	fileURLToPath(new URL(`../../../content/${rel}`, import.meta.url));

describe("parseCommandDoc: 実物の commands/chmod.yaml", () => {
	const doc = parseCommandDoc(readFileSync(contentPath("commands/chmod.yaml"), "utf-8"));

	it("メタ情報が CommandDoc 型になる", () => {
		expect(doc.name).toBe("chmod");
		expect(doc.group).toBe("permissions");
		expect(doc.summary).toContain("権限");
		expect(doc.synopsis).toContain("chmod");
	});
	it("options / examples が {flag|cmd, desc} の配列になる", () => {
		expect(doc.options!.length).toBeGreaterThan(0);
		expect(doc.options![0]).toHaveProperty("flag");
		expect(doc.examples!.length).toBeGreaterThan(0);
		expect(doc.examples![0].cmd).toContain("chmod");
	});
	it("note / related が読める", () => {
		expect(doc.note).toContain("root");
		expect(doc.related_commands).toContain("chown");
		expect(doc.related_articles).toContain("permissions");
	});
});

describe("parseCommandDoc: バリデーション", () => {
	const valid = readFileSync(contentPath("commands/chmod.yaml"), "utf-8");

	it("必須フィールド欠落で throw する (summary)", () => {
		expect(() => parseCommandDoc(valid.replace(/^summary: .*$/m, ""))).toThrow(/invalid content/);
	});
	it("group の値域を検証する", () => {
		expect(() => parseCommandDoc(valid.replace("group: permissions", "group: misc"))).toThrow(
			/group/
		);
	});
	it("トップレベルがオブジェクトでなければ throw する", () => {
		expect(() => parseCommandDoc("just a string")).toThrow(/invalid content/);
	});
});

describe("parseArticle: 実物の articles/permissions.md", () => {
	const article = parseArticle(readFileSync(contentPath("articles/permissions.md"), "utf-8"), "permissions");

	it("frontmatter が分離されメタが読める", () => {
		expect(article.slug).toBe("permissions");
		expect(article.title).toContain("パーミッション");
		expect(article.categories).toContain("permissions");
		expect(article.order).toBe(10);
		expect(article.related_commands).toContain("chmod");
	});
	it("本文に frontmatter が混入しない", () => {
		expect(article.body).not.toContain("categories:");
		expect(article.body).toContain("## ");
	});
	it("frontmatter が無ければ throw する", () => {
		expect(() => parseArticle("# 本文だけ", "x")).toThrow(/frontmatter/);
	});
	it("categories が無ければ throw する", () => {
		expect(() => parseArticle("---\ntitle: t\nsummary: s\n---\n本文", "x")).toThrow(/categories/);
	});
});

describe("parseGlossary: 実物の glossary.yaml", () => {
	const terms = parseGlossary(readFileSync(contentPath("glossary.yaml"), "utf-8"));

	it("terms が {term, def} の配列になる", () => {
		expect(terms.length).toBeGreaterThanOrEqual(10);
		const pid = terms.find((t) => t.term === "PID");
		expect(pid).toBeDefined();
		expect(pid!.def).toContain("プロセス");
	});
	it("terms キーが無ければ throw する", () => {
		expect(() => parseGlossary("foo: bar")).toThrow(/terms/);
	});
});

describe("content/index.yaml の整合性", () => {
	const index = load(readFileSync(contentPath("index.yaml"), "utf-8")) as {
		commands: string[];
		articles: string[];
	};

	it("全コマンド id のファイルが実在し name が一致する", () => {
		for (const name of index.commands) {
			const doc = parseCommandDoc(readFileSync(contentPath(`commands/${name}.yaml`), "utf-8"));
			expect(doc.name).toBe(name);
		}
	});
	it("全記事 slug のファイルが実在し parse できる", () => {
		for (const slug of index.articles) {
			const article = parseArticle(readFileSync(contentPath(`articles/${slug}.md`), "utf-8"), slug);
			expect(article.title.length).toBeGreaterThan(0);
		}
	});
});
