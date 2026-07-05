---
title: ユーザー・グループと権限昇格
summary: /etc/passwd と /etc/group を読み、UID/GID・自分の立場・root への昇格を理解する
categories: [permissions]
related_commands: [id, whoami, groups, su, passwd, useradd, usermod, getent, chown, chgrp]
order: 15
---

## パーミッションは「人」を見て判定される

[パーミッションの仕組み](/articles/permissions) では `rwx` という **権限の形** を扱った。だがその権限は、アクセスしてきた人が「所有者か、グループのメンバーか、それ以外か」で切り替わる。つまり **人 (ユーザーとグループ) の側** が分からないと、権限の話は半分しか分からない。

Linux はユーザーを名前ではなく **番号** で管理している。ユーザーには **UID**、グループには **GID** が振られ、内部の判定はすべてこの数字で行われる。名前は人間向けの見た目にすぎない。

<figure class="diagram">
<svg viewBox="0 0 600 200" role="img" aria-label="アクセス権の判定順の図">
<defs><marker id="ugArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"/></marker></defs>
<rect x="16" y="76" width="130" height="44" rx="8" fill="var(--track)" stroke="var(--accent)"/>
<text x="81" y="98" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--accent)">アクセスする人</text>
<text x="81" y="114" text-anchor="middle" font-size="10.5" fill="var(--dim)">UID / 所属グループ</text>
<line x1="146" y1="57" x2="206" y2="57" stroke="var(--border)"/>
<line x1="146" y1="98" x2="206" y2="107" stroke="var(--border)"/>
<line x1="146" y1="150" x2="206" y2="157" stroke="var(--border)"/>
<line x1="146" y1="98" x2="146" y2="150" stroke="var(--border)"/>
<line x1="146" y1="57" x2="146" y2="98" stroke="var(--border)"/>
<text x="210" y="52" font-size="12" fill="var(--dim)">所有者なら →</text>
<rect x="330" y="34" width="250" height="34" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="455" y="56" text-anchor="middle" font-size="12.5" fill="var(--text)">所有者の rwx が適用</text>
<text x="210" y="112" font-size="12" fill="var(--dim)">グループの一員なら →</text>
<rect x="330" y="90" width="250" height="34" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="455" y="112" text-anchor="middle" font-size="12.5" fill="var(--text)">グループの rwx が適用</text>
<text x="210" y="172" font-size="12" fill="var(--dim)">どちらでもなければ →</text>
<rect x="330" y="150" width="250" height="34" rx="8" fill="var(--surface)" stroke="var(--border)"/>
<text x="455" y="172" text-anchor="middle" font-size="12.5" fill="var(--text)">その他の rwx が適用</text>
</svg>
<figcaption>図: 上から順に判定し、最初に当てはまった立場の権限「だけ」が使われる</figcaption>
</figure>

## /etc/passwd の見方

ユーザーの定義は `/etc/passwd` に1行1ユーザーで並んでいる。`getent passwd user` で1件だけ引ける。

```
$ getent passwd user
user:x:1000:1000:,,,:/home/user:/bin/bash
```

`:` 区切りで、左から次の意味になる。

| 位置 | 例 | 意味 |
|---|---|---|
| 1 | `user` | ユーザー名 |
| 2 | `x` | パスワード (実体は `/etc/shadow`。`x` は「別ファイル」の印) |
| 3 | `1000` | **UID**。0 は root、一般ユーザーは 1000 以降が多い |
| 4 | `1000` | **GID** (主グループ) |
| 5 | `,,,` | 補足情報 (氏名など。空でよい) |
| 6 | `/home/user` | ホームディレクトリ |
| 7 | `/bin/bash` | ログイン時に起動するシェル |

**UID が 0 のユーザーが root** だ。名前が root でなくても UID 0 なら root 相当の全能になる。

## /etc/group とグループ所属

グループの定義は `/etc/group` にある。こちらも `getent group グループ名` で引ける。

```
$ getent group sudo
sudo:x:27:user
```

末尾の `user` が **そのグループに追加所属しているメンバー** の一覧 (CSV)。主グループ (passwd の GID) はここには出ないので、両方を合わせて初めて「その人が属する全グループ」になる。

## 自分の立場を知る 3 つのコマンド

トラブル時にまず確認すべきは「今、自分は誰で、何に属しているか」だ。

| コマンド | 分かること |
|---|---|
| `whoami` | 現在のユーザー名 (1行) |
| `id` | UID・GID・所属グループを番号と名前で一括表示 |
| `groups` | 所属グループ名だけを並べる |

```
$ whoami
user
$ id
uid=1000(user) gid=1000(user) groups=1000(user)
```

`Permission denied` が出たら、まず `id` で自分の立場を確認し、対象ファイルの所有者・グループ (`ls -l`) と見比べる。**枠がずれているのか、権限が足りないのか** を切り分けるのが最初の一歩。

## su と sudo の違い

権限が足りないときに管理者になる手段が 2 つある。

- **`sudo コマンド`** — 一時的に、そのコマンド1回だけを管理者権限で実行する。誰が何を実行してよいかは `/etc/sudoers` で細かく決める。
- **`su ユーザー名`** — 指定ユーザーに**丸ごと切り替わる** (switch user)。相手のパスワードが必要。ユーザー名を省くと root への切り替えになる。

**この演習環境には sudo の設定が無い**。管理者作業をしたいときは、次のように `su root` で root に切り替える。パスワードは `password`。

```
$ su root
Password:
# whoami
root
```

プロンプトが `$` から `#` に変わったら root になった合図だ。作業が終わったら `exit` で元のユーザーに戻る。

## ユーザー管理の基礎 (root で行う)

ユーザーやグループの作成・変更は root の仕事なので、先に `su root` してから実行する。

| コマンド | 用途 | 例 |
|---|---|---|
| `useradd` | ユーザーを作る | `useradd -m alice` (`-m` でホーム作成) |
| `passwd` | パスワードを設定・変更する | `passwd alice` |
| `usermod` | 既存ユーザーを変更する | `usermod -aG sudo alice` (グループ追加) |

`usermod -aG グループ ユーザー` の **`-a` を付け忘れると、既存の所属を上書きして消す**という定番の事故がある。グループを「追加」したいときは必ず `-a` (append) と `-G` をセットで使う。

自分自身のパスワードは、引数なしの `passwd` だけで変更できる。

## トラブル対応の型

1. `id` と `whoami` で「今の自分」を確認する
2. `ls -l` で対象ファイルの所有者・グループを見て、自分の立場とずれを探す
3. 権限や所有者を直す作業なら `su root` (パスワード `password`) で root になる
4. 持ち主を変えるなら `chown ユーザー ファイル`、グループを変えるなら `chgrp グループ ファイル`
5. 終わったら `exit` で一般ユーザーに戻る (root のまま作業を続けない)
