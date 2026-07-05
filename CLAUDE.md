# CLAUDE.md — Linux学習環境 (Web版)

> Claude Code への作業指示書。設計の全体は `Spec.md` を参照。本書は **どう進めるか (順序・規約・ガードレール)** に絞る。

---

## プロジェクト概要

こちらが用意したシナリオ (壊れた Linux サーバー) を、ユーザーがブラウザ上で調査・修復し、修復できたかを自動採点する学習環境。**Mini.WebVM を fork** し、その上に「シナリオのライフサイクル (setup で壊す → ユーザーが直す → check で採点)」を実装する。

**重要な前提**: ブラウザで Linux を動かす部分は WebVM/CheerpX が解決済み。**そこは実装しない。** 実装するのは Scenario Loader / Runner / Grader / UI パネル / Progress の 5 つ (`src/lib/scenario/`, `src/lib/components/`, `src/lib/stores/`)。

---

## 最優先の作業順序 (Prime Directives)

**縦切り優先。広げる前に串を通す。** マイルストーンの詳細は Spec.md §8。

### 1. M0 (検証スパイク) を最初に。これが済むまでシナリオ機能を書かない。

実機で次を確認する (Spec.md §9):

- **(R1) systemd が init (PID 1) で動くか。** Docker 由来イメージは通常 systemd を動かさない。動かないなら services/logs 系は成立しない。**動くか動かないかを実際に起動して確認し、結果を報告してから設計を確定する。** 動かない場合は Spec.md §9 R1 の代替 (filesystem/permissions/processes/disk を先行) に切り替える。
- **(R2) CheerpX の programmatic 実行 API。** setup/check を対話ターミナルと分離して実行できるか。**公式 docs と Mini.WebVM の実ソースを読んで確認する。API を推測でコードに書かない。** 独立プロセス API が無ければ sentinel 方式 (Spec.md §5.2) にフォールバック。
- **(R3) COOP/COEP。** CheerpX は SharedArrayBuffer に依存。`Cross-Origin-Opener-Policy: same-origin` と `Cross-Origin-Embedder-Policy: require-corp` を dev サーバーで設定し、ブラウザで CheerpX 初期化が通ることを確認。
- **(R4)** fork がビルドでき、ブラウザで Debian が起動する。

### 2. M1 (縦切り1本) を次に。ここが本当の勝負。

- **ハードコードした 1 シナリオ**で「boot → setup で壊す → ユーザーが直す → Check で ✅」の一周を通す。
- YAML も UI パネルもまだ作り込まない。最小の配線で一周を通すことだけに集中。
- **ここで control channel パターン (Spec.md §5.1) を確立する。** これが通れば残りは量産、通らなければ設計に穴がある — という試金石。

### 3. 通ってから広げる。

M2 (YAML 外部化) → M3 (UI) → M4 (選択 + 進捗) → M5 (量産)。Spec.md §8 の順に。

---

## 6つの鉄則 (シナリオ実装・manifest 作成で必ず守る)

1. **冪等性 (idempotent)**: `setup`/`check` は二重実行されても壊れない。既存「やられサーバー」流儀を踏襲: `id user || useradd`、`REPLACE INTO`、`[ -f backup ] || cp`。ブラウザ reload / 再挑戦で setup が再走しても安全に。
2. **最終状態で判定**: check はユーザーのコマンド履歴を見ない。`systemctl is-active ssh` のような**現在の状態**で判定する。直し方は何通りあってよい。
3. **1シナリオ完走を最初に**: 量産前に最小シナリオで一周 (M1)。
4. **ミッション文と check を1対1で対応させる** (2025-07 の監査で log-flood 型の乖離が多数見つかった教訓):
   - check が pass にする解法 (削除・切り詰めなど複数経路) は description に**明記**する。「整理せよ」「修復せよ」のような曖昧な動詞だけにしない。削除で通るなら「削除してよい」と書き、その世界観の裏付け (アプリは停止済み等) も添える。
   - 逆に description が示唆する制約 (「××は残す」「他の設定は変えない」) は**必ず check で強制**する。特に「rm で全部消す」「ファイルを空にして作り直す」といった破壊的な最短解で pass してしまわないか自問し、必要なら保持チェック (ファイル存在 / 内容 grep) を追加する。
   - description に書いた世界の設定 (「アプリが書き込み続けている」等) が VM 内で観測できない場合は、「〜という想定」と明示するか、観測可能な状態を setup で作る。嘘の状況説明をしない。
5. **description / solution の改行は意図した位置だけ**: UI (ScenarioPanel) は `white-space:pre-line` で改行をそのまま表示する。文の途中で折り返しの改行を入れない。改行してよいのは「文末 (。)」「リスト項目」「インデントしたコード行」のみ。1文が長くなっても1行に書く (画面側で折り返される)。
6. **教える内容に矛盾を作らない**: 別シナリオで「危険」と教える操作 (chmod 777/666、部分一致の pkill 等) を hints/solution で無条件に推奨しない。代替として挙げる場合は「実運用では避ける」等の注意書きを添える。

---

## 技術スタック / 規約

- **言語**: TypeScript。
- **フレームワーク**: Svelte + SvelteKit (fork 準拠)、static adapter で完全クライアントサイド。
- **YAML parse**: js-yaml。
- **状態管理**: Svelte stores + localStorage。**MVP はバックエンドを足さない。**
- **ターミナル**: xterm.js (fork 同梱、触らない)。
- **エンジン**: CheerpX (NPM)。**バージョンは immutable build を明示的に固定** (latest を使わない。Mini.WebVM の推奨に従う)。
- コメント・ドキュメント文字列は日本語可、コード識別子・コマンドは英語。

### manifest スキーマ

Spec.md §4 が正。`{ id, title, difficulty, category, time_estimate_min, description, setup[], check[], hints[], solution }`。check の判定契約 (`expect_exit` / `expect_stdout_contains` / `expect_stdout_regex` / `expect_stdout_equals`) は Spec.md §4.3。

---

## やってはいけないこと (Guardrails)

- ❌ **CheerpX の API を推測で書く。** 必ず実ソース/docs を読む (R2)。不明なまま実装を進めない。
- ❌ **縦切り (M1) の前に UI やディレクトリ構造を作り込む。** 一周を通すのが先。
- ❌ **バックエンド・DB・認証を足す。** MVP は localStorage のみ (Spec.md §1.3)。
- ❌ **systemd 前提のシナリオを、R1 の確認前に量産する。** 動作未確認の土台に乗せない。
- ❌ **Layer 2 (セキュリティ/ローカルVM) の要素を混ぜる。** 本リポジトリは Layer 1 のみ。
- ❌ **ネットワーク系シナリオを作る。** ブラウザ制約により非スコープ (Spec.md §9 R6)。
- ❌ **CheerpX ビルドを勝手に別ホストへ再配布する。** ライセンス違反 (Spec.md §10)。個人利用の GitHub Pages 範囲に留める。
- ❌ **fork 由来のターミナル/VM ライフサイクルの中核を作り替える。** 追加は `src/lib/scenario/` 等の新規領域で行い、既存に手を入れるのは最小限に。

---

## ビルド / 実行コマンド

(M0 で確定済み。fork = leaningtech/webvm)

```bash
# 依存関係
npm install

# 開発サーバー (localhost:5173。COOP/COEP は vite.config.js のミドルウェアが自動付与)
npm run dev

# 本番ビルド (static adapter → build/)
npm run build
```

- **ベースイメージのビルド**: ローカルコマンドではなく **GitHub Actions** (`.github/workflows/deploy.yml` を workflow_dispatch で手動実行)。`dockerfiles/debian_large` 等の Dockerfile → i386 コンテナ → ext2 イメージ化 → 128KB チャンク分割 → GitHub Pages 配信、までを一括で行う。ローカル開発では公開イメージ (`wss://disks.webvm.io/debian_buster_large_permis_fixed_*.ext2`、`config_public_terminal.js` で指定) をそのまま使う。
- **COOP/COEP (R3)**: dev/preview は `vite.config.js` の `crossOriginIsolationPlugin` が全レスポンスに付与 (確認済み)。本番 GitHub Pages は fork 同梱の `serviceWorker.js` がヘッダを注入する。
- **fork に加えた dev 動作修正** (upstream は `vite dev` を想定していない): `/config_terminal` alias の絶対パス化、`server.fs.allow: ['.']`、`optimizeDeps.exclude: ["@leaningtech/cheerpx"]` (top-level await 対策)。いずれも vite.config.js。
- **CheerpX は 1.3.5 に固定** (package.json)。npm パッケージは実体を `https://cxrtnc.leaningtech.com/1.3.5/cx.esm.js` から動的 import する構造。
- **テスト**: `npm test` (vitest)。E2E は dev 起動後 `M0_PORT=<port> node scripts/<name>.mjs` (`scenario-smoke.mjs` / `play-e2e.mjs` / `m5-e2e.mjs`)。
- 実装状況・CheerpX の実行制約の詳細は `README-trainer.md` を参照。

---

## テスト方針

- **M1 まで**: 手動確認が中心 (一周が通るか)。自動テストで時間を溶かさない。
- **grader.ts (§4.3 の判定ロジック)**: 純粋関数なので **ユニットテストを書く**価値が高い (exit code / stdout の各契約が正しく pass/fail を返すか)。
- **loader.ts**: 代表 manifest の parse が期待する Scenario 型になるかを軽くテスト。
- CheerpX 依存部分 (runner の実行) は実ブラウザでの手動確認。ヘッドレス自動化は MVP では追わない。

---

## 進捗の報告

- M0 の各項目 (特に R1 systemd, R2 CheerpX API) は、**確認結果を明示的に報告**してから次へ進む。想定と違えば設計 (Spec.md §9 の分岐) に沿って方針を変える。
- 不明点や Spec と実装の乖離が出たら、勝手に埋めずに確認する。
