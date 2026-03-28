# ArgoCD Applications for Ciyex Portal UI

This directory contains ArgoCD Application manifests for deploying ciyex-portal-ui across different environments.

## Applications

- **dev.yaml** - Development environment (ciyex-dev namespace)
- **stage.yaml** - Staging environment (ciyex-stage namespace)  
- **prod.yaml** - Production environment (ciyex-prod namespace)

## Setup

### 1. Install ArgoCD (if not already installed)

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Deploy ArgoCD Applications

```bash
# Apply all applications
kubectl apply -f argocd/

# Or apply individually
kubectl apply -f argocd/dev.yaml
kubectl apply -f argocd/stage.yaml
kubectl apply -f argocd/prod.yaml
```

### 3. Verify Deployments

```bash
# Check application status
kubectl get applications -n argocd

# Get detailed status
kubectl describe application ciyex-portal-ui-dev -n argocd
kubectl describe application ciyex-portal-ui-stage -n argocd
kubectl describe application ciyex-portal-ui-prod -n argocd
```

### 4. Access ArgoCD UI (optional)

```bash
# Port forward to access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Then visit: https://localhost:8080

## Sync Policy

All applications are configured with **automated sync**:
- **prune**: Automatically delete resources that are no longer defined in Git
- **selfHeal**: Automatically sync when cluster state drifts from Git
- **CreateNamespace**: Automatically create the target namespace if it doesn't exist

## Image Update Flow

When the CI/CD workflow updates kustomization.yaml files with new image tags:

1. **Alpha builds** → Update `k8s/overlays/dev/kustomization.yaml` → ArgoCD syncs to dev
2. **RC promotion** → Update `k8s/overlays/stage/kustomization.yaml` → ArgoCD syncs to stage
3. **GA promotion** → Update `k8s/overlays/prod/kustomization.yaml` → ArgoCD syncs to prod

## Manual Sync

If needed, you can manually trigger sync:

```bash
# Via kubectl
kubectl patch application ciyex-portal-ui-dev -n argocd --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'

# Via ArgoCD CLI
argocd app sync ciyex-portal-ui-dev
argocd app sync ciyex-portal-ui-stage
argocd app sync ciyex-portal-ui-prod
```

## Troubleshooting

```bash
# View sync status
kubectl get app -n argocd -w

# View application logs
kubectl logs -n argocd deployment/argocd-application-controller

# Check application events
kubectl get events -n argocd --sort-by='.lastTimestamp'
```
