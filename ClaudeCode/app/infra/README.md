# インフラストラクチャ

## 概要

このディレクトリには、レシピ管理アプリのAWSインフラをCloudFormationで定義したテンプレートが含まれています。

## 前提条件

- AWS CLI がインストールされ、設定されていること
- 適切なIAM権限（CloudFormation, Cognito, DynamoDB, Lambda, API Gateway, S3の作成権限）

## デプロイ手順

### MVP Phase 1: Cognito（認証機能）

```bash
# Dev環境へのデプロイ
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name recipe-app-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1

# 出力値の取得
aws cloudformation describe-stacks \
  --stack-name recipe-app-dev \
  --query "Stacks[0].Outputs" \
  --region ap-northeast-1
```

### 出力値の設定

デプロイ後、以下の出力値を取得して `client/src/app/core/config/environment.ts` に設定してください:

- `UserPoolId` → `cognitoUserPoolId`
- `UserPoolClientId` → `cognitoClientId`
- `Region` → `region`

### 削除方法

```bash
aws cloudformation delete-stack \
  --stack-name recipe-app-dev \
  --region ap-northeast-1
```

## パラメータ

- **Environment**: 環境名（dev または prod）
- **AllowedOrigins**: CORS設定で許可するオリジン（カンマ区切り）

## 今後の拡張

MVP Phase 2以降で以下のリソースを追加予定:

- DynamoDB Table（レシピデータ保存）
- Lambda Functions（API処理）
- API Gateway（RESTful API）
- S3 Bucket（画像保存）
