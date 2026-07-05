---
title: ファイルシステムとディレクトリ構造
summary: Linux の「1本の木」構造、絶対パスと相対パス、カレントディレクトリの考え方を理解する
categories: [filesystem]
related_commands: [ls, cd, pwd, find, file, stat]
order: 5
---

## Linux のファイルは 1 本の木

Windows の `C:` `D:` のようにドライブごとに分かれるのではなく、Linux では **すべてが `/` (ルート) を頂点とする 1 本の木** にぶら下がっている。USB メモリも別ディスクも、どこかのディレクトリに「接ぎ木」されて同じ木の一部になる。

トップレベルの主なディレクトリは用途がだいたい決まっている (FHS という慣習)。

| ディレクトリ | 役割 |
|---|---|
| `/etc` | 設定ファイル置き場 (システム全体の設定) |
| `/var` | 変化するデータ (ログ・キャッシュ・メールなど) |
| `/home` | 一般ユーザーの個人ディレクトリ (`/home/user`) |
| `/root` | root 専用の個人ディレクトリ (`/home` とは別) |
| `/tmp` | 一時ファイル。再起動で消えることがある |
| `/usr` | インストールされたプログラムやライブラリの本体 |
| `/bin` | 基本コマンドの実行ファイル (`ls` `cp` など) |

「設定を直したい → `/etc`」「ログを見たい → `/var/log`」のように、**場所の当たりを付けられる** のが構造を知る最大の利点だ。

<figure class="diagram">
<svg viewBox="0 0 600 160" role="img" aria-label="絶対パスと相対パスの違いの図">
<text x="300" y="20" text-anchor="middle" font-size="12" fill="var(--dim)">同じファイルへの 2 通りの指し方（現在地 = /home/user のとき）</text>
<text x="30" y="56" font-size="13" font-weight="700" fill="var(--accent)">絶対パス</text>
<rect x="110" y="36" width="270" height="34" rx="6" fill="var(--track)" stroke="var(--accent)"/>
<text class="mono" x="124" y="58" font-size="13" fill="var(--text)">/home/user/docs/a.txt</text>
<text x="392" y="57" font-size="11" fill="var(--dim)">／ から始める＝どこにいても同じ</text>
<text x="30" y="110" font-size="13" font-weight="700" fill="var(--accent)">相対パス</text>
<rect x="110" y="90" width="150" height="34" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="124" y="112" font-size="13" fill="var(--text)">docs/a.txt</text>
<text x="272" y="111" font-size="11" fill="var(--dim)">現在地からの道順＝cd で変わる</text>
<text x="300" y="148" text-anchor="middle" font-size="11.5" fill="var(--dim)">. = 現在地　.. = 一つ上　~ = ホーム</text>
</svg>
<figcaption>図: 絶対パスは / から、相対パスは今いる場所からの道順</figcaption>
</figure>

## 絶対パスと相対パス

ファイルの居場所を示す文字列が **パス**。書き方は 2 通りある。

- **絶対パス** — `/` から始まる完全な住所。`/home/user/report.txt`。どこにいても同じ場所を指す
- **相対パス** — **今いる場所 (カレントディレクトリ) からの道順**。`report.txt` や `../etc/hosts`

迷ったら絶対パスを使えば確実だが、タイプ量は増える。日常操作は相対パスが速い。

## `.` `..` `~` の意味

| 記号 | 指すもの |
|---|---|
| `.` | カレントディレクトリ (今いる場所そのもの) |
| `..` | 一つ上の親ディレクトリ |
| `~` | 自分のホームディレクトリ (`user` なら `/home/user`) |

`./script.sh` は「今いる場所の script.sh」、`cd ..` は「一つ上に戻る」、`cd ~` は「一発でホームに帰る」。`.` を付けて実行するのは、コマンド名として探される場所 (PATH) に今のディレクトリが含まれないためだ。

## カレントディレクトリと ls / cd / pwd

シェルは常に「今どこにいるか」という **カレントディレクトリ** を 1 つ持っている。相対パスはすべてここが基準になる。

```
$ pwd
/home/user
$ cd /var/log
$ pwd
/var/log
$ ls
auth.log  dmesg  syslog
```

- `pwd` — 今いる場所を絶対パスで表示する (**p**rint **w**orking **d**irectory)
- `cd` — カレントディレクトリを移動する。引数なしの `cd` だけでホームに戻る
- `ls` — その場所の中身を一覧する。`ls -l` で詳細、`ls -a` で `.` 始まりの隠しファイルも表示

中身の素性を知りたいときは `file 名前` で種類 (テキストか実行ファイルか) が分かり、`stat 名前` で更新時刻やサイズまで確認できる。

## 迷子になったときの型

1. `pwd` で「今どこにいるか」を確認する
2. `ls -la` でその場所に何があるかを見る
3. 目的地の当たりを付ける (設定なら `/etc`、ログなら `/var/log`)
4. 見つからなければ `find / -name 探したい名前 2>/dev/null` で木全体を検索する
