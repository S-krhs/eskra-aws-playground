# メディアライブラリ アップローダの登録

エクスプローラーで選んだ画像・動画を、右クリックの「送る」から R2 へ保存できるようにする手順です。
**Windows 側には何もインストールしません。** Node は WSL のものを使い、Windows 標準の `wsl.exe` から呼び出します。

## 1. 設定ファイルを置く

WSL 側に `~/.config/eskra-media-library/config.json` を作ります。

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

R2 の API トークンは Cloudflare のダッシュボードで作り、**対象 bucket の Object Read & Write に絞ります**。
このファイルは git 管理下に置かないでください。

**`bucket` は同期 Lambda が読む bucket と同じ名前にしてください。** 同期側の名前は `infra/sst.config.ts` の `mediaBucketName` にあります。ここがずれると、アップロードは成功するのに管理ツールへいつまでも出てきません。

## 2. ビルドする

```bash
npm run build
```

`apps/windows-playground/dist/scripts/media-upload.js` ができます。

## 3. 動作を確かめる

WSL から直接叩いて、保存されるところまで確認します。

```bash
npm run media:upload -- /mnt/c/Users/<ユーザー名>/Pictures/test.png
```

`保存しました: _inbox/20260907-133045123.png` のように出れば成功です。

## 4. 「送る」に登録する

エクスプローラーのアドレスバーに `shell:sendto` と入力すると、送るメニューのフォルダが開きます。
そこで右クリック →「新規作成」→「ショートカット」を選び、項目の場所に次を入力します。

```
C:\Windows\System32\wsl.exe -d <ディストリ名> -- node /home/<ユーザー名>/work/dev/2026/eskra-aws-playground/apps/windows-playground/dist/scripts/media-upload.js
```

`<ディストリ名>` は `wsl.exe -l` で確認できます。パスは実際の clone 先に合わせてください。
名前は「メディアライブラリへ送る」など分かるものにします。

これで、エクスプローラーでファイルを選んで右クリック →「送る」→ 作った項目、で保存されます。

## コンソールを隠したい場合

既定では `wsl.exe` のコンソールが開き、そこに進捗と結果が出ます。
隠したい場合は、作ったショートカットのプロパティで「実行時の大きさ」を **最小化** にします。
完全に隠すなら、次の内容の `.vbs` を作り、ショートカットのターゲットをその `.vbs` にします。

```vbs
' 引数のファイルをコンソールを出さずにアップロードする
Set shell = CreateObject("WScript.Shell")
args = ""
For Each arg In WScript.Arguments
  args = args & " """ & arg & """"
Next
shell.Run "wsl.exe -d <ディストリ名> -- node /home/<ユーザー名>/.../media-upload.js" & args, 0, False
```

ただし**失敗しても何も表示されなくなります**。慣れるまではコンソールを出したままを勧めます。

## 注意

- **保存しただけでは管理ツールに出てきません。** 2 時間ごとの同期を待つか、管理ツールの同期ボタンを押してください。
- 一度に大量に選ぶと、Windows のコマンドライン長の制限（約 32KB）で**複数回に分けて起動されます**。分割されても正しく動きますが、コンソールがその回数だけ開きます。
- 対象は画像と動画の既知の拡張子だけです。それ以外は 1 件ずつ飛ばして続行し、最後に失敗件数が出ます。
