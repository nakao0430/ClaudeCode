# レシピ管理 Web アプリ

料理のレシピを管理する Web アプリケーションです。  
フロントは Angular（SPA）、API は Node.js（Lambda）、インフラは AWS を CloudFormation でコード管理しています。

## 設計ドキュメント

プログラムの詳細や画面・API・処理の流れは **docs/** フォルダの Markdown で管理しています。  
まずは [docs/README.md](docs/README.md) から目次を確認してください。

## プロジェクト構成

| フォルダ | 内容 |
|----------|------|
| **docs/** | 設計ドキュメント（画面・API・処理フロー・インフラ） |
| **infra/** | AWS CloudFormation テンプレート |
| **api/** | Node.js API（Lambda 用） |
| **client/** | Angular SPA |

## 開発の進め方

### 必要な環境

- Node.js 20.x（LTS）
- Angular CLI: `npm install -g @angular/cli`
- AWS CLI（インフラデプロイ時）

### API（api/）

```bash
cd api
npm install
npm run build
```

**ローカルで API を動かす**: DynamoDB のテーブル名を指定して `npm start` を実行します（AWS にテーブルがある場合、または DynamoDB Local 利用時）。

```bash
RECIPES_TABLE=recipe-app-dev-recipes npm start
```

デプロイ時は Lambda 用 ZIP を作成して S3 にアップロードし、[infra/README.md](infra/README.md) の手順に従ってください。

### クライアント（client/）

```bash
cd client
npm install
npm start          # 開発サーバー起動（http://localhost:4200）
npm run build      # 本番ビルド（dist/client/browser/ に出力）
```

### インフラ（infra/）

CloudFormation のデプロイ手順・必須パラメータは [infra/README.md](infra/README.md) を参照してください。

```bash
cd infra
# aws cloudformation deploy 等（README の手順に従う）
```

## ライセンス

（必要に応じて記載）
