#!/bin/bash
set -e

# ============================================
# Recipe App - Production Deployment Script
# ============================================

REGION="ap-southeast-2"
STACK_NAME="recipe-app-prod"
ENVIRONMENT="prod"
LAMBDA_CODE_BUCKET="recipe-app-test-bucket"
LAMBDA_CODE_KEY="lambda-prod.zip"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="${SCRIPT_DIR}/../api"
CLIENT_DIR="${SCRIPT_DIR}/../client"
INFRA_DIR="${SCRIPT_DIR}/../infra"

echo "=========================================="
echo "  Recipe App - Production Deployment"
echo "=========================================="

# ============================================
# Step 1: Build and upload Lambda code
# ============================================
echo ""
echo "[Step 1/6] Building API..."
cd "${API_DIR}"
npm run build

echo "[Step 2/6] Packaging Lambda..."
API_WIN_DIR=$(cygpath -w "${API_DIR}" 2>/dev/null || echo "${API_DIR}")
powershell.exe -Command "
  Remove-Item -Path '${API_WIN_DIR}\lambda-prod.zip' -ErrorAction SilentlyContinue
  Compress-Archive -Path '${API_WIN_DIR}\dist\*' -DestinationPath '${API_WIN_DIR}\lambda-prod.zip'
  Compress-Archive -Path '${API_WIN_DIR}\package.json' -DestinationPath '${API_WIN_DIR}\lambda-prod.zip' -Update
  Compress-Archive -Path '${API_WIN_DIR}\node_modules' -DestinationPath '${API_WIN_DIR}\lambda-prod.zip' -Update
  Write-Host 'Packaging complete'
"

echo "Uploading Lambda package to S3..."
aws s3 cp "${API_DIR}/lambda-prod.zip" "s3://${LAMBDA_CODE_BUCKET}/${LAMBDA_CODE_KEY}" --region "${REGION}"
rm -f "${API_DIR}/lambda-prod.zip"

# ============================================
# Step 3: Deploy/Update CloudFormation stack
# ============================================
echo ""
echo "[Step 3/6] Getting stack info..."
cd "${INFRA_DIR}"

# Check if stack already exists
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "${STACK_STATUS}" = "DOES_NOT_EXIST" ]; then
  echo "Creating new stack..."
  INFRA_WIN_DIR=$(cygpath -w "${INFRA_DIR}/template.yaml" 2>/dev/null || echo "${INFRA_DIR}/template.yaml")
  aws cloudformation create-stack \
    --stack-name "${STACK_NAME}" \
    --template-body "file://${INFRA_WIN_DIR}" \
    --parameters \
      ParameterKey=Environment,ParameterValue="${ENVIRONMENT}" \
      ParameterKey=AllowedOrigins,ParameterValue="https://placeholder.example.com" \
      ParameterKey=LambdaCodeBucket,ParameterValue="${LAMBDA_CODE_BUCKET}" \
      ParameterKey=LambdaCodeKey,ParameterValue="${LAMBDA_CODE_KEY}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "${REGION}"
  echo "Waiting for stack creation..."
  aws cloudformation wait stack-create-complete --stack-name "${STACK_NAME}" --region "${REGION}"
fi

# ============================================
# Step 4: Get stack outputs
# ============================================
echo ""
echo "[Step 4/6] Getting stack outputs..."

get_output() {
  aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

API_ENDPOINT=$(get_output "ApiEndpoint")
USER_POOL_ID=$(get_output "UserPoolId")
USER_POOL_CLIENT_ID=$(get_output "UserPoolClientId")
CLOUDFRONT_DIST_ID=$(get_output "CloudFrontDistributionId")
FRONTEND_BUCKET=$(get_output "FrontendBucketName")
FRONTEND_URL=$(get_output "FrontendUrl")

echo "  API Endpoint:    ${API_ENDPOINT}"
echo "  User Pool ID:    ${USER_POOL_ID}"
echo "  Client ID:       ${USER_POOL_CLIENT_ID}"
echo "  Frontend URL:    ${FRONTEND_URL}"
echo "  Frontend Bucket: ${FRONTEND_BUCKET}"

# Update CORS if needed
echo ""
echo "[Step 4.5/6] Updating CORS with CloudFront domain..."
INFRA_WIN_DIR=$(cygpath -w "${INFRA_DIR}/template.yaml" 2>/dev/null || echo "${INFRA_DIR}/template.yaml")
aws cloudformation update-stack \
  --stack-name "${STACK_NAME}" \
  --template-body "file://${INFRA_WIN_DIR}" \
  --parameters \
    ParameterKey=Environment,ParameterValue="${ENVIRONMENT}" \
    ParameterKey=AllowedOrigins,ParameterValue="${FRONTEND_URL}" \
    ParameterKey=LambdaCodeBucket,ParameterValue="${LAMBDA_CODE_BUCKET}" \
    ParameterKey=LambdaCodeKey,ParameterValue="${LAMBDA_CODE_KEY}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "${REGION}" 2>/dev/null && \
  aws cloudformation wait stack-update-complete --stack-name "${STACK_NAME}" --region "${REGION}" || \
  echo "No CORS update needed (already up to date)"

# ============================================
# Step 5: Build Angular for production
# ============================================
echo ""
echo "[Step 5/6] Building Angular for production..."

cd "${CLIENT_DIR}"

cat > src/app/core/config/environment.prod.ts << EOF
export const environment = {
  production: true,
  apiUrl: '${API_ENDPOINT}',
  cognitoUserPoolId: '${USER_POOL_ID}',
  cognitoClientId: '${USER_POOL_CLIENT_ID}',
  region: '${REGION}',
};
EOF

npx ng build --configuration=production

# ============================================
# Step 6: Deploy to S3 and invalidate CloudFront
# ============================================
echo ""
echo "[Step 6/6] Deploying frontend to S3..."

aws s3 sync dist/client/browser "s3://${FRONTEND_BUCKET}" \
  --delete \
  --region "${REGION}"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DIST_ID}" \
  --paths "/*" \
  --region "${REGION}" > /dev/null

# ============================================
# Done!
# ============================================
echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend URL: ${FRONTEND_URL}"
echo "  API Endpoint: ${API_ENDPOINT}"
echo ""
echo "  Note: CloudFront may take a few minutes"
echo "  to propagate the changes globally."
echo "=========================================="
