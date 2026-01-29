#!/usr/bin/env bash
set -euo pipefail
# install_register_runner_and_set_secret.sh
# Usage: ./install_register_runner_and_set_secret.sh <owner> <repo> [labels] [runner_version]
# Example: ./install_register_runner_and_set_secret.sh qiaben ciyex-portal-ui "self-hosted,debian" 2.311.0
# Notes:
# - Run on Debian machine inside the network that can reach registry.apps-prod.us-east.in.hinisoft.com
# - `gh` CLI must be authenticated with an account that has repo admin rights
# - sudo privileges required for installing docker and runner service

OWNER=${1:-qiaben}
REPO=${2:-ciyex-portal-ui}
LABELS=${3:-self-hosted,debian}
RUNNER_VER=${4:-2.311.0}
RUNNER_DIR="${HOME}/actions-runner"

echo "Owner: ${OWNER} Repo: ${REPO} Labels: ${LABELS} Runner version: ${RUNNER_VER}"

# Basic checks
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Installing gh..."
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update
  sudo apt install -y gh
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run: gh auth login and ensure you have repo admin rights. Exiting."
  exit 1
fi

# Install prerequisites
sudo apt update
sudo apt install -y curl tar git ca-certificates

# Install Docker if missing
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
  echo "Note: you may need to re-login to apply docker group changes."
fi

# Prepare runner directory
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

TARFILE="actions-runner-linux-x64-${RUNNER_VER}.tar.gz"
if [ ! -f "${TARFILE}" ]; then
  echo "Downloading actions runner v${RUNNER_VER}..."
  curl -L -o "${TARFILE}" "https://github.com/actions/runner/releases/download/v${RUNNER_VER}/${TARFILE}"
fi

if [ ! -f ./config.sh ]; then
  echo "Extracting runner tarball..."
  tar xzf "${TARFILE}"
fi

# Obtain registration token
echo "Requesting registration token..."
REG_TOKEN=$(gh api --method POST -H "Accept: application/vnd.github+json" /repos/${OWNER}/${REPO}/actions/runners/registration-token --jq .token)
if [ -z "${REG_TOKEN}" ]; then
  echo "Failed to obtain registration token. Ensure gh is authenticated and you have repo admin rights." 
  exit 1
fi

# Configure runner (skip if already configured)
if [ -f .runner ] || [ -f .credentials ]; then
  echo "Runner already appears configured; skipping configure step."
else
  echo "Configuring runner..."
  ./config.sh --url "https://github.com/${OWNER}/${REPO}" --token "${REG_TOKEN}" --labels "${LABELS}" --work _work
fi

# Install and start service
echo "Installing runner as a service..."
sudo ./svc.sh install
sudo ./svc.sh start

echo "Runner service started. Checking status..."
sudo ./svc.sh status || true

# Set USE_INTERNAL_REGISTRY secret to 'true'
echo "Setting USE_INTERNAL_REGISTRY secret to 'true' for ${OWNER}/${REPO}..."
# gh secret set requires repo scope and permissions
printf '%s' "true" | gh secret set USE_INTERNAL_REGISTRY -R ${OWNER}/${REPO}

echo "Done. Verify runner online in GitHub and that the secret is present."

echo "Quick checks you can run now:"
echo "  nslookup registry.apps-prod.us-east.in.hinisoft.com"
echo "  curl -I https://registry.apps-prod.us-east.in.hinisoft.com/v2/"
echo "To dispatch a build to this runner:"
echo "  gh workflow run ci-cd.yml -R ${OWNER}/${REPO} --ref main -f action='Build' -f runner='self-hosted'"

# End
