---
title: パーミッションの仕組み
summary: rwx と数値表記、所有者・グループ・その他という3つの立場から権限を理解する
categories: [permissions]
related_commands: [ls, chmod, chown]
order: 10
---

## ファイルには「持ち主」と「権限」がある

Linux では、すべてのファイルとディレクトリに **所有者 (user)**、**グループ (group)**、そして **権限 (パーミッション)** が記録されている。`ls -l` で確認できる。

```
-rw-r--r-- 1 user user 1024 Jul  1 10:00 report.txt
```

<figure class="diagram">
<svg viewBox="0 0 600 200" role="img" aria-label="ls -l の権限10文字の内訳図">
<rect x="100" y="40" width="40" height="44" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<rect x="140" y="40" width="120" height="44" rx="6" fill="var(--accentDim)" stroke="var(--accentBorder)"/>
<rect x="260" y="40" width="120" height="44" rx="6" fill="var(--track)" stroke="var(--border)"/>
<rect x="380" y="40" width="120" height="44" rx="6" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="120" y="70" text-anchor="middle" font-size="20" fill="var(--dim)">-</text>
<text class="mono" x="160" y="70" text-anchor="middle" font-size="20" fill="var(--accent)">r</text>
<text class="mono" x="200" y="70" text-anchor="middle" font-size="20" fill="var(--accent)">w</text>
<text class="mono" x="240" y="70" text-anchor="middle" font-size="20" fill="var(--accent)">-</text>
<text class="mono" x="280" y="70" text-anchor="middle" font-size="20" fill="var(--text)">r</text>
<text class="mono" x="320" y="70" text-anchor="middle" font-size="20" fill="var(--text)">-</text>
<text class="mono" x="360" y="70" text-anchor="middle" font-size="20" fill="var(--text)">-</text>
<text class="mono" x="400" y="70" text-anchor="middle" font-size="20" fill="var(--dim)">r</text>
<text class="mono" x="440" y="70" text-anchor="middle" font-size="20" fill="var(--dim)">-</text>
<text class="mono" x="480" y="70" text-anchor="middle" font-size="20" fill="var(--dim)">-</text>
<text x="120" y="106" text-anchor="middle" font-size="12" fill="var(--accent)">種類</text>
<text x="200" y="106" text-anchor="middle" font-size="12" fill="var(--accent)">所有者</text>
<text x="320" y="106" text-anchor="middle" font-size="12" fill="var(--accent)">グループ</text>
<text x="440" y="106" text-anchor="middle" font-size="12" fill="var(--accent)">その他</text>
<text x="300" y="146" text-anchor="middle" font-size="12.5" fill="var(--dim)">各枠は3文字。r = 読み (4) ・ w = 書き (2) ・ x = 実行 (1)</text>
<text class="mono" x="300" y="176" text-anchor="middle" font-size="13" fill="var(--text)">644 = rw-r--r--    755 = rwxr-xr-x    600 = rw-------</text>
</svg>
<figcaption>図: ls -l の先頭10文字は「種類＋3人分（所有者/グループ/その他）」に分かれる</figcaption>
</figure>

先頭の 10 文字が権限の表示で、次のように区切って読む。

| 位置 | 意味 |
|---|---|
| 1文字目 (`-`) | 種類。`-`=ファイル、`d`=ディレクトリ、`l`=シンボリックリンク |
| 2〜4文字目 (`rw-`) | **所有者** の権限 |
| 5〜7文字目 (`r--`) | **グループ** の権限 |
| 8〜10文字目 (`r--`) | **その他 (全員)** の権限 |

つまりアクセスする人の立場が「所有者か → グループのメンバーか → それ以外か」の順に判定され、最初に当てはまった枠の権限だけが適用される。

## rwx の意味

| 記号 | ファイルでは | ディレクトリでは |
|---|---|---|
| `r` (read) | 中身を読める | 一覧 (`ls`) を見られる |
| `w` (write) | 中身を書き換えられる | 中にファイルを作成・削除できる |
| `x` (execute) | プログラムとして実行できる | 中に入れる (`cd` できる) |

ディレクトリの `x` は見落としやすい。**`x` が無いディレクトリは、中のファイル名が分かっていても辿り着けない**。「ファイルはあるはずなのに Permission denied」というトラブルの定番原因になる。

## 数値表記 (8進数)

`chmod` では権限を数字でも指定できる。`r=4, w=2, x=1` の合計を、所有者・グループ・その他の順に3桁並べる。

```
rw-  =  4+2   = 6
r--  =  4     = 4
rwx  =  4+2+1 = 7
```

よく使う組み合わせは決まっている。

| 数値 | 権限 | 典型的な用途 |
|---|---|---|
| `644` | `rw-r--r--` | 普通のファイル |
| `600` | `rw-------` | 秘密のファイル (鍵や設定) |
| `755` | `rwxr-xr-x` | 実行ファイル・ディレクトリ |
| `700` | `rwx------` | 本人専用ディレクトリ |
| `000` | `---------` | 誰も読めない (事故か嫌がらせ) |

## root は権限を無視できる

管理者 `root` はパーミッションの制約をほぼ受けず、所有者の変更 (`chown`) も root にしかできない。逆に言うと、**「読めない・書けない・直せない」ときの多くは root になれば解決**する。

この演習環境では `su root` (パスワード: `password`) で root になれる。修復操作は root で行うのが基本と覚えておこう。

## トラブルの読み解き方

1. `ls -l` で「誰の持ち物で、どの立場にどの権限があるか」を見る
2. 自分の立場を `id` で確認する (ユーザー名と所属グループ)
3. ずれているものを直す — 権限なら `chmod`、持ち主なら `chown`
