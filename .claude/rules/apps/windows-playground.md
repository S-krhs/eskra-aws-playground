---
paths:
  - "apps/windows-playground/**"
---

# Windows Playground

Windows のエクスプローラーから `wsl.exe` 経由で起動するツールを置く app です。利用者向けの説明は `apps/windows-playground/README.md`、登録手順は `docs/media-library-uploader.md` にあります。

- Windows 側に何もインストールしない前提を崩さない。Windows 専用の binary や Node の同梱を持ち込まず、実行は WSL の Node に閉じる。
- 引数は Windows のパス(`C:\...`)で渡る。読み書きの前に必ず WSL のパスへ変換する。
- SendTo はコマンドライン長の約 32KB 制限で複数回に分けて起動する。1 回の起動が選択の部分集合であることを前提にし、全件が揃っている前提の処理を書かない。
- アップローダは R2 へ保存するだけとし、DB へ書かない。UUID と元のファイル名は object metadata に載せ、DB への反映は同期 batch に任せる。
- key と metadata の規約は `shared-domains` の `media-object-key` / `media-object-metadata` を使う。app 側で組み立て直さない。
- Windows の作成日時は WSL の `stat` から取れない(`birthtime` が epoch 0 になる)。更新日時を使い、作成日時が要るなら `powershell.exe` 経由になることを踏まえて判断する。
- 認証情報を含む設定ファイルの内容は、ログにもエラーメッセージにも出さない。検証失敗は項目名とファイルパスだけを示す。
- 設定ファイルの場所は `shared-domains` の `media-library-config` から取る。管理ツール(`media-library`)と同じファイルを読むため、app 側でパスを組み立て直さない。項目の検証はそれぞれの app が自分に必要な分だけ行う。
- 1 件の失敗で全体を止めない。ファイルごとに結果を出し、最後に失敗件数を終了コードへ反映する。
