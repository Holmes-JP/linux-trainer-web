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

## 画面 (3段フロー)

- `/play` … シナリオ一覧。難易度/カテゴリのフィルタ、検索、ランダム挑戦、進捗ダッシュボード
  (最短クリア時間つき)、進捗リセット、ライト/ダークテーマ切り替え。トップ `/` はここへリダイレクト。
- `/play?id=<id>` … シナリオ詳細 (状況 / 想定コマンド / 攻略のコツ / 起動ボタン)。VM は起動しない。
- `/play?id=<id>&start=1` … 挑戦。VM 起動 → setup で破壊 → ターミナルで修復 → Check で採点。
  Task / Check / Hint / Solution / Reset パネル + ライブタイマー + パネル折りたたみ。`Ctrl+Enter` で採点。
  完了 (最短時間つき) は localStorage に保存。モバイルではターミナルとパネルが縦積みになる。

## デプロイ (GitHub Pages)

`.github/workflows/pages.yml` を **手動発火 (workflow_dispatch)** すると `npm run build` → `build/` を Pages に公開する。
注意:

- 無料 Pages は **Public リポジトリ**が必要 (本リポジトリを Public 化する、または Pages 対応プラン)。
- `github.io/<repo>/` のサブパス配信では、アプリが絶対パス (`/play`, `/scenarios/…`) を使うため
  `svelte.config.js` に `kit.paths.base` の設定が必要。**独自ドメイン (root 配信) ならそのまま動く**。
- COOP/COEP は Pages がヘッダを付けられないため、fork 同梱の `serviceWorker.js` が注入する (`app.html` で登録済み)。
- ディスクイメージ (Debian ext2) は `config_public_terminal.js` の公開 URL (`disks.webvm.io`) を参照する。
  自前配信に切り替える場合は fork README の "Local Serving" を参照。

## PWA

`static/trainer.webmanifest` によりインストール可能 (ホーム追加 / スタンドアロン起動)。
ただし VM ディスクは配信サーバー依存のため **完全オフラインでは動かない** (アプリ shell のみ)。

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
