// YAML manifest → Scenario 型 (Spec.md §4)。
// parseManifest は純粋関数 (テスト対象)。loadScenario が fetch を担う。
import { load } from "js-yaml";
import type { Scenario, SetupStep, Check, Difficulty, Category } from "./types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const CATEGORIES: Category[] = [
	"filesystem",
	"permissions",
	"processes",
	"disk",
	"services",
	"logs"
];
const EXPECT_KEYS = [
	"expect_exit",
	"expect_stdout_contains",
	"expect_stdout_regex",
	"expect_stdout_equals"
] as const;

class ManifestError extends Error {
	constructor(msg: string) {
		super(`invalid manifest: ${msg}`);
	}
}

function requireString(obj: Record<string, unknown>, key: string, ctx: string): string {
	const v = obj[key];
	if (typeof v !== "string" || v.length === 0)
		throw new ManifestError(`${ctx}: "${key}" は必須の文字列`);
	return v;
}

function parseSetup(raw: unknown): SetupStep[] {
	if (!Array.isArray(raw) || raw.length === 0)
		throw new ManifestError(`"setup" は1件以上の配列`);
	return raw.map((s, i) => {
		const o = s as Record<string, unknown>;
		return {
			description: requireString(o, "description", `setup[${i}]`),
			cmd: requireString(o, "cmd", `setup[${i}]`)
		};
	});
}

function parseCheck(raw: unknown): Check[] {
	if (!Array.isArray(raw) || raw.length === 0)
		throw new ManifestError(`"check" は1件以上の配列`);
	return raw.map((c, i) => {
		const o = c as Record<string, unknown>;
		const check: Check = {
			description: requireString(o, "description", `check[${i}]`),
			test: requireString(o, "test", `check[${i}]`)
		};
		if (!EXPECT_KEYS.some((k) => o[k] !== undefined))
			throw new ManifestError(`check[${i}]: 判定キー (${EXPECT_KEYS.join(" / ")}) が1つ必要`);
		if (o.expect_exit !== undefined) {
			if (typeof o.expect_exit !== "number")
				throw new ManifestError(`check[${i}]: "expect_exit" は整数`);
			check.expect_exit = o.expect_exit;
		}
		if (o.expect_stdout_contains !== undefined)
			check.expect_stdout_contains = String(o.expect_stdout_contains);
		if (o.expect_stdout_regex !== undefined)
			check.expect_stdout_regex = String(o.expect_stdout_regex);
		if (o.expect_stdout_equals !== undefined)
			check.expect_stdout_equals = String(o.expect_stdout_equals);
		if (o.run_as !== undefined) {
			if (o.run_as !== "root" && o.run_as !== "user")
				throw new ManifestError(`check[${i}]: "run_as" は root か user`);
			check.run_as = o.run_as;
		}
		return check;
	});
}

/** YAML テキストを parse し、Scenario 型として検証して返す。不正なら ManifestError を投げる */
export function parseManifest(yamlText: string): Scenario {
	const raw = load(yamlText);
	if (typeof raw !== "object" || raw === null)
		throw new ManifestError("トップレベルがオブジェクトではない");
	const o = raw as Record<string, unknown>;

	const difficulty = requireString(o, "difficulty", "manifest") as Difficulty;
	if (!DIFFICULTIES.includes(difficulty))
		throw new ManifestError(`"difficulty" は ${DIFFICULTIES.join("/")} のいずれか`);
	const category = requireString(o, "category", "manifest") as Category;
	if (!CATEGORIES.includes(category))
		throw new ManifestError(`"category" は ${CATEGORIES.join("/")} のいずれか`);

	const scenario: Scenario = {
		id: requireString(o, "id", "manifest"),
		title: requireString(o, "title", "manifest"),
		difficulty,
		category,
		description: requireString(o, "description", "manifest"),
		setup: parseSetup(o.setup),
		check: parseCheck(o.check)
	};
	if (o.time_estimate_min !== undefined)
		scenario.time_estimate_min = Number(o.time_estimate_min);
	if (o.hints !== undefined) {
		if (!Array.isArray(o.hints)) throw new ManifestError(`"hints" は文字列の配列`);
		scenario.hints = o.hints.map(String);
	}
	if (o.solution !== undefined) scenario.solution = String(o.solution);
	if (o.commands !== undefined) {
		if (!Array.isArray(o.commands)) throw new ManifestError(`"commands" は配列`);
		scenario.commands = o.commands.map((c, i) => {
			const co = c as Record<string, unknown>;
			return { cmd: requireString(co, "cmd", `commands[${i}]`), desc: requireString(co, "desc", `commands[${i}]`) };
		});
	}
	if (o.tips !== undefined) {
		if (!Array.isArray(o.tips)) throw new ManifestError(`"tips" は文字列の配列`);
		scenario.tips = o.tips.map(String);
	}
	if (o.verify_fix !== undefined) scenario.verify_fix = String(o.verify_fix);
	return scenario;
}

/** scenarios/index.yaml を parse してシナリオ id の一覧を返す */
export function parseIndex(yamlText: string): string[] {
	const raw = load(yamlText);
	const o = raw as Record<string, unknown> | null;
	if (!o || !Array.isArray(o.scenarios) || o.scenarios.length === 0)
		throw new ManifestError(`index.yaml: "scenarios" は1件以上の配列`);
	return o.scenarios.map(String);
}

/** 静的配信されたシナリオ一覧 (id の配列) を取得する */
export async function loadScenarioIndex(): Promise<string[]> {
	const res = await fetch("/scenarios/index.yaml");
	if (!res.ok) throw new Error(`failed to fetch scenarios/index.yaml: HTTP ${res.status}`);
	return parseIndex(await res.text());
}

/** 静的配信された manifest を取得して parse する (scenarios/<id>/manifest.yaml) */
export async function loadScenario(id: string): Promise<Scenario> {
	const url = `/scenarios/${id}/manifest.yaml`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`failed to fetch ${url}: HTTP ${res.status}`);
	const scenario = parseManifest(await res.text());
	if (scenario.id !== id)
		throw new ManifestError(`id "${scenario.id}" がディレクトリ名 "${id}" と一致しない`);
	return scenario;
}
