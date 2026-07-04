// loader.ts (YAML → Scenario 型) のユニットテスト。
// 代表 manifest として実物の scenarios/locked-flag/manifest.yaml を parse する。
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseManifest, parseIndex } from "./loader";

const manifestPath = fileURLToPath(
	new URL("../../../scenarios/locked-flag/manifest.yaml", import.meta.url)
);

describe("parseManifest: 実物の manifest", () => {
	const scenario = parseManifest(readFileSync(manifestPath, "utf-8"));

	it("メタ情報が期待する Scenario 型になる", () => {
		expect(scenario.id).toBe("locked-flag");
		expect(scenario.title).toContain("flag.txt");
		expect(scenario.difficulty).toBe("easy");
		expect(scenario.category).toBe("permissions");
		expect(scenario.time_estimate_min).toBe(5);
		expect(scenario.description).toContain("/home/user/flag.txt");
	});

	it("setup が {description, cmd} の配列になる", () => {
		expect(scenario.setup).toHaveLength(1);
		expect(scenario.setup[0].cmd).toContain("chmod 000");
	});

	it("check が判定契約付きで parse される", () => {
		expect(scenario.check).toHaveLength(2);
		expect(scenario.check[0].expect_exit).toBe(0);
		expect(scenario.check[0].run_as).toBe("user");
		expect(scenario.check[1].expect_stdout_contains).toBe("FLAG{M1-VERTICAL-SLICE-OK}");
	});

	it("hints / solution が読める", () => {
		expect(scenario.hints).toHaveLength(3);
		expect(scenario.solution).toContain("chmod 644");
	});

	it("verify_fix (模範修復) が読める", () => {
		expect(scenario.verify_fix).toBe("chmod 644 /home/user/flag.txt");
	});
});

describe("parseManifest: バリデーション", () => {
	const valid = readFileSync(manifestPath, "utf-8");

	it("必須フィールド欠落で throw する (id)", () => {
		expect(() => parseManifest(valid.replace(/^id: .*$/m, ""))).toThrow(/invalid manifest/);
	});
	it("difficulty の値域を検証する", () => {
		expect(() => parseManifest(valid.replace("difficulty: easy", "difficulty: insane"))).toThrow(
			/difficulty/
		);
	});
	it("check に判定キーが無ければ throw する", () => {
		expect(() =>
			parseManifest(valid.replace('expect_exit: 0\n    run_as: user', 'run_as: user'))
		).toThrow(/判定キー/);
	});
	it("トップレベルがオブジェクトでなければ throw する", () => {
		expect(() => parseManifest("just a string")).toThrow(/invalid manifest/);
	});
});

describe("parseIndex", () => {
	it("実物の index.yaml から id 一覧を返す", () => {
		const indexPath = fileURLToPath(new URL("../../../scenarios/index.yaml", import.meta.url));
		const ids = parseIndex(readFileSync(indexPath, "utf-8"));
		expect(ids).toContain("locked-flag");
		expect(ids.length).toBeGreaterThanOrEqual(5);
		// 各 id の manifest が実在し、id が一致することも確認
		for (const id of ids) {
			const p = fileURLToPath(new URL(`../../../scenarios/${id}/manifest.yaml`, import.meta.url));
			expect(parseManifest(readFileSync(p, "utf-8")).id).toBe(id);
		}
	});
	it("scenarios キーが無ければ throw する", () => {
		expect(() => parseIndex("foo: bar")).toThrow(/scenarios/);
	});
});
