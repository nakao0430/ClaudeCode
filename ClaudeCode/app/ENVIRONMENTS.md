# Recipe App - 環境構成

## 環境一覧

| 項目 | 開発環境 (dev) | 本番環境 (prod) |
|------|---------------|----------------|
| フロントエンドURL | http://localhost:4200 | https://d2jq01gzg2tnv3.cloudfront.net |
| API エンドポイント | https://6ktneh4x3h.execute-api.ap-southeast-2.amazonaws.com/dev | https://lawp3kyoc1.execute-api.ap-southeast-2.amazonaws.com/prod |
| リージョン | ap-southeast-2 (Sydney) | ap-southeast-2 (Sydney) |
| CloudFormation スタック名 | recipe-app-dev | recipe-app-prod |

## AWS リソース

### 認証 (Cognito)

| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| User Pool ID | ap-southeast-2_Nfm8IbtBO | ap-southeast-2_GPfU7LCU6 |
| Client ID | eapprjju8g9rurmc5img8rn66 | 4je2a9evm8ai144gb31lrp87br |
| User Pool 名 | recipe-app-dev-user-pool | recipe-app-prod-user-pool |

### データベース (DynamoDB)

| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| テーブル名 | recipe-app-dev-recipes | recipe-app-prod-recipes |

### ストレージ (S3)

| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| 画像バケット | recipe-app-dev-images | recipe-app-prod-images |
| フロントエンドバケット | - (ローカル開発) | recipe-app-prod-frontend |
| Lambda コードバケット | recipe-app-test-bucket (lambda.zip) | recipe-app-test-bucket (lambda-prod.zip) |

### CDN (CloudFront)

| 項目 | 本番環境のみ |
|------|-------------|
| Distribution ID | E2UP2MGJZU7OI5 |
| ドメイン | d2jq01gzg2tnv3.cloudfront.net |

### Lambda 関数

| 関数 | 開発環境 | 本番環境 |
|------|---------|---------|
| レシピ一覧 (GET/POST) | recipe-app-dev-recipes | recipe-app-prod-recipes |
| レシピ詳細 (GET/PUT/DELETE) | recipe-app-dev-recipe | recipe-app-prod-recipe |
| お気に入り (PUT) | recipe-app-dev-favorite | recipe-app-prod-favorite |
| 画像アップロード | recipe-app-dev-upload | recipe-app-prod-upload |

## 開発フロー

### ローカル開発

```bash
# フロントエンド起動 (開発環境APIに接続)
cd client
ng serve
# → http://localhost:4200
```

### 本番デプロイ

```bash
# デプロイスクリプトを実行
bash scripts/deploy-prod.sh
```

デプロイスクリプトは以下を自動実行します:
1. API (Lambda) のビルド・パッケージング・S3アップロード
2. CloudFormation スタックの作成/更新
3. CORS 設定の更新 (CloudFront ドメイン)
4. Angular の本番ビルド (environment.prod.ts 使用)
5. S3 へのフロントエンドアップロード
6. CloudFront キャッシュの無効化

### Lambda 関数のみ更新する場合

```bash
# API ビルド
cd api
npm run build

# パッケージング (PowerShell)
powershell -Command "
  Remove-Item lambda-prod.zip -ErrorAction SilentlyContinue
  Compress-Archive -Path dist\* -DestinationPath lambda-prod.zip
  Compress-Archive -Path package.json -DestinationPath lambda-prod.zip -Update
  Compress-Archive -Path node_modules -DestinationPath lambda-prod.zip -Update
"

# S3 アップロード
aws s3 cp lambda-prod.zip s3://recipe-app-test-bucket/lambda-prod.zip --region ap-southeast-2

# Lambda 関数更新
aws lambda update-function-code --function-name recipe-app-prod-recipes --s3-bucket recipe-app-test-bucket --s3-key lambda-prod.zip --region ap-southeast-2
aws lambda update-function-code --function-name recipe-app-prod-recipe --s3-bucket recipe-app-test-bucket --s3-key lambda-prod.zip --region ap-southeast-2
aws lambda update-function-code --function-name recipe-app-prod-upload --s3-bucket recipe-app-test-bucket --s3-key lambda-prod.zip --region ap-southeast-2
aws lambda update-function-code --function-name recipe-app-prod-favorite --s3-bucket recipe-app-test-bucket --s3-key lambda-prod.zip --region ap-southeast-2
```

### フロントエンドのみ更新する場合

```bash
# 本番ビルド
cd client
npx ng build --configuration=production

# S3 にアップロード
aws s3 sync dist/client/browser s3://recipe-app-prod-frontend --delete --region ap-southeast-2

# CloudFront キャッシュ無効化
aws cloudfront create-invalidation --distribution-id E2UP2MGJZU7OI5 --paths "/*"
```

## 設定ファイル

| ファイル | 用途 |
|---------|------|
| `client/src/app/core/config/environment.ts` | 開発環境の接続先設定 |
| `client/src/app/core/config/environment.prod.ts` | 本番環境の接続先設定 |
| `infra/template.yaml` | AWS インフラ定義 (dev/prod 共通) |
| `scripts/deploy-prod.sh` | 本番デプロイスクリプト |

## 注意事項

- 開発環境と本番環境は完全に分離されています (ユーザー、データ、画像すべて別)
- 開発環境での変更は本番環境に影響しません
- 本番環境への反映は `deploy-prod.sh` を明示的に実行する必要があります
- CloudFront のキャッシュ反映には数分かかる場合があります
