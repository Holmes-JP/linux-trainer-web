// シナリオ manifest の型定義 (Spec.md §4)。
// M1 ではハードコードした Scenario オブジェクトを使い、M2 で YAML ローダーがこの型に parse する。

export type Difficulty = "easy" | "medium" | "hard";

export type Category =
	| "filesystem"
	| "permissions"
	| "processes"
	| "disk"
	| "services"
	| "logs";

export interface SetupStep {
	description: string;
	/** root で実行される。冪等であること (Spec.md §4.4) */
	cmd: string;
}

/** check の判定契約 (Spec.md §4.3)。優先度順に最初に指定されたキーで判定する */
export interface Check {
	description: string;
	/** VM 内で実行するコマンド */
	test: string;
	/** exit code が一致すれば pass */
	expect_exit?: number;
	/** 標準出力に部分文字列を含めば pass */
	expect_stdout_contains?: string;
	/** 標準出力が正規表現にマッチすれば pass */
	expect_stdout_regex?: string;
	/** 標準出力 (trim 後) が完全一致で pass */
	expect_stdout_equals?: string;
	/** 実行ユーザー。既定は root */
	run_as?: "root" | "user";
}

export interface Scenario {
	id: string;
	title: string;
	difficulty: Difficulty;
	category: Category;
	time_estimate_min?: number;
	description: string;
	setup: SetupStep[];
	check: Check[];
	hints?: string[];
	solution?: string;
}

export interface ExecResult {
	exitCode: number;
	stdout: string;
}

export interface CheckResult {
	description: string;
	pass: boolean;
	exitCode: number;
	stdout: string;
}
