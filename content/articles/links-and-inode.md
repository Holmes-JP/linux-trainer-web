---
title: リンクと inode の仕組み
summary: ファイルの実体を指す inode と、ハードリンク・シンボリックリンクの違いを理解する
categories: [filesystem]
related_commands: [ln, readlink, stat, ls, file]
order: 6
---

## ファイル名は「実体」ではない

Linux では、ファイルの中身や属性 (サイズ・所有者・権限・更新時刻・データの位置) は **inode** という管理情報に記録されている。ファイル名はその inode に付けられた **ラベル** にすぎない。

つまり「名前 → inode → 実体」という 2 段構えになっている。この分離を知ると、リンクの挙動がすべて腑に落ちる。inode 番号は `ls -i` で見える。

```
$ ls -i report.txt
131074 report.txt
```

<figure class="diagram">
<svg viewBox="0 0 600 220" role="img" aria-label="ハードリンクとシンボリックリンクの違いの図">
<defs><marker id="lnArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<rect x="410" y="58" width="160" height="66" rx="8" fill="var(--track)" stroke="var(--accent)" stroke-width="2"/>
<text class="mono" x="490" y="86" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent)">inode 131074</text>
<text x="490" y="106" text-anchor="middle" font-size="11" fill="var(--dim)">データの実体</text>
<rect x="200" y="44" width="150" height="34" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="215" y="65" font-size="13" fill="var(--text)">report.txt</text>
<line x1="350" y1="61" x2="408" y2="74" stroke="var(--accent)" marker-end="url(#lnArrow)"/>
<rect x="200" y="100" width="150" height="34" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="215" y="121" font-size="13" fill="var(--text)">backup.txt</text>
<line x1="350" y1="117" x2="408" y2="104" stroke="var(--accent)" marker-end="url(#lnArrow)"/>
<text x="360" y="94" text-anchor="middle" font-size="11" fill="var(--dim)">ハードリンク＝同じ inode を共有</text>
<rect x="30" y="160" width="150" height="34" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="45" y="181" font-size="13" fill="var(--text)">shortcut.lnk</text>
<line x1="185" y1="168" x2="245" y2="80" stroke="var(--accent)" stroke-dasharray="5 4" marker-end="url(#lnArrow)"/>
<text x="60" y="210" font-size="11" fill="var(--dim)">シンボリックリンク＝「report.txt」というパス名を指す（元が消えると切れる）</text>
</svg>
<figcaption>図: ハードリンクは inode（実体）を直接共有、シンボリックリンクはパス名を指す</figcaption>
</figure>

## ハードリンク vs シンボリックリンク

リンクとは「同じファイルに別の入口を作る」仕組みで、2 種類ある。

| | ハードリンク | シンボリックリンク (シンボリックリンク) |
|---|---|---|
| 正体 | 同じ inode を指す **もう一つの名前** | 別のパスを書いた **道しるべ** |
| `ln` の書き方 | `ln 元 新名` | `ln -s 元 新名` |
| 元を消すと | もう片方は生き残る (実体は残る) | **リンク切れ**になる |
| ディレクトリ | 不可 | 可 |
| 別ディスクへ | 不可 (同じファイルシステム内のみ) | 可 |

ハードリンクは同じ実体を共有するので、どちらから編集しても中身は同じ。片方を消しても inode を指す名前が残っている限り実体は消えない。シンボリックリンクは Windows のショートカットに近く、「あっちを見てね」という文字列を持っているだけだ。

## ln の使い分け

日常でよく使うのは **シンボリックリンク (`ln -s`)**。設定の切り替えやバージョン差し替え (`current → app-v2` のような) に向く。ハードリンクは「同じ実体を複数の名前で保持したい」特殊な場面に限られる。

```
$ ln -s /var/log/syslog ~/log-now
$ ls -l ~/log-now
lrwxrwxrwx 1 user user 15 Jul  1 10:00 log-now -> /var/log/syslog
```

先頭の `l` と `->` が付いていれば、それはシンボリックリンクだ。

## リンク先の確認と inode / リンク数

- `readlink 名前` — シンボリックリンクが指す先を表示する。`readlink -f` なら最終的な実体の絶対パスまで辿る
- `stat 名前` — inode 番号・リンク数・種類をまとめて確認できる

```
$ stat report.txt
  File: report.txt
  Size: 1024        Inode: 131074      Links: 2
```

`Links: 2` は「この inode を指す名前が 2 つある」= ハードリンクが 1 本追加されている、という意味だ。

## リンク切れの見分け方

シンボリックリンクの指す先が消えると **リンク切れ (dangling link)** になる。名前は残るのに開けない、という紛らわしい状態だ。

1. `ls -l` で `->` の指す先を見る
2. `readlink -f 名前` で最終的な実体パスを確認する
3. `file 名前` で判定する — リンク切れなら `broken symbolic link to ...` と表示される
4. 指す先が移動・削除されていれば、`ln -sf 正しい先 名前` で貼り直す
