---
title: Unix / Linux のセオリー (設計思想)
summary: 小さな単機能ツールをパイプでつなぐという Unix の発想を理解し、コマンドの読み方・組み合わせ方を腑に落とす
categories: [filesystem]
related_commands: [grep, sort, uniq, wc, xargs, tee, echo, cut]
order: 3
---

## なぜ Linux のコマンドは「小さくて単機能」なのか

Linux のコマンドを触りはじめると、`ls`・`grep`・`sort` のように、**やることが 1 つに絞られた小さな道具** ばかりが並んでいることに気づく。これは手抜きではなく、Unix が半世紀かけて磨いてきた明確な設計思想 (哲学) の表れだ。この「セオリー」を知っておくと、初見のコマンドでも動きが予想でき、組み合わせ方が自然と見えてくる。

柱になる考え方をひとつずつ見ていこう。

<figure class="diagram">
<svg viewBox="0 0 600 120" role="img" aria-label="パイプでコマンドをつなぐ図">
<defs><marker id="pipeArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<text x="300" y="20" text-anchor="middle" font-size="12" fill="var(--dim)">1つのコマンドの出力が、次のコマンドの入力になる（テキストが共通言語）</text>
<rect x="8" y="42" width="118" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="67" y="69" text-anchor="middle" font-size="13" fill="var(--accent)">cat log</text>
<text class="mono" x="140" y="58" text-anchor="middle" font-size="14" fill="var(--accent)">|</text>
<line x1="128" y1="64" x2="153" y2="64" stroke="var(--accent)" marker-end="url(#pipeArrow)"/>
<rect x="156" y="42" width="118" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="215" y="69" text-anchor="middle" font-size="13" fill="var(--accent)">grep ERROR</text>
<text class="mono" x="288" y="58" text-anchor="middle" font-size="14" fill="var(--accent)">|</text>
<line x1="276" y1="64" x2="301" y2="64" stroke="var(--accent)" marker-end="url(#pipeArrow)"/>
<rect x="304" y="42" width="118" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="363" y="69" text-anchor="middle" font-size="13" fill="var(--accent)">sort</text>
<text class="mono" x="436" y="58" text-anchor="middle" font-size="14" fill="var(--accent)">|</text>
<line x1="424" y1="64" x2="449" y2="64" stroke="var(--accent)" marker-end="url(#pipeArrow)"/>
<rect x="452" y="42" width="118" height="44" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text class="mono" x="511" y="69" text-anchor="middle" font-size="13" fill="var(--accent)">uniq -c</text>
</svg>
<figcaption>図: 小さなコマンドをパイプでつなぎ、複雑な集計を1行で組み立てる</figcaption>
</figure>

## 1. 一つのことを、うまくやる

各コマンドは **1 つの仕事だけ** を受け持ち、それを確実にこなすことに集中する。`grep` は「探す」だけ、`sort` は「並べる」だけ、`wc` は「数える」だけだ。

多機能な巨大ツールを 1 つ作るより、単機能の小さな部品をたくさん揃えるほうが、覚えやすく・壊れにくく・使い回しが利く。「全部入り」を目指さないのが Unix の流儀だ。

## 2. パイプ `|` で鎖のようにつなぐ

小さな部品は、そのままでは大した仕事をしない。真価は **組み合わせたとき** に出る。その接着剤が **パイプ `|`** で、前のコマンドの出力をそのまま次のコマンドの入力へ流し込む。

```
# ログから多い IP を数え、上位 5 件を出す
$ cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -5
    842 10.0.0.5
    317 10.0.0.9
    120 192.168.1.2
```

この 1 行は、`cut` (列を切り出す) → `sort` (並べる) → `uniq -c` (重複を数える) → `sort -rn` (多い順) → `head` (先頭だけ) という **単機能の部品を鎖のようにつないだ** だけだ。1 つ 1 つは単純なのに、組み合わせると「アクセスの多い IP ランキング」という複雑な仕事が一発で片付く。これが Unix の強さの核心になる。

## 3. テキストが共通のインターフェース

なぜどんなコマンドでも自由につながるのか。答えは **どの道具も入力・出力を「テキストの行」で扱う** からだ。

`grep` の出力も `sort` の入力も、ただの文字の行。共通の言葉 (テキスト) を全員がしゃべっているから、`A | B | C` と好きな順で組み替えられる。特別な連携の約束事はいらない。この「テキスト = 万能の継手」という考え方が、パイプを成立させている。

## 4. すべてはファイル

Unix では、通常のファイルだけでなく **ディレクトリ・デバイス・プロセスの情報まで、ほとんどが「ファイル」として見える** ように作られている。ディスクは `/dev/sda`、システム情報は `/proc` の中のファイル、といった具合だ。

対象がすべてファイルの顔をしているおかげで、`cat`・`grep`・`ls` といった同じ道具でまとめて扱える。覚える操作が減り、応用が利く。

## 5. 設定はプレーンテキスト

Linux の設定は `/etc` 以下の **人間が読めるテキストファイル** に置かれている。バイナリの謎フォーマットではないので、次のことが自然にできる。

| できること | 意味 |
|---|---|
| `cat` で読める | 中身をそのまま目で確認できる |
| `diff` で比べられる | 変更前後の差分が見える |
| `git` で管理できる | 設定の履歴を残し、元に戻せる |

設定が読めるテキストであることは、トラブル調査でもバックアップでも効いてくる。「設定は見えるところに、人の言葉で」という思想だ。

## 6. 沈黙は金 (成功時は何も言わない)

Unix のコマンドは **うまくいったときは何も出力しない** ことが多い。`mv` や `cp` は、成功しても「コピーしました！」などとは言わない。

```
$ cp report.txt backup.txt
$
```

無言なのは失敗ではなく **成功の合図** だ。余計なメッセージを出さないから、パイプで次へ流したときにノイズが混ざらない。何か出たときこそ注目すべき (たいていエラー)、という設計になっている。

## 7. 終了コードで成否を伝える

画面には黙っていても、コマンドは **終了コード (exit status)** という数字で成否を必ず報告している。直前のコマンドの終了コードは `echo $?` で確認できる。

```
$ grep "error" app.log
$ echo $?
0            # 0 = 成功 (見つかった)

$ grep "zzz" app.log
$ echo $?
1            # 0 以外 = 失敗 (見つからなかった)
```

**`0` が成功、それ以外が失敗** という約束事だ。画面出力ではなくこの数字を見て、シェルスクリプトは「成功したら次へ、失敗したら中断」といった判断を機械的に下せる。人向けのメッセージと、機械向けの合図を分けているわけだ。

## 覚え方

- 小さな道具を **パイプでつなぐ** — これが Unix のすべての土台
- つながる理由は **テキストが共通言語** だから (すべてはファイル、設定もテキスト)
- **無言は成功**、異変があるときだけ喋る。機械向けの成否は `echo $?` の終了コードで読む
- 迷ったら「1 つのことをうまくやる部品に分けて、`|` で鎖にできないか」を考える
