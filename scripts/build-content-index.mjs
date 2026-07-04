// 解説コンテンツ (content/) の検証と全文検索インデックスの生成。
// dev/build の前に package.json scripts から実行される。
//
//   入力: content/index.yaml, content/commands/*.yaml, content/articles/*.md,
//         content/glossary.yaml, scenarios/ (シナリオ連動の逆引き用)
//   出力: content/search-index.json (gitignore 対象。viteStaticCopy で配信される)
//
// 検証に失敗したら exit 1 (CI の npm run build が整合性テストを兼ねる)。
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(root, "content");

const GROUPS = ["files", "text", "permissions", "processes", "disk", "services", "logs", "system"];
const SCENARIO_CATEGORIES = ["filesystem", "permissions", "processes", "disk", "services", "logs"];

const errors = [];
const warnings = [];

function fail(msg) {
	errors.push(msg);
}

function readYaml(relPath) {
	return load(readFileSync(join(contentDir, relPath), "utf-8"));
}

// --- content/index.yaml ---
const index = readYaml("index.yaml");
if (!index || !Array.isArray(index.commands) || !Array.isArray(index.articles)) {
	console.error("content/index.yaml: commands / articles の配列が必要");
	process.exit(1);
}

// --- commands/*.yaml ---
const commands = [];
for (const name of index.commands) {
	let doc;
	try {
		doc = readYaml(join("commands", `${name}.yaml`));
	} catch (e) {
		fail(`commands/${name}.yaml が読めない: ${e.message}`);
		continue;
	}
	if (doc.name !== name) fail(`commands/${name}.yaml: name "${doc.name}" がファイル名と不一致`);
	for (const key of ["summary", "group", "synopsis"])
		if (typeof doc[key] !== "string" || !doc[key]) fail(`commands/${name}.yaml: "${key}" は必須`);
	if (!GROUPS.includes(doc.group))
		fail(`commands/${name}.yaml: group "${doc.group}" は ${GROUPS.join("/")} のいずれか`);
	for (const [key, fields] of [["options", ["flag", "desc"]], ["examples", ["cmd", "desc"]]]) {
		if (doc[key] === undefined) continue;
		if (!Array.isArray(doc[key])) fail(`commands/${name}.yaml: "${key}" は配列`);
		else
			for (const [i, o] of doc[key].entries())
				for (const f of fields)
					if (typeof o?.[f] !== "string") fail(`commands/${name}.yaml: ${key}[${i}].${f} は必須`);
	}
	commands.push(doc);
}

// --- articles/*.md (frontmatter + 本文) ---
function splitFrontmatter(text, ctx) {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) {
		fail(`${ctx}: frontmatter (--- で囲む) が無い`);
		return null;
	}
	return { meta: load(m[1]), body: m[2].trim() };
}

const articles = [];
for (const slug of index.articles) {
	let text;
	try {
		text = readFileSync(join(contentDir, "articles", `${slug}.md`), "utf-8");
	} catch (e) {
		fail(`articles/${slug}.md が読めない: ${e.message}`);
		continue;
	}
	const parsed = splitFrontmatter(text, `articles/${slug}.md`);
	if (!parsed) continue;
	const { meta, body } = parsed;
	for (const key of ["title", "summary"])
		if (typeof meta?.[key] !== "string" || !meta[key]) fail(`articles/${slug}.md: "${key}" は必須`);
	if (!Array.isArray(meta?.categories) || meta.categories.length === 0)
		fail(`articles/${slug}.md: "categories" は1件以上の配列`);
	else
		for (const c of meta.categories)
			if (!SCENARIO_CATEGORIES.includes(c))
				fail(`articles/${slug}.md: category "${c}" は ${SCENARIO_CATEGORIES.join("/")} のいずれか`);
	if (!body) fail(`articles/${slug}.md: 本文が空`);
	articles.push({ slug, ...meta, body });
}

// --- glossary.yaml ---
let terms = [];
try {
	const glossary = readYaml("glossary.yaml");
	if (!glossary || !Array.isArray(glossary.terms)) fail("glossary.yaml: terms の配列が必要");
	else {
		terms = glossary.terms;
		for (const [i, term] of terms.entries())
			for (const key of ["term", "def"])
				if (typeof term?.[key] !== "string" || !term[key]) fail(`glossary.yaml: terms[${i}].${key} は必須`);
	}
} catch (e) {
	fail(`glossary.yaml が読めない: ${e.message}`);
}

// --- scenarios/ (逆引きマップ用のメタ) ---
const scenarioIndex = load(readFileSync(join(root, "scenarios", "index.yaml"), "utf-8"));
const scenarios = scenarioIndex.scenarios.map((id) => {
	const m = load(readFileSync(join(root, "scenarios", id, "manifest.yaml"), "utf-8"));
	return { id, title: m.title, category: m.category };
});
const scenarioIds = new Set(scenarios.map((s) => s.id));

// --- 相互参照の検証 ---
// related_commands / related_articles は content 内で閉じるので不整合はエラー。
// related_scenarios はシナリオ側の増減に引きずられないよう警告に留める (該当分は無視)。
const commandNames = new Set(commands.map((c) => c.name));
const articleSlugs = new Set(articles.map((a) => a.slug));

function checkRefs(ctx, doc) {
	for (const ref of doc.related_commands ?? [])
		if (!commandNames.has(ref)) fail(`${ctx}: related_commands "${ref}" が存在しない`);
	for (const ref of doc.related_articles ?? [])
		if (!articleSlugs.has(ref)) fail(`${ctx}: related_articles "${ref}" が存在しない`);
	const valid = [];
	for (const ref of doc.related_scenarios ?? []) {
		if (scenarioIds.has(ref)) valid.push(ref);
		else warnings.push(`${ctx}: related_scenarios "${ref}" が存在しないため無視`);
	}
	doc.related_scenarios = valid;
}
for (const c of commands) checkRefs(`commands/${c.name}.yaml`, c);
for (const a of articles) checkRefs(`articles/${a.slug}.md`, a);
for (const [i, term] of terms.entries()) checkRefs(`glossary.yaml terms[${i}]`, term);

if (errors.length) {
	console.error(`content の検証に失敗 (${errors.length} 件):`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}
for (const w of warnings) console.warn(`warn: ${w}`);

// --- シナリオ → 解説の逆引きマップ ---
// 記事: categories がシナリオの category と一致 + 明示 related_scenarios。
// コマンド: 明示 related_scenarios のみ (カテゴリ自動対応はノイズが多すぎる)。
const byScenario = {};
for (const s of scenarios) {
	const refs = [];
	for (const a of articles)
		if (a.categories.includes(s.category) || a.related_scenarios.includes(s.id))
			refs.push({ type: "article", id: a.slug, title: a.title });
	for (const c of commands)
		if (c.related_scenarios.includes(s.id)) refs.push({ type: "command", id: c.name, title: c.name });
	if (refs.length) byScenario[s.id] = refs;
}

// --- 全文検索インデックス ---
// markdown 記法を軽く落として検索スニペットを読みやすくする
function plainText(md) {
	return md
		.replace(/```[^\n]*\n/g, "")
		.replace(/[`#*_|]/g, "")
		.replace(/^-{3,}\s*$/gm, "")
		.replace(/\s+/g, " ")
		.trim();
}

const docs = [
	...commands.map((c) => ({
		type: "command",
		id: c.name,
		title: c.name,
		summary: c.summary,
		group: c.group,
		text: plainText(
			[
				c.synopsis,
				...(c.options ?? []).map((o) => `${o.flag} ${o.desc}`),
				...(c.examples ?? []).map((e) => `${e.cmd} ${e.desc}`),
				c.note ?? ""
			].join(" ")
		)
	})),
	...articles.map((a) => ({
		type: "article",
		id: a.slug,
		title: a.title,
		summary: a.summary,
		categories: a.categories,
		order: a.order ?? 999,
		text: plainText(a.body)
	})),
	...terms.map((term) => ({
		type: "term",
		id: term.term,
		title: term.term,
		summary: term.def.trim(),
		text: plainText(`${term.reading ?? ""} ${term.def}`)
	}))
];

const out = {
	docs,
	byScenario,
	scenarioTitles: Object.fromEntries(scenarios.map((s) => [s.id, s.title]))
};
writeFileSync(join(contentDir, "search-index.json"), JSON.stringify(out));
console.log(
	`content/search-index.json: commands=${commands.length} articles=${articles.length} terms=${terms.length} byScenario=${Object.keys(byScenario).length}`
);
