#!/bin/bash
set -e

echo "Applying registry secrets to Kubernetes cluster..."
echo ""

kubectl apply -f /home/dhivya/workspace/ciyex-portal-ui/k8s/registry-secrets.yaml

echo ""
echo "✅ Secrets applied successfully!"
echo ""

echo "Restarting deployments..."
kubectl rollout restart deployment/dev-ciyex-portal-ui -n ciyex-dev 2>/dev/null || echo "⚠️  Dev deployment not found"
kubectl rollout restart deployment/stage-ciyex-portal-ui -n ciyex-stage 2>/dev/null || echo "⚠️  Stage deployment not found"
kubectl rollout restart deployment/prod-ciyex-portal-ui -n ciyex-prod 2>/dev/null || echo "⚠️  Prod deployment not found"

echo ""
echo "Waiting 15 seconds for pods to restart..."
sleep 15

echo ""
echo "=== Dev Environment Status ==="
kubectl get pods -n ciyex-dev -l app=ciyex-portal-ui

echo ""
echo "=== Checking if pods are pulling images successfully ==="
kubectl describe pods -n ciyex-dev -l app=ciyex-portal-ui | grep -A 5 "Events:" | head -30

echo ""
echo "✅ Done! Check ArgoCD UI for Healthy status"
