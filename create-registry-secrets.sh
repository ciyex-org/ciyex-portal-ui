#!/bin/bash
set -e

REGISTRY="registry.apps-prod.us-east.in.hinisoft.com"

echo "Creating Docker registry secrets for all environments..."
echo ""

# Dev environment
echo "1. Creating regcred in ciyex-dev namespace..."
kubectl create secret docker-registry regcred \
  --docker-server=$REGISTRY \
  --docker-username=dev \
  --docker-password=${REGISTRY_DEV_PASSWORD} \
  -n ciyex-dev \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Dev secret created/updated"
echo ""

# Stage environment
echo "2. Creating regcred in ciyex-stage namespace..."
kubectl create secret docker-registry regcred \
  --docker-server=$REGISTRY \
  --docker-username=dev \
  --docker-password=${REGISTRY_DEV_PASSWORD} \
  -n ciyex-stage \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Stage secret created/updated"
echo ""

# Prod environment
echo "3. Creating regcred in ciyex-prod namespace..."
kubectl create secret docker-registry regcred \
  --docker-server=$REGISTRY \
  --docker-username=prod \
  --docker-password=${REGISTRY_PROD_PASSWORD} \
  -n ciyex-prod \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Prod secret created/updated"
echo ""

echo "=== Verifying secrets ==="
kubectl get secret regcred -n ciyex-dev
kubectl get secret regcred -n ciyex-stage
kubectl get secret regcred -n ciyex-prod

echo ""
echo "=== Restarting deployments to pick up new secrets ==="
kubectl rollout restart deployment/dev-ciyex-portal-ui -n ciyex-dev
kubectl rollout restart deployment/stage-ciyex-portal-ui -n ciyex-stage 2>/dev/null || echo "Stage deployment not found (OK if not deployed)"
kubectl rollout restart deployment/prod-ciyex-portal-ui -n ciyex-prod 2>/dev/null || echo "Prod deployment not found (OK if not deployed)"

echo ""
echo "✅ All secrets created and deployments restarted!"
echo ""
echo "Checking pod status in 10 seconds..."
sleep 10

kubectl get pods -n ciyex-dev -l app=ciyex-portal-ui
