# CI/CD Pipeline Fix Guide

## Issue Identified
- Registry `registry.apps-prod.us-east.in.hinisoft.com` is private (DNS resolves to 10.0.0.105)
- GitHub-hosted runners cannot access it (DNS lookup fails publicly)
- All workflows fail at "Login to Private Registry" step

## Recommended Solution: Self-Hosted Runner

### Step 1: Install Self-Hosted Runner
Run these commands on a machine inside your network (same network as registry):

```bash
# 1. Create runner directory
mkdir ~/actions-runner && cd ~/actions-runner

# 2. Download runner (Linux x64)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# 3. Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# 4. Get registration token (run this command to get token)
gh api --method POST -H "Accept: application/vnd.github+json" repos/qiaben/ciyex-portal-ui/actions/runners/registration-token --jq .token

# 5. Configure runner (replace TOKEN with output from step 4)
./config.sh --url https://github.com/qiaben/ciyex-portal-ui --token TOKEN

# 6. Install as service (optional but recommended)
sudo ./svc.sh install
sudo ./svc.sh start

# 7. Test connectivity to registry
nslookup registry.apps-prod.us-east.in.hinisoft.com
curl -I https://registry.apps-prod.us-east.in.hinisoft.com/v2/
```

### Step 2: Update Workflow to Use Self-Hosted Runner

The workflow is already configured to accept a `runner` input. Dispatch with:

```bash
gh workflow run ci-cd.yml --repo qiaben/ciyex-portal-ui --ref test/ci-runners -f action='Build' -f runner='self-hosted'
```

### Step 2b: Enable internal registry actions (optional)

If you want the workflow to perform `docker login` and `docker push` during runs, add the repository secret `USE_INTERNAL_REGISTRY` with the value `true`. This ensures the workflow only tries to push when you explicitly enable internal registry access (for example, when running on your self-hosted runner).

Go to: https://github.com/qiaben/ciyex-portal-ui/settings/secrets/actions and add:
- `USE_INTERNAL_REGISTRY` = `true`

### Step 3: Set Required Secrets in GitHub

Go to: https://github.com/qiaben/ciyex-portal-ui/settings/secrets/actions

Add these secrets:
- `PROD_REGISTRY_USERNAME` - Registry login username
- `PROD_REGISTRY_PASSWORD` - Registry login password
- `KUBECONFIG_DEV` - Base64 encoded kubeconfig for dev cluster
- `KUBECONFIG_STAGE` - Base64 encoded kubeconfig for stage cluster  
- `KUBECONFIG_PROD` - Base64 encoded kubeconfig for prod cluster
- `TEAMS_WEBHOOK_URL` - Teams notification webhook URL

### Step 4: Test the Complete Flow

```bash
# Create test tags and run workflow on self-hosted runner
cd /path/to/ciyex-portal-ui
git tag -fa v0.0.2-alpha.1 -m "test v0.0.2-alpha.1"
git push origin refs/tags/v0.0.2-alpha.1

# Or manually dispatch
gh workflow run ci-cd.yml --repo qiaben/ciyex-portal-ui --ref main -f action='Build' -f runner='self-hosted'

# To run a GA promotion automatically after pushing a v* tag (workflow now supports this):
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin refs/tags/v1.2.3
```

## Alternative Solutions (if self-hosted runner not possible)

### Option B: Make Registry Publicly Accessible
1. Configure DNS to resolve `registry.apps-prod.us-east.in.hinisoft.com` publicly
2. Set up firewall rules to allow GitHub Actions IP ranges
3. Configure proper authentication/authorization

### Option C: Use Docker Hub as Intermediate Registry
1. Push images to Docker Hub during CI
2. Use a separate job (on self-hosted runner) to pull from Docker Hub and push to private registry
3. Update kustomization.yaml to reference Docker Hub images for dev/stage, private registry for prod

## Verification Steps

After implementing the fix, verify:

1. **Registry Access**: `docker login registry.apps-prod.us-east.in.hinisoft.com`
2. **Tag Workflows**: Push alpha/rc/ga tags and check workflow success
3. **Image Registry**: Verify images exist in registry
4. **Kustomization Updates**: Check git commits update newTag values
5. **ArgoCD Deployments**: Verify apps sync and deploy
6. **Notifications**: Check Teams webhook receives messages

## Expected Workflow Results

When working correctly:

- ✅ Build & Deploy jobs succeed
- ✅ Images pushed to registry with tags: `v0.0.1-alpha.1`, `v0.0.1-rc.1`, `v0.0.1`
- ✅ Kustomization.yaml files updated with correct newTag values
- ✅ Git commits created for overlay updates
- ✅ ArgoCD apps auto-sync and deploy
- ✅ Teams notifications sent
- ✅ RC/GA promote workflows generate release notes

Notes:
- `promote-rc` now runs automatically when a `*-rc` tag is pushed (or you can run it manually via `workflow_dispatch`).
- `promote-ga` will run on pushed `v*` tags or manually via `workflow_dispatch`.

## Troubleshooting

If issues persist:
1. Check runner logs: `~/actions-runner/_diag/Runner_*.log`
2. Verify registry connectivity from runner machine
3. Verify secrets are set correctly in GitHub
4. Check ArgoCD application sync status
5. Verify webhook URL and Teams integration

## Granting the runner permissions (RBAC)

If you want the self-hosted runner to perform `kubectl` operations (create namespaces, apply kustomize overlays, rollout deployments), the runner needs Kubernetes RBAC permissions. Two approaches:

- Quick (kubectl): create a dedicated `ServiceAccount` and bind a minimal `ClusterRole` that allows namespace, secrets, configmap, and deployment operations.
- Terraform: add Kubernetes resources into your Terraform to create the service account and rolebinding declaratively.

Kubectl YAML (apply on a cluster admin machine):

```bash
cat <<'YAML' | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
	name: github-actions-runner
	namespace: kube-system

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
	name: github-actions-runner-role
rules:
	- apiGroups: [""]
		resources: ["namespaces", "secrets", "configmaps"]
		verbs: ["get", "list", "create", "update", "patch", "delete"]
	- apiGroups: ["apps"]
		resources: ["deployments", "daemonsets", "statefulsets"]
		verbs: ["get", "list", "create", "update", "patch", "delete"]
	- apiGroups: [""]
		resources: ["pods"]
		verbs: ["list", "get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
	name: github-actions-runner-binding
subjects:
	- kind: ServiceAccount
		name: github-actions-runner
		namespace: kube-system
roleRef:
	kind: ClusterRole
	name: github-actions-runner-role
	apiGroup: rbac.authorization.k8s.io
YAML
```

After applying the YAML, create a kubeconfig for the `github-actions-runner` service account and store it as a base64 secret in GitHub (example below).

Create a kubeconfig for the SA (run from a machine with `kubectl` configured as cluster-admin):

```bash
SA=github-actions-runner
NS=kube-system
SECRET_NAME=$(kubectl get sa ${SA} -n ${NS} -o jsonpath='{.secrets[0].name}')
TOKEN=$(kubectl get secret ${SECRET_NAME} -n ${NS} -o jsonpath='{.data.token}' | base64 -d)
CA=$(kubectl get secret ${SECRET_NAME} -n ${NS} -o jsonpath='{.data.ca\.crt}' | base64 -d)
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

cat > sa-kubeconfig <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
		certificate-authority-data: $(kubectl get secret ${SECRET_NAME} -n ${NS} -o jsonpath='{.data.ca\.crt}')
		server: ${SERVER}
	name: cluster
contexts:
- context:
		cluster: cluster
		user: sa-user
	name: sa-ctx
current-context: sa-ctx
users:
- name: sa-user
	user:
		token: ${TOKEN}
EOF

# Base64 encode and add to GitHub secret KUBECONFIG_DEV (or appropriate env)
base64 sa-kubeconfig | tr -d '\n' | xclip -selection clipboard || true
echo "Kubeconfig for SA written to sa-kubeconfig (base64 in clipboard if xclip available)"
```

Terraform snippet (kubernetes provider):

```hcl
resource "kubernetes_service_account" "github_actions_runner" {
	metadata {
		name      = "github-actions-runner"
		namespace = "kube-system"
	}
}

resource "kubernetes_cluster_role" "github_actions_runner_role" {
	metadata {
		name = "github-actions-runner-role"
	}
	rule {
		api_groups = [""]
		resources  = ["namespaces", "secrets", "configmaps"]
		verbs      = ["get", "list", "create", "update", "patch", "delete"]
	}
	rule {
		api_groups = ["apps"]
		resources  = ["deployments", "daemonsets", "statefulsets"]
		verbs      = ["get", "list", "create", "update", "patch", "delete"]
	}
}

resource "kubernetes_cluster_role_binding" "github_actions_runner_binding" {
	metadata {
		name = "github-actions-runner-binding"
	}
	subject {
		kind      = "ServiceAccount"
		name      = kubernetes_service_account.github_actions_runner.metadata[0].name
		namespace = kubernetes_service_account.github_actions_runner.metadata[0].namespace
	}
	role_ref {
		api_group = "rbac.authorization.k8s.io"
		kind      = "ClusterRole"
		name      = kubernetes_cluster_role.github_actions_runner_role.metadata[0].name
	}
}
```

Security note: granting cluster-wide permissions should be reviewed by your security team. If you only need to manage a single namespace, prefer a `Role`+`RoleBinding` scoped to that namespace instead of `ClusterRole`.

---

## ✅ RBAC Setup Complete

The GitHub Actions runner RBAC module has been added to `kube-terraform`:

**Module location:** `kube-terraform/modules/github-actions-runner/`
**Environment:** Already added to `environments/dev/main.tf`

### Apply RBAC and Create Kubeconfig

Run this script on a machine with cluster access and terraform/kubectl:

```bash
cd kube-terraform
./scripts/setup-runner-rbac.sh dev qiaben/ciyex-portal-ui
```

The script will:
1. Apply Terraform module (ServiceAccount + ClusterRole + ClusterRoleBinding)
2. Create a token secret for the service account  
3. Generate a kubeconfig file
4. Base64-encode it and add as GitHub secret `KUBECONFIG_DEV`

For stage/prod:
```bash
./scripts/setup-runner-rbac.sh stage qiaben/ciyex-portal-ui
./scripts/setup-runner-rbac.sh prod qiaben/ciyex-portal-ui
```

### Verify Deployment

After RBAC setup, test the full workflow:

```bash
gh workflow run ci-cd.yml -R qiaben/ciyex-portal-ui --ref test/ci-runners \
  -f action='Build' -f runner='self-hosted'
```

Verify in logs:
- ✅ Docker login succeeds (private registry accessible)
- ✅ Build and push succeed  
- ✅ Kustomization overlay updates
- ✅ Deploy to Kubernetes succeeds (no RBAC Forbidden errors)
- ✅ Teams notification shows success

