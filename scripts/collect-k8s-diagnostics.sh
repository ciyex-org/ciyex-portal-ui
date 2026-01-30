#!/usr/bin/env bash
set -euo pipefail
OUTDIR="/tmp/ciyex-diagnostics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTDIR"

NAMESPACE=${1:-ciyex-dev}

echo "Collecting diagnostics for namespace: $NAMESPACE -> $OUTDIR"

kubectl get ns "$NAMESPACE" -o yaml > "$OUTDIR/namespace.yaml" 2>&1 || true
kubectl get all -n "$NAMESPACE" -o wide > "$OUTDIR/00-all-resources.txt" 2>&1 || true
kubectl get deploy -n "$NAMESPACE" -o yaml > "$OUTDIR/deployments.yaml" 2>&1 || true
kubectl get pods -n "$NAMESPACE" -o wide > "$OUTDIR/pods.txt" 2>&1 || true
kubectl describe pods -n "$NAMESPACE" > "$OUTDIR/pods-describe.txt" 2>&1 || true
kubectl logs -n "$NAMESPACE" --all-containers=true --tail=200 > "$OUTDIR/all-logs.txt" 2>&1 || true
kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' > "$OUTDIR/events.txt" 2>&1 || true

echo "Diagnostics collected at: $OUTDIR"

echo "You can archive and paste the content or share the directory path."