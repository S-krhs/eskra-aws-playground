# メディアライブラリ 管理ツールの常駐と登録

アップローダの設定ファイルを共有する。先に [media-library-uploader.md](./media-library-uploader.md) を参照。

## 1. 設定ファイルへ項目を足す

`~/.config/eskra-media-library/config.json` に管理ツールが使う項目を足す。

```json
{
  "bucket": "eskra-media-library",
  "r2": {
    "accountId": "...",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  },
  "databaseUrl": "postgresql://...",
  "syncFunctionName": "eskra-aws-playground-develop-media-sync",
  "awsRegion": "ap-southeast-1"
}
```

- `databaseUrl` は Neon の pooled 接続文字列（GitHub Secret `DATABASE_URL` と同じ値）。
- `syncFunctionName` は deploy 後の Lambda 関数名。`aws lambda list-functions` か AWS コンソールで確認する。
- 同期ボタンが Lambda を invoke するため、`~/.aws/credentials` か環境変数に、その関数への `lambda:InvokeFunction` を持つ資格情報を用意する。

## 2. 動作を確かめる

```bash
npm run media:library
```

`http://127.0.0.1:7420` を Windows のブラウザで開く。ポートが使用中の場合はそのまま終了する。

画面だけを直すときは Vite の dev サーバを並行して動かす（`/api` は 7420 へ中継される）。

```bash
npm run dev:ui -w @eskra-aws-playground/media-library
```

## 3. systemd user service にする

`/etc/wsl.conf` に systemd を有効化する。

```ini
[boot]
systemd=true
```

書き換えたら Windows 側で `wsl --shutdown` してから WSL を開き直す。

`~/.config/systemd/user/eskra-media-library.service` を作る（`WorkingDirectory` はこのリポジトリの場所に読み替える）。

```ini
[Unit]
Description=Eskra media library
After=default.target

[Service]
Type=simple
WorkingDirectory=%h/work/dev/2026/eskra-aws-playground
ExecStart=/usr/bin/env node apps/media-library/backend/dist/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

登録前にビルドする。

```bash
npm run build -w @eskra-aws-playground/media-library
npm run build:ui -w @eskra-aws-playground/media-library
systemctl --user daemon-reload
systemctl --user enable --now eskra-media-library
systemctl --user status eskra-media-library
```

ログ: `journalctl --user -u eskra-media-library -f`

コード更新後: ビルドし直してから `systemctl --user restart eskra-media-library`

ログインセッションが無くても動かす場合: `loginctl enable-linger $USER`

## 4. PWA として登録する

`http://127.0.0.1:7420` を Chrome か Edge で開き、アドレスバー右のインストールアイコンから追加する。

## 5. ショートカットキーを割り当てる

1. スタートメニューでインストールした項目を右クリックし、「ファイルの場所を開く」を選ぶ。
2. 出てきた .lnk のプロパティを開き、「ショートカットキー」に割り当てるキーを入力する。
3. 「適用」で保存する。

組み合わせは `Ctrl+Alt+<キー>` に固定される。

## 制約

- `127.0.0.1` にバインドするため、スマホや別 PC からは見られない。
- タスクトレイには入らない。ウィンドウを閉じてもサーバは動いたままなので、スタートメニューから開き直す。
- アップロードした直後は一覧に出ない。2 時間ごとの cron を待つか、画面の同期ボタンを押す。
