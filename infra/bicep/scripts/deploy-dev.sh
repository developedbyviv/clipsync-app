#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-dev.sh — Deploy ClipSync dev environment to Azure
#
# Usage:
#   cd infra/bicep/scripts
#   ./deploy-dev.sh
#
# Prerequisites: az login, az bicep install, kubectl
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="dev"
LOCATION="centralindia"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ClipSync — Deploy ${ENVIRONMENT} environment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────

# Verify Azure CLI is installed and logged in
if ! az account show > /dev/null 2>&1; then
  echo -e "${RED}Error: Not logged in to Azure CLI.${NC}"
  echo "Run: az login"
  exit 1
fi

# Verify Bicep CLI is available
if ! az bicep version > /dev/null 2>&1; then
  echo -e "${YELLOW}Bicep CLI not found — installing...${NC}"
  az bicep install
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

echo ""
echo -e "  ${GREEN}Subscription:${NC} ${SUBSCRIPTION_NAME} (${SUBSCRIPTION_ID})"
echo -e "  ${GREEN}Environment:${NC}  ${ENVIRONMENT}"
echo -e "  ${GREEN}Location:${NC}     ${LOCATION}"
echo ""

# ── Bicep validation (what-if) ────────────────────────────────────────────────
echo -e "${YELLOW}Running Bicep validation...${NC}"
az deployment sub validate \
  --location "${LOCATION}" \
  --template-file "${BICEP_DIR}/main.bicep" \
  --parameters "@${BICEP_DIR}/main.parameters.${ENVIRONMENT}.json" \
  --parameters environment="${ENVIRONMENT}" \
  2>&1 | tail -5

echo -e "${GREEN}✓ Validation passed${NC}"
echo ""

# ── Deploy ────────────────────────────────────────────────────────────────────
DEPLOYMENT_NAME="clipsync-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

echo -e "${YELLOW}Starting deployment: ${DEPLOYMENT_NAME}${NC}"
echo "(This takes approximately 15–20 minutes for AKS provisioning)"
echo ""

az deployment sub create \
  --name "${DEPLOYMENT_NAME}" \
  --location "${LOCATION}" \
  --template-file "${BICEP_DIR}/main.bicep" \
  --parameters "@${BICEP_DIR}/main.parameters.${ENVIRONMENT}.json" \
  --parameters environment="${ENVIRONMENT}" \
  --verbose

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Retrieve outputs ──────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Retrieving deployment outputs...${NC}"

AKS_NAME=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.aksClusterName.value" -o tsv)

RG_NAME="rg-clipsync-${ENVIRONMENT}-inc"
KV_NAME=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.keyVaultName.value" -o tsv)
ACR_SERVER=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.acrLoginServer.value" -o tsv)
PG_HOST=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.postgresHost.value" -o tsv)

echo ""
echo -e "  ${GREEN}Resource Group:${NC}  ${RG_NAME}"
echo -e "  ${GREEN}AKS Cluster:${NC}     ${AKS_NAME}"
echo -e "  ${GREEN}ACR Server:${NC}      ${ACR_SERVER}"
echo -e "  ${GREEN}PostgreSQL Host:${NC} ${PG_HOST}"
echo -e "  ${GREEN}Key Vault:${NC}       ${KV_NAME}"

# ── Configure kubectl ─────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Configuring kubectl context...${NC}"

az aks get-credentials \
  --resource-group "${RG_NAME}" \
  --name "${AKS_NAME}" \
  --overwrite-existing

echo ""
echo -e "${YELLOW}Verifying cluster nodes...${NC}"
kubectl get nodes

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Next steps${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  1. Verify all nodes are Ready:"
echo "     kubectl get nodes"
echo ""
echo "  2. Login to ACR and push images:"
echo "     az acr login --name acrclipsyncsharedinc"
echo "     docker push ${ACR_SERVER}/clipsync-api:latest"
echo ""
echo "  3. Run Helm deployment (Week 3):"
echo "     helm upgrade --install clipsync ./helm/clipsync"
echo ""
