#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-prod.sh — Deploy ClipSync PRODUCTION environment to Azure
#
# Usage:
#   cd infra/bicep/scripts
#   ./deploy-prod.sh
#
# WARNING: This deploys to production. You will be prompted to confirm.
# Prerequisites: az login, az bicep install, kubectl
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENVIRONMENT="prod"
LOCATION="centralindia"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠  ClipSync — PRODUCTION Deployment${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Confirmation gate ─────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}You are about to deploy to PRODUCTION.${NC}"
echo "This will create or update Azure resources in the prod environment."
echo ""
read -r -p "Type 'yes' to confirm production deployment: " confirm

if [[ "${confirm}" != "yes" ]]; then
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  exit 0
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────────

if ! az account show > /dev/null 2>&1; then
  echo -e "${RED}Error: Not logged in to Azure CLI.${NC}"
  echo "Run: az login"
  exit 1
fi

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

# ── Bicep validation ──────────────────────────────────────────────────────────
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

echo -e "${YELLOW}Starting PRODUCTION deployment: ${DEPLOYMENT_NAME}${NC}"
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
echo -e "${GREEN}  Production deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Retrieve outputs ──────────────────────────────────────────────────────────
AKS_NAME=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.aksClusterName.value" -o tsv)

RG_NAME="rg-clipsync-${ENVIRONMENT}-inc"
KV_NAME=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.keyVaultName.value" -o tsv)
PG_HOST=$(az deployment sub show \
  --name "${DEPLOYMENT_NAME}" \
  --query "properties.outputs.postgresHost.value" -o tsv)

echo ""
echo -e "  ${GREEN}Resource Group:${NC}  ${RG_NAME}"
echo -e "  ${GREEN}AKS Cluster:${NC}     ${AKS_NAME}"
echo -e "  ${GREEN}PostgreSQL Host:${NC} ${PG_HOST}"
echo -e "  ${GREEN}Key Vault:${NC}       ${KV_NAME}"

# ── Configure kubectl ─────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Configuring kubectl context for production...${NC}"
az aks get-credentials \
  --resource-group "${RG_NAME}" \
  --name "${AKS_NAME}" \
  --overwrite-existing

echo ""
echo -e "${YELLOW}Verifying cluster nodes...${NC}"
kubectl get nodes

echo ""
echo -e "${GREEN}  Production is live. Deploy application with Helm (Week 3).${NC}"
echo ""
