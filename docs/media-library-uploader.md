# メディアライブラリ アップローダの登録

## 1. 起動成果物を書き出す

```bash
npm run build:local-launchers
```

`.tmp/local/` に次が出る。

| ファイル | 用途 |
| --- | --- |
| `config.template.json` | 設定ファイルの雛形。`bucket` と `syncFunctionName` は deploy と揃った値で埋まっている |
| `sendto-command.txt` | 「送る」に登録するコマンドライン。ディストリ名と clone 先が埋まっている |
| `eskra-media-library.service` | 管理ツールを常駐させる systemd unit（[media-library-app.md](./media-library-app.md) で使う） |

## 2. 設定ファイルを置く

雛形を写して空欄を埋める（git 管理下に置かない）。

```bash
mkdir -p ~/.config/eskra-media-library
cp .tmp/local/config.template.json ~/.config/eskra-media-library/config.json
```

アップローダが読むのは `bucket` と `r2` だけ。残りは管理ツールが使う。

R2 の API トークンは Cloudflare のダッシュボードで作り、対象 bucket の Object Read & Write に絞る。

置き場所を変える場合は `MEDIA_LIBRARY_CONFIG` に絶対パスを入れて起動する。

## 3. ビルドする

```bash
npm run build
```

`apps/windows-playground/dist/handlers/media-upload/handler.js` ができる。

## 4. 動作を確かめる

```bash
npm run media:upload -- /mnt/c/Users/<ユーザー名>/Pictures/test.png
```

`[1/1] 保存しました: _pending/20260907-133045123.png` のように出れば成功。サムネイル生成後に `_inbox/` へ移ります。

## 5. 「送る」に登録する

1. エクスプローラーのアドレスバーに `shell:sendto` と入力する。
2. 開いたフォルダで右クリック →「新規作成」→「ショートカット」を選び、項目の場所に `.tmp/local/sendto-command.txt` の中身を貼る。
3. 名前を付ける（例:「メディアライブラリへ送る」）。

エクスプローラーでファイルを選び、右クリック →「送る」→ 作った項目、で保存される。

## コンソールを隠したい場合

作ったショートカットのプロパティで「実行時の大きさ」を最小化にする。

完全に隠す場合は次の `.vbs` を作り、ショートカットのターゲットをその `.vbs` にする（失敗しても何も表示されなくなる）。`command` には `sendto-command.txt` の中身を入れる。

```vbs
Set shell = CreateObject("WScript.Shell")
command = "<sendto-command.txt の中身>"
args = ""
For Each arg In WScript.Arguments
  args = args & " """ & arg & """"
Next
shell.Run command & args, 0, False
```

## 注意

- 保存しただけでは管理ツールに出てこない。2 時間ごとの同期を待つか、管理ツールの同期ボタンを押す。
- 一度に大量に選ぶと Windows のコマンドライン長の制限（約 32KB）で複数回に分けて起動される。分割されても正しく動くが、コンソールがその回数だけ開く。
- 対象は画像と動画の既知の拡張子だけ。それ以外は 1 件ずつ飛ばして続行し、最後に失敗件数が出る。
