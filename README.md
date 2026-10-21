# 星霜書店｜世界文学発掘叢書

公開情報だけを掲載する、スマートフォン向けの静的サイトです。HTML・CSS・JavaScriptのみで、ビルド・npm install・APIキー・外部API・有料サービスは不要です。

予定URL: https://nagata-999.github.io/seiso-books/

## 初回公開前の確認

**このPRのマージとPages有効化は人間の承認後に行います。** PRブランチもPublicなので公開可能な情報だけを保存します。公開サイトの承認は作品の翻訳・出版承認とは別です。

1. PRの `public-candidates.json` の全内容を確認する。
2. 承認後、サイトのPRをmainへマージする。
3. このPublicリポジトリの **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save** を選ぶ。
4. 公開URLを開き、スマートフォンで表示を確認する。

Privateの研究リポジトリを公開に変更したり、Pagesを設定したりする必要はありません。

[GitHub公式: 公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 画面

- ホーム：作品数、目標進捗、最近追加の作品、高評価作品、調査状況、出版数
- 作品一覧：原題・邦題・著者・ジャンル検索、ジャンル・評価区分の絞り込み、採点順・参考点順・年代順など
- 詳細：書誌、あらすじ、紹介文、評価内訳、強み・弱み、調査状況、原文リンク、未確認事項
- 調査記録：公開データにある登録日・最終調査日と状態のみ。内部履歴や更新差分は含めません
- 出版作品：正式な出版済み作品のみ。現状は0件です

作品一覧は24件ずつ表示します。1,000作品以上のデータをブラウザ内で検索・並べ替えます。画像・外部フォント・解析ツールは使いません。

## 公開データの更新

`public-candidates.json` は公開用の生成物です。正本にしないでください。研究リポジトリ側で、許可リスト抽出スクリプトを使用します。

```bash
# 研究リポジトリ内で実行
python scripts/export_public.py --notes research/public-notes.json --dry-run
# 全内容を人間が確認した後、公開リポジトリのチェックアウトへ出力
python scripts/export_public.py --notes research/public-notes.json --apply --output ../seiso-books/public-candidates.json
```

公開JSON以外の研究データはコピーしません。スキーマ変更時は研究側の `data/public_schema.json` とこのリポジトリの `public-schema.json` を揃えます。公開JSONの全階層は許可項目のみで構成し、内部管理メモ・戦略・認証情報・個人情報・履歴を含めません。公開用に別記した強み・弱み・未確認事項のみ掲載します。未作成の文章は「調査中」です。

```bash
node --test
```

差分を人間が確認してから専用ブランチでPRを作成し、承認後にマージしてください。自動同期や自動出版はしません。サイトの更新ボタンは**Publicの公開JSONだけ**を再取得します。Privateにはアクセスしません。未マージのJSONやChatGPTの会話は読みません。

## ローカル確認

Python標準ライブラリのプレビューを使えます。

```bash
python scripts/preview.py
# http://127.0.0.1:18744/seiso-books/
```

このURLはPC内のプレビュー用で、スマートフォン用の公開URLではありません。

## ホーム画面への追加・キャッシュ

相対パスのmanifestと192/512pxのアイコンを用意しています。iPhoneではSafariの共有メニュー →「ホーム画面に追加」、対応Androidブラウザではメニューの「ホーム画面に追加」等を利用できます。端末・ブラウザによって操作やインストール表示は異なります。実機のインストール動作は未検証です。

Service Workerとオフラインキャッシュは使いません。データは `cache: no-store` で取得し、更新ボタンと画面への復帰時（60秒以上経過時）に再取得します。取得失敗時は前回のデータと警告を表示します。GitHub Pages側の配信キャッシュによって、更新が反映されるまで時間がかかる場合があります。画面には公開データ生成時刻と最新調査日を別々に表示します。

全資産は `./` を基準にするため `/seiso-books/` で動作します。ルーティングはハッシュ方式なので作品詳細の再読み込みで404になりません。
