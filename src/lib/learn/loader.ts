// content/ の YAML / Markdown → 型付きオブジェクト。
// scenario/loader.ts と同じ流儀: parse系は純粋関数 (テスト対象)、loadXxx が fetch を担う。
import { load } from "js-yaml";
import { base } from "$app/paths";
import type { Article, CommandDoc, CommandGroup, ContentIndex, GlossaryTerm } from "./types";

const GROUPS: CommandGroup[] = [
	"files",
	"text",
	"permissions",
	"processes",
	"disk",
	"services",
	"logs",
	"system"
];

class ContentError extends Error {
	constructor(msg: string) {
		super(`invalid content: ${msg}`);
	}
}

function requireString(obj: Record<string, unknown>, key: string, ctx: string): string {
	const v = obj[key];
	if (typeof v !== "string" || v.length === 0)
		throw new ContentError(`${ctx}: "${key}" は必須の文字列`);
	return v;
}

function optionalStringArray(raw: unknown, ctx: string): string[] | undefined {
	if (raw === undefined) return undefined;
	if (!Array.isArray(raw)) throw new ContentError(`${ctx} は文字列の配列`);
	return raw.map(String);
}

/** content/commands/<name>.yaml を parse する */
export function parseCommandDoc(yamlText: string): CommandDoc {
	const raw = load(yamlText);
	if (typeof raw !== "object" || raw === null)
		throw new ContentError("トップレベルがオブジェクトではない");
	const o = raw as Record<string, unknown>;
	const group = requireString(o, "group", "command") as CommandGroup;
	if (!GROUPS.includes(group))
		throw new ContentError(`"group" は ${GROUPS.join("/")} のいずれか`);
	const doc: CommandDoc = {
		name: requireString(o, "name", "command"),
		summary: requireString(o, "summary", "command"),
		group,
		synopsis: requireString(o, "synopsis", "command")
	};
	if (o.options !== undefined) {
		if (!Array.isArray(o.options)) throw new ContentError(`"options" は配列`);
		doc.options = o.options.map((op, i) => {
			const oo = op as Record<string, unknown>;
			return {
				flag: requireString(oo, "flag", `options[${i}]`),
				desc: requireString(oo, "desc", `options[${i}]`)
			};
		});
	}
	if (o.examples !== undefined) {
		if (!Array.isArray(o.examples)) throw new ContentError(`"examples" は配列`);
		doc.examples = o.examples.map((ex, i) => {
			const eo = ex as Record<string, unknown>;
			return {
				cmd: requireString(eo, "cmd", `examples[${i}]`),
				desc: requireString(eo, "desc", `examples[${i}]`)
			};
		});
	}
	if (o.note !== undefined) doc.note = String(o.note).trim();
	doc.related_commands = optionalStringArray(o.related_commands, `"related_commands"`);
	doc.related_articles = optionalStringArray(o.related_articles, `"related_articles"`);
	doc.related_scenarios = optionalStringArray(o.related_scenarios, `"related_scenarios"`);
	return doc;
}

/** content/articles/<slug>.md (frontmatter + Markdown 本文) を parse する */
export function parseArticle(mdText: string, slug: string): Article {
	const m = mdText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) throw new ContentError(`${slug}: frontmatter (--- で囲む) が無い`);
	const meta = load(m[1]);
	if (typeof meta !== "object" || meta === null)
		throw new ContentError(`${slug}: frontmatter がオブジェクトではない`);
	const o = meta as Record<string, unknown>;
	if (!Array.isArray(o.categories) || o.categories.length === 0)
		throw new ContentError(`${slug}: "categories" は1件以上の配列`);
	const article: Article = {
		slug,
		title: requireString(o, "title", slug),
		summary: requireString(o, "summary", slug),
		categories: o.categories.map(String),
		body: m[2].trim()
	};
	if (article.body.length === 0) throw new ContentError(`${slug}: 本文が空`);
	if (o.order !== undefined) article.order = Number(o.order);
	article.related_commands = optionalStringArray(o.related_commands, `${slug}: "related_commands"`);
	article.related_scenarios = optionalStringArray(o.related_scenarios, `${slug}: "related_scenarios"`);
	return article;
}

/** content/glossary.yaml を parse する */
export function parseGlossary(yamlText: string): GlossaryTerm[] {
	const raw = load(yamlText) as Record<string, unknown> | null;
	if (!raw || !Array.isArray(raw.terms))
		throw new ContentError(`glossary: "terms" の配列が必要`);
	return raw.terms.map((t, i) => {
		const o = t as Record<string, unknown>;
		const term: GlossaryTerm = {
			term: requireString(o, "term", `terms[${i}]`),
			def: requireString(o, "def", `terms[${i}]`).trim()
		};
		if (o.reading !== undefined) term.reading = String(o.reading);
		term.related_articles = optionalStringArray(o.related_articles, `terms[${i}].related_articles`);
		term.related_commands = optionalStringArray(o.related_commands, `terms[${i}].related_commands`);
		return term;
	});
}

// --- fetch 系 (静的配信された content/ を取得する) ---

async function fetchText(path: string): Promise<string> {
	const res = await fetch(`${base}/content/${path}`);
	if (!res.ok) throw new Error(`failed to fetch content/${path}: HTTP ${res.status}`);
	return res.text();
}

export async function loadCommandDoc(name: string): Promise<CommandDoc> {
	const doc = parseCommandDoc(await fetchText(`commands/${encodeURIComponent(name)}.yaml`));
	if (doc.name !== name) throw new ContentError(`name "${doc.name}" がファイル名 "${name}" と不一致`);
	return doc;
}

export async function loadArticle(slug: string): Promise<Article> {
	return parseArticle(await fetchText(`articles/${encodeURIComponent(slug)}.md`), slug);
}

export async function loadGlossary(): Promise<GlossaryTerm[]> {
	return parseGlossary(await fetchText("glossary.yaml"));
}

/** scripts/build-content-index.mjs が生成した検索インデックスを取得する */
export async function loadSearchIndex(): Promise<ContentIndex> {
	const res = await fetch(`${base}/content/search-index.json`);
	if (!res.ok) throw new Error(`failed to fetch content/search-index.json: HTTP ${res.status}`);
	return res.json();
}
