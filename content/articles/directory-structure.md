---
title: ディレクトリ構造の地図 (FHS)
summary: / から広がる主要ディレクトリの役割を一覧で覚え、「どこに何があるか」の当たりを付ける
categories: [filesystem]
related_commands: [ls, cd, find, tree, df, mount, cat]
order: 2
---

## ディレクトリ配置には「地図」がある

Linux のディレクトリはどこに何を置くかがだいたい決まっている。この慣習を **FHS (Filesystem Hierarchy Standard)** と呼ぶ。地図が頭に入っていれば、「設定を直したい」「ログを見たい」というときに **探し回らず一発で当たりを付けられる**。まずは `/` (ルート) 直下の全体像を掴もう。

```
$ ls /
bin  boot  dev  etc  home  lib  media  mnt  opt  proc
root  run  sbin  srv  sys  tmp  usr  var
```

<figure class="diagram">
<svg viewBox="0 0 600 330" role="img" aria-label="ディレクトリ構造のツリー図">
<line x1="55" y1="48" x2="55" y2="303" stroke="var(--border)"/>
<rect x="20" y="18" width="70" height="30" rx="6" fill="var(--track)" stroke="var(--accent)"/>
<text class="mono" x="55" y="39" text-anchor="middle" font-size="15" font-weight="700" fill="var(--accent)">/</text>
<line x1="55" y1="72" x2="140" y2="72" stroke="var(--border)"/>
<rect x="140" y="58" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="76" font-size="13" font-weight="700" fill="var(--accent)">/bin</text>
<text x="250" y="76" font-size="12" fill="var(--dim)">基本コマンドの実体 (ls, cp, cat)</text>
<line x1="55" y1="105" x2="140" y2="105" stroke="var(--border)"/>
<rect x="140" y="91" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="109" font-size="13" font-weight="700" fill="var(--accent)">/etc</text>
<text x="250" y="109" font-size="12" fill="var(--dim)">システム全体の設定ファイル</text>
<line x1="55" y1="138" x2="140" y2="138" stroke="var(--border)"/>
<rect x="140" y="124" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="142" font-size="13" font-weight="700" fill="var(--accent)">/home</text>
<text x="250" y="142" font-size="12" fill="var(--dim)">一般ユーザーの持ち物 (/home/ユーザー名)</text>
<line x1="55" y1="171" x2="140" y2="171" stroke="var(--border)"/>
<rect x="140" y="157" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="175" font-size="13" font-weight="700" fill="var(--accent)">/var</text>
<text x="250" y="175" font-size="12" fill="var(--dim)">変化するデータ (ログ /var/log ・キャッシュ)</text>
<line x1="55" y1="204" x2="140" y2="204" stroke="var(--border)"/>
<rect x="140" y="190" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="208" font-size="13" font-weight="700" fill="var(--accent)">/usr</text>
<text x="250" y="208" font-size="12" fill="var(--dim)">プログラムやライブラリの本体 (/usr/bin)</text>
<line x1="55" y1="237" x2="140" y2="237" stroke="var(--border)"/>
<rect x="140" y="223" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="241" font-size="13" font-weight="700" fill="var(--accent)">/proc</text>
<text x="250" y="241" font-size="12" fill="var(--dim)">仮想 FS。プロセスやカーネルの情報</text>
<line x1="55" y1="270" x2="140" y2="270" stroke="var(--border)"/>
<rect x="140" y="256" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="274" font-size="13" font-weight="700" fill="var(--accent)">/dev</text>
<text x="250" y="274" font-size="12" fill="var(--dim)">デバイスを表す特殊ファイル (/dev/null)</text>
<line x1="55" y1="303" x2="140" y2="303" stroke="var(--border)"/>
<rect x="140" y="289" width="430" height="28" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="156" y="307" font-size="13" font-weight="700" fill="var(--accent)">/boot</text>
<text x="250" y="307" font-size="12" fill="var(--dim)">起動に使うカーネル本体など</text>
</svg>
<figcaption>図: / を頂点に主要ディレクトリが枝分かれする (一部を抜粋)</figcaption>
</figure>

## 主要ディレクトリ一覧

| ディレクトリ | 何を置く場所か |
|---|---|
| `/` | すべての頂点。ここからすべてが枝分かれする |
| `/bin` | 基本コマンドの実行ファイル (`ls` `cp` `cat` など) |
| `/sbin` | システム管理者向けのコマンド (`mount` `ip` など) |
| `/etc` | システム全体の **設定ファイル** 置き場 |
| `/home` | 一般ユーザーの個人ディレクトリ (`/home/ユーザー名`) |
| `/root` | root 専用の個人ディレクトリ (`/home` とは別) |
| `/var` | 変化するデータ。ログ・キャッシュ・メールなど |
| `/tmp` | 一時ファイル。再起動で消えることがある |
| `/usr` | インストールされたプログラムやライブラリの本体 |
| `/usr/bin` | 追加でインストールされた大半のコマンド |
| `/usr/local` | 手動で入れた、そのマシン固有のソフト |
| `/lib` | コマンドが使う共有ライブラリ |
| `/opt` | 大きめの追加ソフトを一式まとめて置く場所 |
| `/proc` | 実体のない仮想ファイル。プロセスやカーネルの情報 |
| `/sys` | 同じく仮想。デバイスやカーネル設定のツリー |
| `/dev` | デバイスを表す特殊ファイル (`/dev/sda` `/dev/null`) |
| `/mnt` | 一時的にディスクを接ぎ木 (マウント) する場所 |
| `/media` | USB メモリなど、自動で認識された外部媒体 |
| `/boot` | 起動に使うカーネル本体など |
| `/run` | 起動後に作られる実行時データ (PID・ソケット等) |
| `/srv` | このサーバが外部に提供するデータ (Web 等) |

## `/bin` と `/usr/bin` の関係

昔は「起動に必須の最小コマンドは `/bin`、それ以外は `/usr/bin`」と分けていた。今の Debian では `/bin` が `/usr/bin` への **シンボリックリンク** になっていて中身は同じ、という構成が主流だ (usr merge)。細かい区別は気にせず、**コマンドの実体は `/bin` か `/usr/bin` にある** と覚えておけば十分。

```
$ ls -l /bin
lrwxrwxrwx 1 root root 7 ... /bin -> usr/bin
```

## 勘所 — ここだけ押さえる

全部を暗記する必要はない。調査でよく効くのは次の対応関係だ。

| やりたいこと | 見るべき場所 |
|---|---|
| 設定を確認・変更したい | `/etc` (例: `/etc/hosts`、`/etc/passwd`) |
| ログを追いたい | `/var/log` (例: `/var/log/syslog`) |
| コマンドの実体を探したい | `/bin`・`/usr/bin` |
| 自分のファイルを探したい | `/home/ユーザー名` |
| CPU やメモリの状態を見たい | `/proc` (例: `/proc/cpuinfo`) |
| 接続中のディスクや機器を見たい | `/dev`・`mount` の出力 |

## `/proc` と `/sys` は「実体のない」ファイルシステム

`/proc` と `/sys` はディスクを消費しない **仮想ファイルシステム** だ。`cat` した瞬間に、カーネルがその場で中身を生成して見せている。だから専用ツールを覚えなくても、ファイルを読むだけでシステムの内部状態が分かる。

```
$ cat /proc/uptime
1234.56 1200.00
$ cat /proc/meminfo | head -n 1
MemTotal:        2048000 kB
```

一方 `/dev` はデバイス (機器) を表す入口だ。`/dev/null` に捨てる、`/dev/sda` がディスクを指す、といった使い方をする。

## 木構造を歩き回るコマンド

| コマンド | 用途 |
|---|---|
| `cd /etc` | そのディレクトリへ移動する |
| `ls -la /var/log` | 中身を隠しファイルごと一覧する |
| `tree /etc` | 階層をツリー状に表示する |
| `find / -name sshd_config 2>/dev/null` | 木全体から名前で探す |
| `df -h` | どのディスクがどこに接ぎ木されているか |
| `cat /proc/cpuinfo` | 仮想ファイルから情報を読む |

## まとめ / 覚え方

- ディレクトリ配置は **FHS** という共通の地図に従っている
- **設定は `/etc`、ログは `/var/log`、コマンドは `/bin`・`/usr/bin`、持ち物は `/home/ユーザー名`**
- `/proc` と `/sys` は **実体のない仮想ファイルシステム**。カーネルの情報がファイルとして見える
- `/dev` は **デバイス** の入口
- 「どこに何があるか」を掴めば、探し回らずに調査が一直線に進む
