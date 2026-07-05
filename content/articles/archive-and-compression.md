---
title: アーカイブと圧縮 (tar / gzip)
summary: 「まとめる」と「縮める」は別の操作。tar と gzip を分けて理解すれば復元で困らない
categories: [filesystem]
related_commands: [tar, gzip, gunzip]
order: 7
---

## アーカイブと圧縮は別の概念

よく混同されるが、この 2 つは役割が違う。

| 操作 | 意味 | 担当コマンド |
|---|---|---|
| アーカイブ | 複数のファイルを **1 個にまとめる** (サイズは縮まない) | `tar` |
| 圧縮 | データを **縮めて容量を減らす** (1 ファイル対象) | `gzip` |

`gzip` は基本的に 1 ファイルしか縮められない。だから「フォルダごと配りたい」ときは、まず `tar` でまとめて 1 個にし、それを `gzip` で縮める。これが `.tar.gz` (通称 tarball) の正体だ。**まとめる → 縮める** の 2 段階だと分かれば怖くない。

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-label="tar でまとめて gzip で縮める流れの図">
<defs><marker id="tgArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<rect x="16" y="50" width="120" height="50" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="76" y="72" text-anchor="middle" font-size="12" fill="var(--text)">複数ファイル</text>
<text x="76" y="90" text-anchor="middle" font-size="11" fill="var(--dim)">a.txt b.txt c.txt</text>
<text x="182" y="60" text-anchor="middle" font-size="11" fill="var(--accent)">まとめる (tar -c)</text>
<line x1="138" y1="75" x2="226" y2="75" stroke="var(--accent)" marker-end="url(#tgArrow)"/>
<rect x="230" y="55" width="140" height="40" rx="8" fill="var(--track)" stroke="var(--border)"/>
<text class="mono" x="300" y="80" text-anchor="middle" font-size="13" fill="var(--text)">archive.tar</text>
<text x="416" y="60" text-anchor="middle" font-size="11" fill="var(--accent)">縮める (gzip)</text>
<line x1="372" y1="75" x2="460" y2="75" stroke="var(--accent)" marker-end="url(#tgArrow)"/>
<rect x="464" y="55" width="160" height="40" rx="8" fill="var(--track)" stroke="var(--accent)" stroke-width="2"/>
<text class="mono" x="544" y="80" text-anchor="middle" font-size="13" fill="var(--accent)">archive.tar.gz</text>
<text x="320" y="128" text-anchor="middle" font-size="12" fill="var(--dim)">「まとめる → 縮める」の2段階。これが .tar.gz (tarball) の正体</text>
</svg>
<figcaption>図: tar で1個にまとめてから gzip で圧縮する</figcaption>
</figure>

## tar の基本オプション

`tar` はオプションの組み合わせで動く。まず覚えるのは 5 つ。

| オプション | 意味 |
|---|---|
| `-c` | create。新しくまとめる (作成) |
| `-x` | extract。展開する (取り出す) |
| `-t` | list。中身を一覧するだけ (展開しない) |
| `-z` | gzip 圧縮も同時に行う (`.gz` を扱う) |
| `-f` | 対象のファイル名を指定する (**直後にファイル名**を書く) |

`-f` の直後にはアーカイブ名が来る、と決めておくと並び順で迷わない。`-v` を足すと処理中のファイル名が流れて進捗が見える。

## .tar.gz を作る・展開する

```
# work/ をまとめて圧縮して backup.tar.gz を作る
$ tar -czf backup.tar.gz work/

# 中身を確認する (展開せず一覧だけ)
$ tar -tzf backup.tar.gz
work/
work/report.txt
work/notes.md

# 展開する
$ tar -xzf backup.tar.gz
```

作成は `czf`、展開は `xzf`。真ん中の `z` は「gzip も通す」印だ。展開前に必ず `-tzf` で中身を確認する癖をつけると、意図しない場所へファイルをばらまく事故を防げる。

## gzip / gunzip 単体

1 ファイルだけ縮めたいなら `gzip` を直接使う。

```
$ gzip huge.log        # huge.log → huge.log.gz (元ファイルは消える)
$ gunzip huge.log.gz   # huge.log.gz → huge.log に戻す
```

`gzip` は既定で **元ファイルを置き換える** 点に注意。元を残したいときは `gzip -k` を使う。`gunzip file.gz` は `gzip -d file.gz` と同じで、どちらでも解凍できる。

## 復元でつまずいたときの型

1. まず `tar -tf ファイル名` で中身と構造を確認する (いきなり展開しない)
2. `.tar.gz` なら `z` を付ける (`-tzf`)。`z` の付け忘れは `gzip` 系エラーの定番原因
3. `gzip: unexpected end of file` が出たら、ダウンロードが途中で切れている疑い — ファイルサイズを見直す
4. 中身が `work/...` のように上位ディレクトリ付きか、ファイル直置きかを確認してから、安全な空ディレクトリで `-xzf` する
