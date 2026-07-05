---
title: Linux の全体像 — カーネル・シェル・ユーザーランド
summary: ハードウェアからアプリまでの層構造と、カーネル・シェル・ユーザーランドの役割分担を掴む
categories: [filesystem]
related_commands: [uname, ps, lscpu, dmesg, free, mount]
order: 1
---

## Linux は「層」でできている

Linux は 1 枚岩のソフトではなく、役割の違う層が積み重なってできている。下から順にこうなっている。

| 層 | 中身 | 役割 |
|---|---|---|
| ハードウェア | CPU・メモリ・ディスク・NIC | 実際に計算・記憶・通信を行う物理装置 |
| カーネル | Linux 本体 | ハードウェアを直接握り、資源を管理・分配する中核 |
| システムコール | `open` `read` `fork` など | アプリがカーネルに仕事を頼むための「窓口」 |
| ライブラリ / シェル | libc・bash など | システムコールを使いやすくまとめた土台と操作環境 |
| アプリケーション | `ls`・エディタ・サーバ | ユーザーが実際に使うプログラム |

<figure class="diagram">
<svg viewBox="0 0 600 300" role="img" aria-label="Linux の層構造の図">
<rect x="30" y="14" width="540" height="42" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="300" y="32" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">アプリケーション</text>
<text x="300" y="48" text-anchor="middle" font-size="11" fill="var(--dim)">ls・エディタ・サーバ</text>
<rect x="30" y="64" width="540" height="42" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="300" y="82" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">ライブラリ / シェル</text>
<text x="300" y="98" text-anchor="middle" font-size="11" fill="var(--dim)">libc・bash</text>
<rect x="30" y="114" width="540" height="38" rx="8" fill="var(--accentDim)" stroke="var(--accentBorder)"/>
<text x="300" y="138" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--accent)">システムコール — カーネルへの窓口 (open / read / fork)</text>
<rect x="30" y="162" width="540" height="54" rx="8" fill="var(--track)" stroke="var(--accent)" stroke-width="2"/>
<text x="300" y="186" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text)">カーネル</text>
<text x="300" y="204" text-anchor="middle" font-size="11" fill="var(--dim)">プロセス・メモリ・デバイス・ファイルシステムを管理</text>
<rect x="30" y="228" width="540" height="42" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="300" y="246" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">ハードウェア</text>
<text x="300" y="262" text-anchor="middle" font-size="11" fill="var(--dim)">CPU・メモリ・ディスク・NIC</text>
</svg>
<figcaption>図: 上の層は必ず下の層を通してしか触れない。アプリは「システムコール」でカーネルに依頼する</figcaption>
</figure>

上の層は、必ず下の層を通してしか下に触れない。アプリが直接メモリやディスクをいじることはできず、**必ずカーネルにお願いする** のが Linux の大原則だ。この境界があるおかげで、1 つのアプリが暴走してもシステム全体は守られる。

## カーネルの役割

カーネルはハードウェアとアプリの間に立つ「支配人」で、主に次の仕事を担う。

| 仕事 | 内容 | 覗く例 |
|---|---|---|
| プロセス管理 | どのプログラムをいつ CPU に載せるか調整する | `ps` |
| メモリ管理 | 各プロセスにメモリを割り当て、足りなければやりくりする | `free` |
| デバイス / ドライバ | ディスクや NIC などの機器をドライバ経由で操作する | `dmesg` |
| ファイルシステム | ディスク上のデータを「ファイルとディレクトリ」に見せる | `mount` |
| ネットワーク | パケットの送受信や TCP/IP の処理を担う | `ip` |

カーネル自身の情報は `uname -a` で確認できる。

```
$ uname -a
Linux localhost 6.1.0 #1 SMP x86_64 GNU/Linux
$ lscpu
Architecture:        x86_64
CPU(s):              1
```

`uname` の `Linux` の部分がまさにカーネルの名前だ。私たちが日常触れているのはその上の層で、カーネル本体を直接いじる場面はほとんどない。

## シェルとは何か

**シェル (shell)** は「コマンドを解釈して実行するプログラム」だ。あなたが打った `ls -l` という文字列を、シェルが解釈して「`ls` を探し、`-l` を渡して起動する」ところまで面倒を見てくれる。名前は、カーネルという核を包む「殻」に由来する。

代表格が **bash** で、この演習環境でもプロンプトの向こうで動いているのは bash だ。シェルは単なるコマンド実行だけでなく、パイプ (`|`)・リダイレクト (`>`)・変数・履歴といった機能も提供する。**シェルはカーネルの一部ではなく、あくまで普通のプログラムの 1 つ** である点は押さえておきたい。

## ユーザーランドとは

カーネル以外の領域、つまりシェル・コマンド群・ライブラリ・アプリケーションをまとめて **ユーザーランド (userland)** と呼ぶ。`ls` `cat` `grep` `ps` といったコマンドはすべてユーザーランドの住人だ。

- **カーネル空間** — ハードウェアを直接握れる特権的な世界
- **ユーザー空間 (ユーザーランド)** — システムコール越しにしかカーネルに触れない一般人の世界

この 2 つを分けているのが、先ほどの「システムコールという窓口」だ。

## 「すべてはファイル」という思想

Linux では、通常のファイルだけでなく **機器やカーネルの情報までファイルとして扱う**。同じ「読む・書く」という操作で何でも触れるようにする、という設計思想だ。

| 場所 | 実体 | 例 |
|---|---|---|
| 普通のファイル | ディスク上のデータ | `/home/user/memo.txt` |
| デバイス | 機器そのものを表す特殊ファイル | `/dev/sda` (ディスク)、`/dev/null` |
| プロセス情報 | カーネルが見せる仮想ファイル | `/proc/cpuinfo`、`/proc/meminfo` |
| カーネル設定 | 同じく仮想の設定ツリー | `/sys/...` |

```
$ cat /proc/cpuinfo | head -n 2
processor       : 0
vendor_id       : ...
```

`/proc` や `/sys` はディスク上に実体があるわけではなく、`cat` した瞬間にカーネルが中身を作って見せている。だから CPU の情報もメモリの状態も、専用ツールを覚えなくても「ファイルを読む」だけで取り出せる。

## ディストリビューションとは

「Linux」は正確にはカーネルの名前でしかない。実際に使える OS にするには、その上に **GNU のユーザーランド (bash や coreutils など)** と、ソフトを出し入れする **パッケージ管理** を組み合わせる必要がある。この一式をまとめたものが **ディストリビューション** だ。

- **Debian / Ubuntu** — `apt` / `dpkg` でパッケージを管理する系統
- **Red Hat / Fedora** — `dnf` / `rpm` を使う系統

カーネルは共通でも、付いてくるコマンドの版や既定設定が違うので「味付けの違う Linux」がたくさん存在する、というわけだ。

なお **この演習環境は Debian ベース** なので、パッケージ管理は `apt` / `dpkg` 系になる。root には `su root` (パスワード: `password`) で切り替えられる。

## まとめ / 覚え方

- 下から **ハードウェア → カーネル → システムコール → シェル/ライブラリ → アプリ** の順で積み上がっている
- **カーネル** が資源を握る核、**シェル** はコマンドを解釈する殻、それ以外が **ユーザーランド**
- 「すべてはファイル」なので、機器 (`/dev`) もカーネル情報 (`/proc` `/sys`) も読み書きで触れる
- **ディストリビューション** = カーネル + ユーザーランド + パッケージ管理。この環境は Debian ベース
