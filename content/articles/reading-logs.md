---
title: ログの読み方と調査
summary: /var/log の構成と、tail・less・grep・dmesg・last を使ったログ調査の基本
categories: [logs]
related_commands: [tail, less, grep, dmesg, last, logger, zgrep, journalctl]
order: 50
---

## ログはトラブル調査の一次資料

「サービスが落ちた」「ログインできない」「動作が変」——こうしたときに **何が起きたかを教えてくれるのがログ** だ。多くのプログラムは自分の動作記録を `/var/log/` の下にテキストで書き続けている。原因を推測する前に、まずログを開く癖をつけると解決が早い。

## /var/log の構成

`ls /var/log/` で中を見ると、用途ごとにファイルが分かれている。ディストリビューションで名前が違うが、代表的なものは次のとおり。

| ファイル | 内容 |
|---|---|
| `/var/log/syslog` | システム全般の記録 (Debian/Ubuntu 系) |
| `/var/log/messages` | システム全般の記録 (RHEL/CentOS 系) |
| `/var/log/auth.log` | 認証・ログイン・`su`/`sudo` の記録 |
| `/var/log/kern.log` | カーネルからのメッセージ |
| `/var/log/*.1`, `*.gz` | ローテート (自動退避) された過去ログ |

ログは無限に増え続けないよう、一定サイズ・期間で **ローテート** され、古いものは `.1` や圧縮された `.gz` として残る。読むには root が必要なものが多いので `su root` (パスワード: `password`) になっておく。

## tail -f でリアルタイムに追いかける

いま起きている問題を捕まえたいときは `tail` が主役だ。`-f` (follow) を付けると、ログに新しい行が書き込まれるたびに **画面に流れ続ける**。

```
$ tail -f /var/log/syslog
Jul  5 10:22:01 host CRON[812]: (user) CMD (/home/user/check.sh)
Jul  5 10:22:14 host sshd[840]: Accepted password for user from 10.0.0.5
```

この状態でサービスを再起動したり操作を再現したりすると、対応するログがその場で出る。追尾を止めるには `Ctrl+C`。直近だけ見たいなら `tail -n 50 ファイル` で末尾50行を表示する。

## less で大きなログをじっくり読む

ログは数万行になることもあり、`cat` で全部流すと追えない。**`less` でページ単位に開く** のが定石だ。

```
$ less /var/log/syslog
```

`less` の中では次の操作が効く。

| キー | 動作 |
|---|---|
| `Space` / `b` | 次/前のページ |
| `/文字列` | 前方検索 (`n` で次の一致へ) |
| `G` / `g` | 末尾 / 先頭へジャンプ |
| `q` | 終了 |

「末尾 (最新) から遡って読みたい」ときは `less` で開いて `G` を押すと一気に最後へ飛べる。

## grep で必要な行だけ絞り込む

エラーだけ、特定ユーザーだけを見たいときは `grep` でフィルタする。

```
$ grep -i error /var/log/syslog        # error を含む行 (-i で大小無視)
$ grep sshd /var/log/auth.log          # SSH 関連だけ
$ grep -i "failed" /var/log/auth.log   # ログイン失敗を洗い出す
```

`tail -f` と組み合わせれば、**流れるログを絞りながら監視** できる。

```
$ tail -f /var/log/syslog | grep -i error
```

## dmesg でカーネル/起動メッセージを見る

ディスクの認識・USB の抜き差し・メモリ不足によるプロセス強制終了 (OOM) など、**カーネルが出すメッセージ** は `dmesg` で読む。ハードウェアや起動まわりの不調はまずここを見る。

```
$ dmesg | tail -n 20
$ dmesg | grep -i memory
```

## last でログイン履歴を確認する

「誰がいつログインしたか」は `last` で分かる。`/var/log/wtmp` を元に、直近のログイン・ログアウトを新しい順に並べて表示する。

```
$ last
user   pts/0   10.0.0.5   Sun Jul  5 10:15   still logged in
user   pts/0   10.0.0.5   Sun Jul  5 09:02 - 09:40  (00:38)
reboot system boot                Sun Jul  5 08:55
```

不審なアクセスの調査や、いつ再起動したかの確認に使える。

## logger で自分のメッセージをログに書く

`logger` を使うと、**自分のスクリプトから syslog に1行書き込める**。バッチ処理の開始・終了を記録しておくと、後から `grep` で追跡できて便利だ。

```
$ logger "backup started"
$ grep "backup started" /var/log/syslog
Jul  5 03:30:02 host user: backup started
```

## zgrep で圧縮された過去ログを検索する

ローテートで `.gz` に圧縮された古いログは、`grep` で直接は読めない。**展開しながら検索する `zgrep`** を使えば、解凍せずにそのまま中身を絞り込める。

```
$ zgrep -i "failed" /var/log/auth.log.2.gz
$ zgrep -i error /var/log/syslog.*.gz      # 複数の過去ログをまとめて
```

「昨日より前の障害を追う」ときの必須ツールだ。

## トラブル対応の型

1. どのログを見るか当たりを付ける (認証なら `auth.log`、全般なら `syslog`/`messages`、起動なら `dmesg`)
2. まず `tail -n 50` か `less` + `G` で最新の末尾を確認する
3. `grep -i error` / `grep -i failed` でエラー行だけに絞る
4. 現象を再現できるなら `tail -f` で追いかけ、操作した瞬間に出る行を捕まえる
5. 過去分まで遡るときは `.gz` を `zgrep` で横断検索する
