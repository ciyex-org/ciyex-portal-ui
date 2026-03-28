#!/usr/bin/env bash
# Test kustomize build locally before committing
set -euo pipefail

echo "Testing kustomize builds for all environments..."
echo ""

for env in dev stage prod; do
  echo "=== Building $env overlay ==="
  if kubectl kustomize k8s/overlays/$env > /tmp/kustomize-$env.yaml 2>&1; then
    echo "✅ $env build successful"
    echo "   Resources: $(grep -c '^kind:' /tmp/kustomize-$env.yaml || echo 0)"
    echo "   Image: $(grep 'image:' /tmp/kustomize-$env.yaml | head -1 || echo 'none')"
  else
    echo "❌ $env build FAILED"
    cat /tmp/kustomize-$env.yaml
    exit 1
  fi
  echo ""
done

echo "All kustomize builds successful!"
echo "Review outputs in /tmp/kustomize-*.yaml"