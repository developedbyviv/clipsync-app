#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# argocd-install.sh — Install ArgoCD on AKS and print access details.
#
# Usage:
#   cd argocd/install
#   ./argocd-install.sh
#
# Prerequisites:
#   • kubectl configured for the target AKS cluster
#     (run: az aks get-credentials --resource-group rg-clipsync-dev-inc
#                                   --name aks-clipsync-dev-inc)
#   • argocd CLI installed (https://argo-cd.readthedocs.io/en/stable/cli_installation/)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Installing ArgoCD on AKS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Create namespace ──────────────────────────────────────────────────────────
echo -e "\n${YELLOW}Creating argocd namespace...${NC}"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# ── Install ArgoCD ────────────────────────────────────────────────────────────
echo -e "${YELLOW}Installing ArgoCD (stable release)...${NC}"
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# ── Wait for ArgoCD server ────────────────────────────────────────────────────
echo -e "${YELLOW}Waiting for ArgoCD server to be ready (up to 5 minutes)...${NC}"
kubectl wait \
  --for=condition=available \
  --timeout=300s \
  deployment/argocd-server \
  -n argocd

# ── Expose ArgoCD via LoadBalancer ────────────────────────────────────────────
# For development: LoadBalancer gives a public IP for easy UI access.
# For production: use an Ingress with TLS instead.
echo -e "${YELLOW}Patching argocd-server to LoadBalancer for external access...${NC}"
kubectl patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "LoadBalancer"}}'

# ── Wait for external IP ──────────────────────────────────────────────────────
echo -e "${YELLOW}Waiting for external IP (this may take 2-3 minutes on AKS)...${NC}"
EXTERNAL_IP=""
ATTEMPTS=0
MAX_ATTEMPTS=30

while [[ -z "${EXTERNAL_IP}" && ${ATTEMPTS} -lt ${MAX_ATTEMPTS} ]]; do
  EXTERNAL_IP=$(kubectl get svc argocd-server -n argocd \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  if [[ -z "${EXTERNAL_IP}" ]]; then
    sleep 10
    ATTEMPTS=$((ATTEMPTS + 1))
    echo "  Waiting... (${ATTEMPTS}/${MAX_ATTEMPTS})"
  fi
done

# ── Retrieve admin password ───────────────────────────────────────────────────
ADMIN_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ArgoCD installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}ArgoCD UI:${NC}       https://${EXTERNAL_IP}"
echo -e "  ${GREEN}Username:${NC}        admin"
echo -e "  ${GREEN}Password:${NC}        ${ADMIN_PASSWORD}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Login via CLI:"
echo "     argocd login ${EXTERNAL_IP} --username admin --password '${ADMIN_PASSWORD}' --insecure"
echo ""
echo "  2. Change the admin password:"
echo "     argocd account update-password"
echo ""
echo "  3. Apply AppProject and Applications:"
echo "     kubectl apply -f argocd/projects/"
echo "     kubectl apply -f argocd/applications/dev/"
echo "     kubectl apply -f argocd/applications/prod/"
echo ""
echo "  4. Watch sync status:"
echo "     argocd app list"
echo "     argocd app get clipsync-dev"
echo ""
