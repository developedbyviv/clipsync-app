#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# destroy.sh — Tear down a ClipSync environment (deletes the resource group)
#
# Usage:
#   cd infra/bicep/scripts
#   ./destroy.sh dev     # destroy dev environment
#   ./destroy.sh prod    # destroy prod environment (extra confirmation required)
#
# WARNING: This permanently deletes all resources in the environment's
# resource group, including the PostgreSQL database and Redis cache.
# Data loss is irreversible.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Argument validation ───────────────────────────────────────────────────────
if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <environment>"
  echo "  Examples: $0 dev | $0 prod"
  exit 1
fi

ENVIRONMENT="$1"

if [[ "${ENVIRONMENT}" != "dev" && "${ENVIRONMENT}" != "prod" ]]; then
  echo -e "${RED}Error: environment must be 'dev' or 'prod', got '${ENVIRONMENT}'${NC}"
  exit 1
fi

RG_NAME="rg-clipsync-${ENVIRONMENT}-inc"

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠  DESTROY — ClipSync ${ENVIRONMENT} environment${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Resource group to delete: ${YELLOW}${RG_NAME}${NC}"
echo ""
echo -e "${RED}WARNING: All resources (AKS, PostgreSQL, Redis, Key Vault,${NC}"
echo -e "${RED}Application Insights) will be PERMANENTLY deleted.${NC}"
echo -e "${RED}Database data CANNOT be recovered after deletion.${NC}"
echo ""

# ── Pre-flight check ──────────────────────────────────────────────────────────
if ! az account show > /dev/null 2>&1; then
  echo -e "${RED}Error: Not logged in to Azure CLI. Run: az login${NC}"
  exit 1
fi

# Check the resource group actually exists before asking for confirmation
if ! az group show --name "${RG_NAME}" > /dev/null 2>&1; then
  echo -e "${YELLOW}Resource group '${RG_NAME}' not found — nothing to destroy.${NC}"
  exit 0
fi

# ── Extra confirmation for production ─────────────────────────────────────────
if [[ "${ENVIRONMENT}" == "prod" ]]; then
  echo -e "${RED}You are about to destroy PRODUCTION infrastructure.${NC}"
  read -r -p "Type the environment name to confirm ('prod'): " confirm_env
  if [[ "${confirm_env}" != "prod" ]]; then
    echo -e "${YELLOW}Destroy cancelled.${NC}"
    exit 0
  fi
fi

# ── Standard confirmation ─────────────────────────────────────────────────────
read -r -p "Are you sure? Type 'yes' to confirm: " confirm
if [[ "${confirm}" != "yes" ]]; then
  echo -e "${YELLOW}Destroy cancelled.${NC}"
  exit 0
fi

# ── Delete resource group ─────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Deleting resource group '${RG_NAME}'...${NC}"
echo "(This may take 5–10 minutes)"
echo ""

az group delete \
  --name "${RG_NAME}" \
  --yes \
  --no-wait

echo -e "${GREEN}Deletion initiated.${NC}"
echo ""
echo "Monitor progress in the Azure Portal, or run:"
echo "  az group show --name ${RG_NAME} --query properties.provisioningState"
echo ""
echo "The resource group will be fully deleted within a few minutes."
