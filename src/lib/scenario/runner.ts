// control channel での setup/check 実行 (Spec.md §5.1)。
//
// M0 で実機確認済みのパターン (static/m0.html):
//  - 対話ターミナルのプロセスと並行して cx.run() を呼べる
//  - exit code は cx.run() の戻り値 { status }
//  - stdout は「/ctrl にマウントした IDBDevice へリダイレクト → readFileAsBlob()」で回収
//    (CheerpX 公式 docs 推奨。コンソールはシステム全体で共有のため per-process 取得は不可)
import { evaluate } from "./grader";
import type { Scenario, ExecResult, CheckResult } from "./types";

// CheerpX の公式 d.ts は最小限のため、必要な表面だけをここで型付けする
interface CheerpXLinux {
	run(
		fileName: string,
		args: string[],
		opts?: { env?: string[]; cwd?: string; uid?: number; gid?: number }
	): Promise<{ status: number }>;
}
interface CheerpXIDBDevice {
	readFileAsBlob(path: string): Promise<Blob>;
}

const ROOT_ENV = [
	"HOME=/root",
	"TERM=xterm",
	"USER=root",
	"SHELL=/bin/bash",
	"PATH=/usr/sbin:/usr/bin:/sbin:/bin",
	"LANG=en_US.UTF-8",
	"LC_ALL=C"
];
const USER_ENV = [
	"HOME=/home/user",
	"TERM=xterm",
	"USER=user",
	"SHELL=/bin/bash",
	"PATH=/usr/local/bin:/usr/bin:/bin",
	"LANG=en_US.UTF-8",
	"LC_ALL=C"
];

/** 1コマンドあたりの実行タイムアウト (ミリ秒)。暴走コマンドで UI が固まるのを防ぐ */
const EXEC_TIMEOUT_MS = 30000;
/** タイムアウト時に返す合成 exit code (GNU timeout 準拠) */
const EXIT_TIMEOUT = 124;

export class ControlChannel {
	private cx: CheerpXLinux;
	private ctrlDevice: CheerpXIDBDevice;
	private seq = 0;

	constructor(cx: CheerpXLinux, ctrlDevice: CheerpXIDBDevice) {
		this.cx = cx;
		this.ctrlDevice = ctrlDevice;
	}

	/**
	 * 隠しプロセスを1つ起動する。コンソール共有によるノイズ対策として、
	 * 外側は /bin/sh (dash: ジョブ制御を行わないため無音)、内側の bash は
	 * stderr をリダイレクトして起動時警告 (initialize_job_control) を漏らさない。
	 * cmd は sh の "$0" 引数として渡すのでクォートのエスケープが不要。
	 * 注意: cmd 自身の stderr も破棄される。stderr を判定に使いたい場合は
	 * manifest 側で明示的に `2>&1` を書くこと (判定契約は stdout ベース: Spec.md §4.3)。
	 */
	private runQuiet(
		cmd: string,
		redirect: string,
		opts: { env: string[]; cwd: string; uid: number; gid: number }
	): Promise<{ status: number }> {
		const run = this.cx.run("/bin/sh", ["-c", `bash -c "$0" ${redirect}`, cmd], opts);
		// タイムアウトで固まらないよう race する。時間切れ時は合成 exit code を返す
		// (元プロセスは残り続けるが UI は先へ進める)。
		const timeout = new Promise<{ status: number }>((resolve) =>
			setTimeout(() => resolve({ status: EXIT_TIMEOUT }), EXEC_TIMEOUT_MS)
		);
		return Promise.race([run, timeout]);
	}

	/**
	 * コマンドを隠しプロセスで実行し、exit code と stdout を返す。
	 *
	 * root: 直接 /ctrl へリダイレクトして回収する。
	 * user: uid 1000 のプロセスとして直接起動する (su は使わない — su 経由の bash が
	 *       ジョブ制御の警告をユーザーの共有コンソールに漏らすため)。/ctrl は root 所有で
	 *       user から書けないので、いったん /tmp に書き、root の後続プロセスで /ctrl へ移す。
	 */
	async exec(cmd: string, runAs: "root" | "user" = "root"): Promise<ExecResult> {
		const n = this.seq++;
		const outFile = `exec_${n}.out`;
		const rootOpts = { env: ROOT_ENV, cwd: "/root", uid: 0, gid: 0 };
		let status: number;
		if (runAs === "user") {
			const tmpFile = `/tmp/.ctrl_user_${n}.out`;
			const r = await this.runQuiet(cmd, `> ${tmpFile} 2>/dev/null`, {
				env: USER_ENV,
				cwd: "/home/user",
				uid: 1000,
				gid: 1000
			});
			status = r.status;
			await this.runQuiet(
				`cat ${tmpFile} > /ctrl/${outFile} 2>/dev/null; rm -f ${tmpFile}`,
				`> /dev/null 2>/dev/null`,
				rootOpts
			);
		} else {
			const r = await this.runQuiet(cmd, `> /ctrl/${outFile} 2>/dev/null`, rootOpts);
			status = r.status;
		}
		let stdout = "";
		try {
			stdout = await (await this.ctrlDevice.readFileAsBlob("/" + outFile)).text();
		} catch {
			// コマンドがリダイレクト前に落ちた場合など。stdout 無しとして扱う
		}
		return { exitCode: status, stdout };
	}
}

/** setup を順番に流して箱を「壊す」。各 cmd は冪等前提 (Spec.md §4.4) */
export async function runSetup(channel: ControlChannel, scenario: Scenario): Promise<void> {
	for (const step of scenario.setup) {
		const r = await channel.exec(step.cmd, "root");
		if (r.exitCode !== 0) {
			// setup の失敗はシナリオ不成立なので明示的に落とす
			throw new Error(
				`setup failed: ${step.description} (exit=${r.exitCode})\n${r.stdout}`
			);
		}
	}
}

/** 全 check を実行して項目別の結果を返す。合否は「最終状態」のみで決まる (Spec.md §4.4) */
export async function runChecks(
	channel: ControlChannel,
	scenario: Scenario
): Promise<CheckResult[]> {
	const results: CheckResult[] = [];
	for (const check of scenario.check) {
		const r = await channel.exec(check.test, check.run_as ?? "root");
		results.push(evaluate(check, r.exitCode, r.stdout));
	}
	return results;
}
