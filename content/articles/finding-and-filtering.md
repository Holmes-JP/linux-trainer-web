---
title: ファイル検索とテキスト絞り込み
summary: find で「どこにあるか」、grep で「中身に何があるか」を探し、パイプでつなぐ発想を身につける
categories: [filesystem]
related_commands: [find, grep, xargs, which, wc, sort, head, tail]
order: 8
---

## 「探す」には 2 方向ある

探しものには方向が 2 つある。この違いを意識すると道具を選び間違えない。

- **find** — 名前・所有者・サイズ・時刻などの **属性** でファイル自体を探す (どこにあるか)
- **grep** — ファイルの **中身のテキスト** を探す (何が書いてあるか)

<figure class="diagram">
<svg viewBox="0 0 600 180" role="img" aria-label="find と grep の役割の違いの図">
<defs><marker id="fgArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<rect x="20" y="34" width="110" height="44" rx="8" fill="var(--track)" stroke="var(--accent)"/>
<text class="mono" x="75" y="55" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent)">find</text>
<text x="75" y="71" text-anchor="middle" font-size="10.5" fill="var(--dim)">どこにある?</text>
<text x="300" y="46" text-anchor="middle" font-size="11" fill="var(--dim)">名前・サイズ・時刻・所有者などの属性で</text>
<line x1="130" y1="56" x2="330" y2="56" stroke="var(--accent)" marker-end="url(#fgArrow)"/>
<rect x="334" y="34" width="246" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="457" y="61" text-anchor="middle" font-size="12.5" fill="var(--text)">ファイル自体の場所を特定</text>
<rect x="20" y="108" width="110" height="44" rx="8" fill="var(--track)" stroke="var(--accent)"/>
<text class="mono" x="75" y="129" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent)">grep</text>
<text x="75" y="145" text-anchor="middle" font-size="10.5" fill="var(--dim)">何が書いてある?</text>
<text x="300" y="120" text-anchor="middle" font-size="11" fill="var(--dim)">ファイルの中身のテキストで</text>
<line x1="130" y1="130" x2="330" y2="130" stroke="var(--accent)" marker-end="url(#fgArrow)"/>
<rect x="334" y="108" width="246" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="457" y="135" text-anchor="middle" font-size="12.5" fill="var(--text)">一致した行を抜き出す</text>
</svg>
<figcaption>図: find は「ファイルの場所」を、grep は「中身のテキスト」を探す</figcaption>
</figure>

## find で条件を指定して探す

`find 起点 条件` の形。起点ディレクトリから下を丸ごと辿り、条件に合うものを出す。

| 条件 | 意味 |
|---|---|
| `-name "*.log"` | 名前で探す (ワイルドカード可) |
| `-user user` | 所有者で探す |
| `-size +10M` | サイズで探す (`+` は「より大きい」) |
| `-mtime -1` | 更新時刻で探す (`-1` は「24時間以内」) |
| `-type f` / `-type d` | ファイルだけ / ディレクトリだけ |

```
$ find /var/log -name "*.log" -size +1M
/var/log/syslog
/var/log/auth.log
```

権限のない場所で `Permission denied` が邪魔なときは末尾に `2>/dev/null` を付けるとエラーだけ捨てられる。

## grep で中身を絞る

`grep パターン ファイル` で、パターンを含む行だけを抜き出す。

```
$ grep "error" /var/log/syslog
Jul  1 10:02:11 host app: connection error
```

よく使うオプションは覚えておくと効く。

| オプション | 意味 |
|---|---|
| `-i` | 大文字小文字を無視 |
| `-r` | ディレクトリ以下を再帰的に探す |
| `-n` | 行番号を付ける |
| `-v` | パターンを含ま **ない** 行を出す (除外) |
| `-c` | 一致した行数を数える |

## パイプ `|` の考え方

パイプは **前のコマンドの出力を、次のコマンドの入力に流す** 仕組みだ。1 つ 1 つは単純なコマンドを数珠つなぎにして、複雑な絞り込みを組み立てる。これが Unix の基本発想になる。

```
# エラー行だけ取り出し、件数を数える
$ grep "error" /var/log/syslog | wc -l
42

# 多い順に並べて上位 5 件だけ見る
$ grep "error" /var/log/syslog | sort | uniq -c | sort -rn | head -5
```

`wc -l` で行数、`sort` で並べ替え、`head` / `tail` で先頭・末尾だけ、というように部品を足していく。

## xargs で結果を次のコマンドへ

`find` や `grep` が出した「一覧」を、そのまま別コマンドの **引数** として渡したいときに `xargs` を使う。

```
# .tmp ファイルを探して、まとめて削除する
$ find . -name "*.tmp" | xargs rm
```

パイプはあくまで「標準入力」に流すが、`rm` のように引数でファイル名を受け取るコマンドには、`xargs` が橋渡しをして「引数の並び」に変換してくれる。

## which でコマンドの実体を探す

「この `ls` はどこの実行ファイル？」を知りたいときは `which`。PATH の中から実際に呼ばれるファイルの場所を返す。

```
$ which grep
/usr/bin/grep
```

## 探すときの型

1. **場所を探す** なら `find 起点 -name ...`、**中身を探す** なら `grep -rn パターン 起点`
2. 結果が多すぎたら `| head` で先頭だけ、`| wc -l` で件数だけ見て量を掴む
3. 見つけたファイル群にまとめて処理したいなら `... | xargs コマンド` でつなぐ
4. コマンド自体の在り処が知りたいときは `which コマンド名`
