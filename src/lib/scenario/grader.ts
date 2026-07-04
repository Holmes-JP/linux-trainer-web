// check の判定契約の評価 (Spec.md §4.3)。純粋関数。
import type { Check, CheckResult } from "./types";

/**
 * 1つの check の実行結果 (exit code / stdout) を契約に照らして pass/fail を決める。
 * 優先度順: expect_exit → expect_stdout_contains → expect_stdout_regex → expect_stdout_equals。
 * 最初に指定されているキーのみを使用する。
 */
export function evaluate(check: Check, exitCode: number, stdout: string): CheckResult {
	let pass: boolean;
	if (check.expect_exit !== undefined) {
		pass = exitCode === check.expect_exit;
	} else if (check.expect_stdout_contains !== undefined) {
		pass = stdout.includes(check.expect_stdout_contains);
	} else if (check.expect_stdout_regex !== undefined) {
		pass = new RegExp(check.expect_stdout_regex).test(stdout);
	} else if (check.expect_stdout_equals !== undefined) {
		pass = stdout.trim() === check.expect_stdout_equals;
	} else {
		// 判定キーが1つも無い manifest は不正。安全側に倒して fail
		pass = false;
	}
	return { description: check.description, pass, exitCode, stdout };
}
