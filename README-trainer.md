# Linux トラブルシューティング演習 (Web版)

SadServers 風の Linux 学習環境。壊れた Debian サーバーをブラウザ上で調査・修復し、自動採点する。
[WebVM (CheerpX)](https://webvm.io) を fork し、その上に**シナリオのライフサイクル** (setup で壊す → ユーザーが直す → check で採点) を実装したもの。

設計の全体は [`Spec.md`](./Spec.md)、作業規約は [`CLAUDE.md`](./CLAUDE.md) を参照。
fork 元 (WebVM) の README は [`README.md`](./README.md)。

## 使い方 (開発)

```bash
npm install
npm run dev        # http://localhost:5173/ (→ /play にリダイレクト)
npm run build      # static (build/) — GitHub Pages 配信用
npm test           # vitest (grader / loader のユニットテスト)
```

`npm run dev` の COOP/COEP ヘッダは `vite.config.js` の `crossOriginIsolationPlugin` が自動付与する
(CheerpX の SharedArrayBuffer 要件)。本番 GitHub Pages は fork 同梱の `serviceWorker.js` が付与する。

ベースイメージ (Debian ext2) のビルドは GitHub Actions (`.github/workflows/deploy.yml`) を
workflow_dispatch で手動実行する。ローカル開発は公開イメージ (`config_public_terminal.js`) を使う。

## 画面

- `/play` … シナリオ一覧 (難易度・カテゴリ・完了バッジ・進捗)。トップ `/` はここへリダイレクト。
- `/play?id=<id>` … シナリオに挑戦。VM 起動 → setup で破壊 → ターミナルで修復 → Check で採点。
  Task / Check / Hint / Solution / Reset の各パネルを備える。完了は localStorage に保存。

## シナリオの追加

1. `scenarios/<id>/manifest.yaml` を作る (スキーマは Spec.md §4、既存シナリオが参考)。
2. `scenarios/index.yaml` の `scenarios:` に `<id>` を1行足す。
3. `M0_PORT=<dev-port> node scripts/scenario-smoke.mjs <id>` で
   「setup 成功 / 正しく壊れる / 模範修復で全 check ✅」を確認する
   (模範修復コマンドは `scripts/scenario-smoke.mjs` の `FIXES` に追記)。

### CheerpX 上でシナリオを書く際の制約 (実機検証済み)

- `/dev/zero` が無い → 大容量ファイルは `head -c N /dev/urandom`。
- パイプ (`yes|head`) や `for i in $(seq…)` ループは hang する → 避ける。
- `du -sh`/`du -sm` は常に 0 (ext2 が `st_blocks=0`) → 実サイズは `du -sb` / `ls -l`。
- 常駐プロセスは `setsid cmd </dev/null >/dev/null 2>&1 &` で起動する
  (`nohup &` や実デーモンの `service start` は即死)。ネットワーク bind するサービス (sshd) は不可。
- プロセス検出は `pgrep -x <comm>` (comm 完全一致)。`pgrep -f` は control channel の
  ラッパー自身に誤マッチする。デーモン本体と init スクリプトは別名にする。
- 非 root ユーザーは自分の所有ファイルでも `chmod` 不可 → 修復導線は `su root` (パスワード: `password`)。

## 中核の実装 (新規領域)

```
src/lib/scenario/
  types.ts      # Scenario / Check / Result 型
  loader.ts     # YAML manifest → Scenario (js-yaml, バリデーション付き)
  grader.ts     # check の判定契約 (§4.3) の評価。純粋関数
  runner.ts     # control channel での setup/check 実行 (CheerpX)
src/lib/components/   # TaskPanel / CheckPanel / HintPanel / SolutionPanel / ScenarioList / ScenarioPanel
src/lib/stores/progress.ts   # localStorage 永続化
src/routes/play/     # 一覧 + 挑戦ページ
scripts/             # Playwright ベースの E2E / smoke テスト
```

fork 由来のターミナル/VM ライフサイクル (`WebVM.svelte` 等) への変更は最小限
(`/ctrl` マウント、`cxReadyCallback` / `resetVM` の追加のみ)。

## テスト

- `npm test` … grader / loader のユニットテスト (vitest)。
- `scripts/scenario-smoke.mjs` … 全シナリオの壊れ方/解け方を control channel で検証。
- `scripts/play-e2e.mjs` … UI 一周 (選択→挑戦→完了→永続化)。
- `scripts/m5-e2e.mjs` … リダイレクトと Reset。

E2E は dev サーバー起動後 `M0_PORT=<port> node scripts/<name>.mjs` で実行
(ヘッドレス Chromium。`npx playwright install chromium` が必要)。
