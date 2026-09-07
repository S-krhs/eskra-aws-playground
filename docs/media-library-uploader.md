# メディアライブラリ アップローダの登録

## 1. 設定ファイルを置く

`~/.config/eskra-media-library/config.json` を作る（git 管理下に置かない）。

```json
{
  "bucket": "eskra-media-library",
  "r2": {
    "accountId": "...",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  }
}
```

R2 の API トークンは Cloudflare のダッシュボードで作り、対象 bucket の Object Read & Write に絞る。

`bucket` は `infra/sst.config.ts` の `mediaBucketName` と同じ名前にする。

## 2. ビルドする

```bash
npm run build
```

`apps/windows-playground/dist/scripts/media-upload.js` ができる。

## 3. 動作を確かめる

```bash
npm run media:upload -- /mnt/c/Users/<ユーザー名>/Pictures/test.png
```

`保存しました: _inbox/20260907-133045123.png` のように出れば成功。

## 4. 「送る」に登録する

1. エクスプローラーのアドレスバーに `shell:sendto` と入力する。
2. 開いたフォルダで右クリック →「新規作成」→「ショートカット」を選び、項目の場所に次を入力する。

   ```
   C:\Windows\System32\wsl.exe -d <ディストリ名> -- node /home/<ユーザー名>/work/dev/2026/eskra-aws-playground/apps/windows-playground/dist/scripts/media-upload.js
   ```

   `<ディストリ名>` は `wsl.exe -l` で確認する。パスは実際の clone 先に合わせる。

3. 名前を付ける（例:「メディアライブラリへ送る」）。

エクスプローラーでファイルを選び、右クリック →「送る」→ 作った項目、で保存される。

## コンソールを隠したい場合

作ったショートカットのプロパティで「実行時の大きさ」を最小化にする。

完全に隠す場合は次の `.vbs` を作り、ショートカットのターゲットをその `.vbs` にする（失敗しても何も表示されなくなる）。

```vbs
Set shell = CreateObject("WScript.Shell")
args = ""
For Each arg In WScript.Arguments
  args = args & " """ & arg & """"
Next
shell.Run "wsl.exe -d <ディストリ名> -- node /home/<ユーザー名>/.../media-upload.js" & args, 0, False
```

## 注意

- 保存しただけでは管理ツールに出てこない。2 時間ごとの同期を待つか、管理ツールの同期ボタンを押す。
- 一度に大量に選ぶと Windows のコマンドライン長の制限（約 32KB）で複数回に分けて起動される。分割されても正しく動くが、コンソールがその回数だけ開く。
- 対象は画像と動画の既知の拡張子だけ。それ以外は 1 件ずつ飛ばして続行し、最後に失敗件数が出る。
