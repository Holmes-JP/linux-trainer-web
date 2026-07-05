---
title: プロセスとシグナル
summary: プログラムが「動いている」とはどういうことか。PID・親子関係・シグナルによる制御を理解する
categories: [processes, services]
related_commands: [ps, kill]
order: 20
---

## プロセス = 実行中のプログラム

ディスク上のプログラム (ファイル) を実行すると、メモリ上に **プロセス** が生まれる。同じプログラムから複数のプロセスが同時に動くこともある (例: nginx のワーカーが4つ)。

すべてのプロセスには **PID (プロセスID)** という一意な番号が振られる。`ps aux` で一覧できる。

```
USER   PID %CPU %MEM COMMAND
root     1  0.0  0.1 init
user   214 99.0  0.5 /usr/local/bin/batch.sh
```

- **USER** — そのプロセスを動かしているユーザー。プロセスはこのユーザーの権限で動く
- **%CPU** — CPU の使用率。100% 近くに張り付いていたら暴走を疑う
- **COMMAND** — 起動されたコマンド。素性を知る手がかり

<figure class="diagram">
<svg viewBox="0 0 600 220" role="img" aria-label="プロセスの親子関係とシグナルの図">
<defs><marker id="sigArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<rect x="225" y="16" width="150" height="36" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="300" y="39" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">init (PID 1)</text>
<line x1="300" y1="52" x2="300" y2="82" stroke="var(--border)"/>
<rect x="225" y="82" width="150" height="36" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="300" y="105" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">bash (シェル)</text>
<path d="M300 118 L300 138 L180 138 L180 152" fill="none" stroke="var(--border)"/>
<path d="M300 138 L420 138 L420 152" fill="none" stroke="var(--border)"/>
<rect x="110" y="152" width="140" height="36" rx="8" fill="var(--track)" stroke="var(--accent)" stroke-width="2"/>
<text class="mono" x="180" y="175" text-anchor="middle" font-size="13" fill="var(--text)">sleep 9999</text>
<rect x="350" y="152" width="140" height="36" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="420" y="175" text-anchor="middle" font-size="13" fill="var(--text)">grep foo</text>
<text class="mono" x="55" y="150" text-anchor="middle" font-size="12" fill="var(--accent)">kill -TERM</text>
<line x1="55" y1="158" x2="108" y2="170" stroke="var(--accent)" marker-end="url(#sigArrow)"/>
<text x="55" y="186" text-anchor="middle" font-size="10.5" fill="var(--dim)">シグナルを送る</text>
</svg>
<figcaption>図: プロセスは init を頂点に親子で連なる。kill は特定の PID へシグナルを届ける</figcaption>
</figure>

## 親子関係

プロセスは必ず別のプロセスから生み出される (親子関係)。家系図の頂点が PID 1 の **init** で、シェルでコマンドを打つと「シェルの子プロセス」として実行される。親を調べたいときは `ps -ef` の PPID 列を見る。

## シグナル = プロセスへの割り込み通知

動いているプロセスに外から働きかける手段が **シグナル** だ。`kill` コマンドで送る (「殺す」という名前だが実態は「シグナル送信」)。

| シグナル | 番号 | 意味 |
|---|---|---|
| `TERM` | 15 | 終了してほしい (後片付けの猶予あり)。`kill PID` の既定 |
| `KILL` | 9 | 強制終了。プロセスは無視できないが、後片付けもできない |
| `HUP` | 1 | 切断通知。デーモンでは「設定を再読み込みせよ」の意味に使われることが多い |
| `INT` | 2 | 割り込み。ターミナルの Ctrl+C が送るのはこれ |

基本の作法は **まず TERM、効かなければ KILL**。いきなり `kill -9` すると、一時ファイルの掃除やデータの書き出しが行われないまま消えるため、最終手段にとどめる。

## トラブル対応の型

1. `ps aux` で全体を眺める (%CPU が異常なもの、見覚えのないものを探す)
2. `ps aux | grep 名前` や `pgrep -a 名前` で狙いを絞り、PID を控える
3. `kill PID` → 少し待って `ps` で確認 → まだ生きていれば `kill -9 PID`
4. 何かのサービスのプロセスだった場合は、止めた後に正規の手順 (`service 名前 start`) で起動し直す
