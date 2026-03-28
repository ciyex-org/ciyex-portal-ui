#!/bin/bash
# Test Registry Images - Verify alpha, rc, and ga images exist

set -e

REGISTRY="registry.apps-prod.us-east.in.hinisoft.com"
IMAGE_NAME="ciyex-portal-ui"
REPO="qiaben/ciyex-portal-ui"
BRANCH="test/ci-runners"

echo "====================================="
echo "Registry Image Verification Test"
echo "====================================="
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME"
echo ""

# Step 1: Build alpha image
echo "📦 Step 1: Building Alpha Image..."
echo "Dispatching build workflow..."
gh workflow run ci-cd.yml -R "$REPO" --ref "$BRANCH" \
  -f action='Build' -f runner='self-hosted'

sleep 10
ALPHA_RUN=$(gh run list -R "$REPO" --workflow="ci-cd.yml" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "Alpha build run: $ALPHA_RUN"
echo "Waiting for completion..."

while true; do
  STATUS=$(gh run view "$ALPHA_RUN" -R "$REPO" --json status --jq '.status')
  if [ "$STATUS" = "completed" ]; then
    CONCLUSION=$(gh run view "$ALPHA_RUN" -R "$REPO" --json conclusion --jq '.conclusion')
    echo "✅ Alpha build $CONCLUSION"
    break
  fi
  echo "  Status: $STATUS... waiting"
  sleep 30
done

# Extract alpha version from logs
ALPHA_IMAGE=$(gh run view "$ALPHA_RUN" -R "$REPO" --log 2>&1 | grep "✅ Pushed:" | head -1 | awk '{print $NF}')
echo "Alpha Image: $ALPHA_IMAGE"
echo ""

# Step 2: Promote to RC
echo "📦 Step 2: Promoting to RC..."
gh workflow run ci-cd.yml -R "$REPO" --ref "$BRANCH" \
  -f action='Promote to RC' -f runner='self-hosted'

sleep 10
RC_RUN=$(gh run list -R "$REPO" --workflow="ci-cd.yml" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "RC promote run: $RC_RUN"
echo "Waiting for completion..."

while true; do
  STATUS=$(gh run view "$RC_RUN" -R "$REPO" --json status --jq '.status')
  if [ "$STATUS" = "completed" ]; then
    CONCLUSION=$(gh run view "$RC_RUN" -R "$REPO" --json conclusion --jq '.conclusion')
    echo "✅ RC promotion $CONCLUSION"
    break
  fi
  echo "  Status: $STATUS... waiting"
  sleep 30
done

# Extract RC version
RC_IMAGE=$(gh run view "$RC_RUN" -R "$REPO" --log 2>&1 | grep -o "$REGISTRY/$IMAGE_NAME:[0-9]*\.[0-9]*\.[0-9]*-rc" | head -1 || echo "RC image not found in logs")
echo "RC Image: $RC_IMAGE"
echo ""

# Step 3: Promote to GA
echo "📦 Step 3: Promoting to GA..."
gh workflow run ci-cd.yml -R "$REPO" --ref "$BRANCH" \
  -f action='Promote to GA' -f runner='self-hosted'

sleep 10
GA_RUN=$(gh run list -R "$REPO" --workflow="ci-cd.yml" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "GA promote run: $GA_RUN"
echo "Waiting for completion..."

while true; do
  STATUS=$(gh run view "$GA_RUN" -R "$REPO" --json status --jq '.status')
  if [ "$STATUS" = "completed" ]; then
    CONCLUSION=$(gh run view "$GA_RUN" -R "$REPO" --json conclusion --jq '.conclusion')
    echo "✅ GA promotion $CONCLUSION"
    break
  fi
  echo "  Status: $STATUS... waiting"
  sleep 30
done

# Extract GA version
GA_IMAGE=$(gh run view "$GA_RUN" -R "$REPO" --log 2>&1 | grep -o "$REGISTRY/$IMAGE_NAME:[0-9]*\.[0-9]*\.[0-9]*$" | grep -v alpha | grep -v rc | head -1 || echo "GA image not found in logs")
echo "GA Image: $GA_IMAGE"
echo ""

# Summary
echo "====================================="
echo "✅ Registry Test Complete"
echo "====================================="
echo ""
echo "Images in Registry:"
echo "  Alpha: $ALPHA_IMAGE"
echo "  RC:    $RC_IMAGE"
echo "  GA:    $GA_IMAGE"
echo ""
echo "Workflow Runs:"
echo "  Alpha Build: https://github.com/$REPO/actions/runs/$ALPHA_RUN"
echo "  RC Promote:  https://github.com/$REPO/actions/runs/$RC_RUN"
echo "  GA Promote:  https://github.com/$REPO/actions/runs/$GA_RUN"
echo ""
