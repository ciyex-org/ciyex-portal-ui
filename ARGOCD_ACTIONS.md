Quick Actions / Commands for cluster diagnostics and fixes

1) Create `regcred` (example for Docker registry) — replace placeholders with your registry and credentials:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=<REGISTRY_URL> \
  --docker-username=<USERNAME> \
  --docker-password='<PASSWORD>' \
  --docker-email=<EMAIL> -n ciyex-dev
```

2) Run the diagnostics collector (will save output under `/tmp`):

```bash
./scripts/collect-k8s-diagnostics.sh ciyex-dev
# then archive and paste the output directory if you want me to inspect it
```

3) Common kubectl checks (paste outputs here):

```bash
kubectl get pods -n ciyex-dev -o wide
kubectl describe pod <failing-pod> -n ciyex-dev
kubectl logs <failing-pod> -n ciyex-dev -c ciyex-portal-ui --tail=200
kubectl get events -n ciyex-dev --sort-by='.lastTimestamp' | tail -n 40
kubectl get deploy dev-ciyex-portal-ui -n ciyex-dev -o yaml
```

If you paste the collected diagnostics or the outputs above I will analyze them and prepare exact repo patches (image, probes, env) or commands to fix the cluster.
