# ArgoCD Deployment Issues - FIXED

## Issues Identified & Resolved

### 🔴 CRITICAL ISSUES FIXED:

#### 1. **Wrong Container Image** 
- **Problem**: Kustomizations were using `nginx` instead of the actual application
- **Fix**: Updated all overlays to use `ciyex/ciyex-portal-ui:2.0.2`
- **Files Changed**: 
  - `k8s/overlays/dev/kustomization.yaml`
  - `k8s/overlays/stage/kustomization.yaml` 
  - `k8s/overlays/prod/kustomization.yaml`

#### 2. **Missing Health Check Endpoint**
- **Problem**: Probes hitting `/` which may not be ready during startup
- **Fix**: Created `/api/health` endpoint with proper health checks
- **Files Changed**:
  - `src/app/api/health/route.ts` (NEW)
  - `k8s/base/deployment.yaml` (updated probe paths)

#### 3. **Environment Variables Not Injected**
- **Problem**: ConfigMaps created but not referenced in deployments
- **Fix**: Added `envFrom` patches to inject ConfigMap variables
- **Files Changed**: All `kustomization.yaml` files

#### 4. **Inconsistent Ingress Configuration**
- **Problem**: Base ingress used Azure ingress class, overlays used nginx
- **Fix**: Standardized on nginx ingress class
- **Files Changed**: `k8s/base/ingress.yaml`

#### 5. **Missing Resource Limits**
- **Problem**: No resource limits causing potential resource starvation
- **Fix**: Added proper CPU/memory requests and limits
- **Files Changed**: `k8s/base/deployment.yaml`

### 🟡 IMPROVEMENTS MADE:

#### 1. **Enhanced Health Checks**
- Increased timeout and retry values for more reliable startup
- Created startup script for manual testing: `scripts/health-check.sh`

#### 2. **Better Error Handling**
- Health endpoint provides detailed status information
- Supports both GET and HEAD requests for flexibility

#### 3. **Proper Environment Configuration**
- Dev environment uses existing `.env.dev` file
- Stage environment uses `.env.stage` file
- Prod environment uses inline literals for security

## Next Steps:

### 🚀 **Deploy & Test**:
1. Commit these changes to your repository
2. ArgoCD will automatically sync the changes
3. Monitor the application health in ArgoCD UI
4. Verify the health endpoint: `curl https://ciyex-portal.apps-dev.in.hinisoft.com/api/health`

### 🔍 **Monitoring**:
- Health endpoint: `/api/health`
- Check ArgoCD for sync status
- Verify pods are running: `kubectl get pods -n ciyex-dev`
- Check logs: `kubectl logs -f deployment/dev-ciyex-portal-ui -n ciyex-dev`

### ⚠️ **If Issues Persist**:
1. Check if the container image `ciyex/ciyex-portal-ui:2.0.2` exists in your registry
2. Verify ConfigMaps are created: `kubectl get configmaps -n ciyex-dev`
3. Check ingress status: `kubectl get ingress -n ciyex-dev`
4. Review ArgoCD application events in the UI

## Files Modified:

```
✅ k8s/base/deployment.yaml          - Fixed health checks, added resources, env config
✅ k8s/base/ingress.yaml             - Fixed ingress class consistency  
✅ k8s/overlays/dev/kustomization.yaml    - Fixed image, added env injection
✅ k8s/overlays/stage/kustomization.yaml  - Fixed image, added env injection
✅ k8s/overlays/prod/kustomization.yaml   - Fixed image, added env injection
✅ src/app/api/health/route.ts       - NEW health check endpoint
✅ scripts/health-check.sh           - NEW health check script
```

## Expected Result:
- ✅ ArgoCD status: **Healthy** (instead of Degraded)
- ✅ Application accessible via ingress
- ✅ Health endpoint responding
- ✅ Proper environment variables loaded
- ✅ Resource limits preventing cluster issues