# Kubernetes Deployment with Kustomize

This directory contains Kustomize configurations for deploying the Ciyex EHR UI application to Kubernetes.

## Directory Structure

```
k8s/
├── base/                      # Base Kubernetes manifests
│   ├── deployment.yaml        # Base deployment configuration
│   ├── service.yaml          # Base service configuration
│   ├── ingress.yaml          # Base ingress configuration
│   └── kustomization.yaml    # Base kustomization
├── overlays/
│   ├── stage/                # Stage environment overlay
│   │   ├── kustomization.yaml
│   │   ├── deployment-patch.yaml
│   │   └── ingress-patch.yaml
│   └── prod/                 # Production environment overlay
│       ├── kustomization.yaml
│       ├── deployment-patch.yaml
│       └── ingress-patch.yaml
└── README.md
```

## Environments

### Stage Environment
- **Domain**: stg.ciyex.com
- **Replicas**: 1
- **Namespace**: default
- **TLS Secret**: ciyex-ehr-ui-stage-tls

### Production Environment
- **Domain**: app.ciyex.com
- **Replicas**: 2
- **Namespace**: default
- **TLS Secret**: ciyex-ehr-ui-prod-tls
- **Resource Limits**: 1Gi memory, 500m CPU

## Prerequisites

1. **Kustomize** installed (or use `kubectl` with built-in kustomize support)
2. **kubectl** configured to access your Kubernetes cluster
3. **cert-manager** installed in the cluster for TLS certificate management
4. **Azure Application Gateway Ingress Controller** or **NGINX Ingress Controller**

## Deployment Commands

### Preview the manifests (without applying)

**Stage:**
```bash
kubectl kustomize k8s/overlays/stage
```

**Production:**
```bash
kubectl kustomize k8s/overlays/prod
```

### Deploy to Stage

```bash
kubectl apply -k k8s/overlays/stage
```

### Deploy to Production

```bash
kubectl apply -k k8s/overlays/prod
```

### Update Image Tag

Before deploying, update the image URL and tag in the respective kustomization.yaml:

**For Stage:**
```bash
cd k8s/overlays/stage
kustomize edit set image ciyex-ehr-ui=your-registry/ciyex-ehr-ui:v1.0.0
kubectl apply -k .
```

**For Production:**
```bash
cd k8s/overlays/prod
kustomize edit set image ciyex-ehr-ui=your-registry/ciyex-ehr-ui:v1.0.0
kubectl apply -k .
```

### Alternative: Using sed to replace IMAGE_URL and IMAGE_TAG

```bash
# For Stage
kubectl kustomize k8s/overlays/stage | \
  sed "s|IMAGE_URL|your-registry/ciyex-ehr-ui|g" | \
  sed "s|IMAGE_TAG|v1.0.0|g" | \
  kubectl apply -f -

# For Production
kubectl kustomize k8s/overlays/prod | \
  sed "s|IMAGE_URL|your-registry/ciyex-ehr-ui|g" | \
  sed "s|IMAGE_TAG|v1.0.0|g" | \
  kubectl apply -f -
```

## Verify Deployment

### Check deployment status

```bash
# Stage
kubectl get deployment ciyex-ehr-ui-stage
kubectl get pods -l app=ciyex-ehr-ui

# Production
kubectl get deployment ciyex-ehr-ui-prod
kubectl get pods -l app=ciyex-ehr-ui
```

### Check service

```bash
# Stage
kubectl get service ciyex-ehr-ui-stage

# Production
kubectl get service ciyex-ehr-ui-prod
```

### Check ingress

```bash
# Stage
kubectl get ingress ciyex-ehr-ui-ingress-stage
kubectl describe ingress ciyex-ehr-ui-ingress-stage

# Production
kubectl get ingress ciyex-ehr-ui-ingress-prod
kubectl describe ingress ciyex-ehr-ui-ingress-prod
```

### Check TLS certificates

```bash
# Stage
kubectl get certificate ciyex-ehr-ui-stage-tls
kubectl describe certificate ciyex-ehr-ui-stage-tls

# Production
kubectl get certificate ciyex-ehr-ui-prod-tls
kubectl describe certificate ciyex-ehr-ui-prod-tls
```

## Rollback

```bash
# Stage
kubectl rollout undo deployment/ciyex-ehr-ui-stage

# Production
kubectl rollout undo deployment/ciyex-ehr-ui-prod
```

## Delete Deployment

```bash
# Stage
kubectl delete -k k8s/overlays/stage

# Production
kubectl delete -k k8s/overlays/prod
```

## Configuration

### Environment Variables

Environment-specific variables are configured in the respective `kustomization.yaml` files using `configMapGenerator`.

**Stage:**
- `NODE_ENV=staging`
- `NEXT_PUBLIC_API_URL=https://stg.ciyex.com/api`

**Production:**
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL=https://app.ciyex.com/api`

### Ingress Configuration

The ingress configuration follows the same pattern as the backend service:
- Uses `cert-manager.io/cluster-issuer: letsencrypt-prod` for automatic TLS certificates
- Enables SSL redirect with `appgw.ingress.kubernetes.io/ssl-redirect: "true"`
- Sets proxy body size to 1024m for large file uploads
- Uses `webapprouting.kubernetes.azure.com` ingress class for Azure Application Gateway

## CI/CD Integration

### Example Jenkins Pipeline

```groovy
stage('Deploy to Stage') {
    steps {
        sh '''
            kubectl kustomize k8s/overlays/stage | \
              sed "s|IMAGE_URL|${DOCKER_REGISTRY}/ciyex-ehr-ui|g" | \
              sed "s|IMAGE_TAG|${BUILD_TAG}|g" | \
              kubectl apply -f -
        '''
    }
}

stage('Deploy to Production') {
    when {
        branch 'main'
    }
    steps {
        sh '''
            kubectl kustomize k8s/overlays/prod | \
              sed "s|IMAGE_URL|${DOCKER_REGISTRY}/ciyex-ehr-ui|g" | \
              sed "s|IMAGE_TAG|${BUILD_TAG}|g" | \
              kubectl apply -f -
        '''
    }
}
```

## Notes

- The base manifests use placeholder values (`DOMAIN_PLACEHOLDER`, `IMAGE_URL`, `IMAGE_TAG`) that are overridden by the overlays
- Stage runs with 1 replica, Production runs with 2 replicas for high availability
- Production includes resource requests and limits for better resource management
- Both environments use the same ingress class and annotations as the backend service
- TLS certificates are automatically provisioned by cert-manager using Let's Encrypt
