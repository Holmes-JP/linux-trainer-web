// grader.ts (Spec.md §4.3 の判定契約) のユニットテスト
import { describe, it, expect } from "vitest";
import { evaluate } from "./grader";
import type { Check } from "./types";

const base = { description: "t", test: "true" };

describe("evaluate: expect_exit", () => {
	it("exit code が一致すれば pass", () => {
		const c: Check = { ...base, expect_exit: 0 };
		expect(evaluate(c, 0, "").pass).toBe(true);
	});
	it("exit code が不一致なら fail", () => {
		const c: Check = { ...base, expect_exit: 0 };
		expect(evaluate(c, 1, "").pass).toBe(false);
	});
	it("0 以外の期待値も判定できる", () => {
		const c: Check = { ...base, expect_exit: 42 };
		expect(evaluate(c, 42, "").pass).toBe(true);
	});
});

describe("evaluate: expect_stdout_contains", () => {
	it("部分文字列を含めば pass", () => {
		const c: Check = { ...base, expect_stdout_contains: "active" };
		expect(evaluate(c, 3, "service is active\n").pass).toBe(true);
	});
	it("含まなければ fail", () => {
		const c: Check = { ...base, expect_stdout_contains: "active" };
		expect(evaluate(c, 0, "inact--ive").pass).toBe(false);
	});
});

describe("evaluate: expect_stdout_regex", () => {
	it("正規表現にマッチすれば pass", () => {
		const c: Check = { ...base, expect_stdout_regex: "^uid=\\d+" };
		expect(evaluate(c, 0, "uid=1000(user)").pass).toBe(true);
	});
	it("マッチしなければ fail", () => {
		const c: Check = { ...base, expect_stdout_regex: "^uid=\\d+$" };
		expect(evaluate(c, 0, "gid=1000").pass).toBe(false);
	});
});

describe("evaluate: expect_stdout_equals", () => {
	it("trim 後の完全一致で pass", () => {
		const c: Check = { ...base, expect_stdout_equals: "ok" };
		expect(evaluate(c, 0, "  ok\n").pass).toBe(true);
	});
	it("部分一致では fail", () => {
		const c: Check = { ...base, expect_stdout_equals: "ok" };
		expect(evaluate(c, 0, "ok but more").pass).toBe(false);
	});
});

describe("evaluate: 優先順位と異常系", () => {
	it("複数キーがある場合は expect_exit を優先する", () => {
		// exit は一致 / contains は不一致 → expect_exit だけで判定され pass
		const c: Check = { ...base, expect_exit: 0, expect_stdout_contains: "absent" };
		expect(evaluate(c, 0, "something else").pass).toBe(true);
	});
	it("判定キーが無ければ安全側に倒して fail", () => {
		const c: Check = { ...base };
		expect(evaluate(c, 0, "anything").pass).toBe(false);
	});
	it("結果に exit code と stdout を保持する (UI 表示用)", () => {
		const c: Check = { ...base, expect_exit: 0 };
		const r = evaluate(c, 7, "boom");
		expect(r.exitCode).toBe(7);
		expect(r.stdout).toBe("boom");
		expect(r.description).toBe("t");
	});
});
