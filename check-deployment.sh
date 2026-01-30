#!/bin/bash

echo "=== Checking ArgoCD Application Status ==="
echo ""

# Check if regcred secret exists in the namespace
echo "1. Checking if 'regcred' secret exists in ciyex-dev namespace:"
kubectl get secret regcred -n ciyex-dev 2>&1

echo ""
echo "2. Checking pod status in ciyex-dev:"
kubectl get pods -n ciyex-dev 2>&1 | head -20

echo ""
echo "3. Checking deployment status:"
kubectl get deployment dev-ciyex-portal-ui -n ciyex-dev 2>&1

echo ""
echo "4. Describing pods to see errors:"
kubectl describe pods -n ciyex-dev -l app=ciyex-portal-ui 2>&1 | grep -A 10 "Events:"

echo ""
echo "5. Checking pod logs if any pods exist:"
POD=$(kubectl get pods -n ciyex-dev -l app=ciyex-portal-ui -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$POD" ]; then
    echo "Latest pod logs from $POD:"
    kubectl logs -n ciyex-dev $POD --tail=50 2>&1
else
    echo "No pods found"
fi

echo ""
echo "=== SOLUTION ==="
echo "If 'regcred' secret is missing, you need to create it with:"
echo "kubectl create secret docker-registry regcred \\"
echo "  --docker-server=registry.apps-prod.us-east.in.hinisoft.com \\"
echo "  --docker-username=<USERNAME> \\"
echo "  --docker-password=<PASSWORD> \\"
echo "  -n ciyex-dev"
