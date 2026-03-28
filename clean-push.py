#!/usr/bin/env python3
import subprocess
import os

os.chdir('/home/dhivya/workspace/ciyex-portal-ui')

print("Aborting rebase and resetting...")
subprocess.run(['git', 'rebase', '--abort'], capture_output=True)
subprocess.run(['git', 'reset', '--hard', 'HEAD'], check=True)

print("Fetching latest...")
subprocess.run(['git', 'fetch', 'origin'], check=True)

print("Resetting to origin/main...")
subprocess.run(['git', 'reset', '--hard', 'origin/main'], check=True)

print("Applying changes to deployment and kustomization files...")
# The files are already edited in the workspace, so we just need to add them
subprocess.run(['git', 'add', 
    'k8s/base/deployment.yaml',
    'k8s/overlays/dev/kustomization.yaml', 
    'k8s/overlays/stage/kustomization.yaml',
    'k8s/overlays/prod/kustomization.yaml'
], check=True)

print("Committing changes...")
result = subprocess.run(
    ['git', 'commit', '-m', 'fix: enable imagePullSecrets and use private registry for all environments'],
    capture_output=True,
    text=True
)
print(result.stdout)
print(result.stderr)

print("Pushing to origin...")
result = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)

if result.returncode == 0:
    print("\n✅ Successfully pushed all changes!")
else:
    print(f"\n❌ Push failed with code {result.returncode}")
