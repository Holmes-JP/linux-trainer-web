---
title: サービスとデーモンの管理
summary: 常駐プロセス (デーモン) の仕組みと、init/systemd の違い、サービスが落ちたときの調べ方
categories: [services]
related_commands: [service, systemctl, journalctl, crontab, ps]
order: 40
---

## デーモン = 裏で常駐し続けるプロセス

Web サーバー・データベース・SSH など、**ユーザーが操作していなくても裏で動き続けているプロセス** を **デーモン (daemon)** と呼ぶ。名前の末尾に `d` が付くものが多い (`sshd`、`crond`、`httpd`)。端末を閉じても止まらず、OS の起動時に自動で立ち上がり、リクエストが来るのを待ち構える。

デーモンも実体はただのプロセスなので、`ps aux` で見える。

```
USER   PID %CPU %MEM COMMAND
root   142  0.0  0.3 /usr/sbin/sshd -D
root   170  0.0  0.1 /usr/sbin/crond -n
```

「サービスが動いているか」を最初に確かめる素朴な方法は、このように `ps aux | grep 名前` で該当プロセスが居るかを見ることだ。

## init と systemd — サービスを管理する司令塔

デーモンを一つずつ手で起動・監視するのは大変なので、それをまとめて面倒みる仕組み (PID 1 の管理プロセス) が用意されている。歴史的に2系統ある。

| 方式 | 起動スクリプト | 操作コマンド | 特徴 |
|---|---|---|---|
| **SysV init** (古典) | `/etc/init.d/名前` | `service 名前 start` | シェルスクリプトで1本ずつ制御。素朴で分かりやすい |
| **systemd** (現代の主流) | `unit` ファイル | `systemctl start 名前` | 依存関係・ログ・並列起動をまとめて管理 |

現在のほとんどの本番サーバーは **systemd** で動いており、`systemctl start nginx` や `systemctl status nginx` が標準の操作になる。

## この演習環境では `systemctl` は使えない

ここが今回いちばん大事なポイント。**この演習環境 (ブラウザ内の WebVM) では systemd が PID 1 として動いていない**。そのため `systemctl` や後述の `journalctl` を打っても、

```
$ systemctl status ssh
System has not been booted with systemd as init system (PID 1). Can't operate.
```

のように弾かれる。混乱しないよう、対比で覚えておこう。

| やりたいこと | 現実のサーバー (systemd) | この演習 (init.d 方式) |
|---|---|---|
| 起動 | `systemctl start 名前` | `service 名前 start` |
| 停止 | `systemctl stop 名前` | `service 名前 stop` |
| 状態確認 | `systemctl status 名前` | `service 名前 status` |
| 直接叩く | — | `/etc/init.d/名前 start` |

`service` コマンドは中身で `/etc/init.d/名前` を呼び出しているだけなので、両者は同じものへの入り口だ。サービスの起動・停止には root 権限が要るので、`su root` (パスワード: `password`) になってから操作する。

## サービスが落ちたときの調べ方

「さっきまで動いていたのに繋がらない」というときの手順はほぼ決まっている。

1. **状態を見る** — `service 名前 status` で running か stopped かを確認する
2. **プロセスを確認する** — 状態がよく分からなければ `ps aux | grep 名前` で本当に居ないのかを見る
3. **ログを読む** — なぜ落ちたかは `/var/log/` の該当ログに残る (詳しくは「ログの読み方と調査」を参照)
4. **起動し直す** — 原因を直したら `service 名前 restart` (無ければ `stop` してから `start`)

いきなり `restart` を連打せず、**まず status とログで「なぜ落ちたか」を掴む** のが遠回りに見えて近道になる。設定ファイルの書き間違いが原因なら、直さない限り再起動しても同じところで落ちるからだ。

## crontab で定期実行する

「毎晩バックアップ」「5分ごとに監視」のような **定期実行** を担うのが cron デーモンで、その予定表を編集するのが `crontab` だ。

```
$ crontab -l          # 自分の予定表を表示
$ crontab -e          # 予定表を編集
```

各行は「分 時 日 月 曜日 コマンド」の6列で書く。

```
# 毎日 3:30 にバックアップスクリプトを実行
30 3 * * * /home/user/backup.sh

# 平日 (月〜金) の 9〜18時、毎時0分にチェック
0 9-18 * * 1-5 /home/user/check.sh
```

`*` は「毎回」を意味する。cron 自身もデーモンなので、予定を書いても cron が動いていなければ実行されない点に注意 (`ps aux | grep cron` で確認できる)。

## journalctl は systemd 環境の話

systemd のサーバーでは、各サービスのログが `journalctl` という専用コマンドで一括して読める (`journalctl -u nginx` でそのサービス分だけ、`journalctl -f` で追尾)。とても便利だが、**これは systemd が居る環境限定**の道具だ。前述のとおり本演習では systemd が PID 1 ではないため `journalctl` も使えない。

その代わり、本演習でのログ調査は昔ながらの **`/var/log/` 配下のファイルを直接読む** 方法で行う。これは次の記事「ログの読み方と調査」で扱う。

## トラブル対応の型

1. `service 名前 status` で状態を確認する (running か stopped か)
2. 曖昧なら `ps aux | grep 名前` でプロセスの生死を直接見る
3. `/var/log/` の該当ログを読み、落ちた原因 (設定ミス・権限・ポート衝突) を特定する
4. 原因を直してから `service 名前 restart` で起動し直し、再度 status で確認する
5. 定期実行が絡むなら `crontab -l` で予定表と時刻指定に誤りがないかを見直す
