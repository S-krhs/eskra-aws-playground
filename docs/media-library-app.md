# メディアライブラリ 管理ツールの常駐と登録

R2 に置いたメディアを見て整理する管理ツールを、WSL に常駐させて Windows のスタートメニューから開けるようにする手順です。
**Windows 側にインストールするのはブラウザだけです。** サーバは WSL の Node で動かし、画面は Chrome / Edge に PWA として登録します。

アップローダの登録は [media-library-uploader.md](./media-library-uploader.md) を参照してください。設定ファイルは同じものを共有します。

## 1. 設定ファイルへ項目を足す

アップローダで作った `~/.config/eskra-media-library/config.json` に、管理ツールが使う項目を足します。

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

- `databaseUrl` は Neon の **pooled** 接続文字列です。GitHub Secret の `DATABASE_URL` と同じ値になります。
- `syncFunctionName` は deploy 後の Lambda 関数名です。`aws lambda list-functions` か AWS コンソールで確認できます。
- 同期ボタンは Lambda を invoke するため、`~/.aws/credentials` か環境変数に、その関数への `lambda:InvokeFunction` を持つ資格情報が要ります。

## 2. 動作を確かめる

```bash
npm run media:library
```

`http://127.0.0.1:7420` を Windows のブラウザで開き、一覧と同期ボタンが出れば動いています。
ポートが使用中の場合は「既に起動しているとみなして終了します」と出て終わります。二重に立ち上がることはありません。

画面だけを直したいときは Vite の dev サーバを使います。`/api` は 7420 へ中継されるため、上のコマンドと並べて動かします。

```bash
npm run dev:ui -w @eskra-aws-playground/media-library
```

## 3. systemd user service にする

WSL が上がったら一緒に立ち上がるようにします。`/etc/wsl.conf` に systemd が有効になっている必要があります。

```ini
[boot]
systemd=true
```

書き換えたら Windows 側で `wsl --shutdown` してから WSL を開き直します。

`~/.config/systemd/user/eskra-media-library.service` を作ります。`WorkingDirectory` はこのリポジトリの場所に読み替えてください。

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

`ExecStart` はビルド済みの成果物を直接指します。登録の前に一度ビルドしてください。

```bash
npm run build -w @eskra-aws-playground/media-library
npm run build:ui -w @eskra-aws-playground/media-library
systemctl --user daemon-reload
systemctl --user enable --now eskra-media-library
systemctl --user status eskra-media-library
```

ログは `journalctl --user -u eskra-media-library -f` で追えます。
コードを更新したときは、ビルドし直してから `systemctl --user restart eskra-media-library` します。

WSL を開いていない間はサービスも止まります。ログインセッションが無くても動かしたい場合は `loginctl enable-linger $USER` を実行します。

## 4. PWA として登録する

`http://127.0.0.1:7420` を Chrome か Edge で開き、アドレスバー右のインストールアイコンから追加します。

`chrome --app=` ではなく PWA にする理由は、**すでに開いていれば新しい窓を増やさず既存の窓を前に出す**ためです。`--app=` は起動のたびに窓が増えます。

## 5. ショートカットキーを割り当てる

Web ページ側からグローバルショートカットは登録できないため、Windows のショートカット側にキーを設定します。

1. スタートメニューでインストールした項目を右クリックし、「ファイルの場所を開く」を選ぶ。
2. 出てきた .lnk のプロパティを開き、「ショートカットキー」に割り当てるキーを入力する。
3. 「適用」で保存する。

組み合わせは `Ctrl+Alt+<キー>` に固定され、任意の組み合わせは選べません。

## 制約

- `127.0.0.1` にバインドするため、スマホや別 PC からは見られません。
- Windows のブラウザから WSL へ届くのは WSL2 の localhost forwarding に依っています。ネットワークモードを変えると経路が変わります。
- タスクトレイには入りません。ウィンドウを閉じてもサーバは動いたままなので、スタートメニューから開き直します。
- アップロードした直後は一覧に出ません。2 時間ごとの cron を待つか、画面の同期ボタンを押します。
