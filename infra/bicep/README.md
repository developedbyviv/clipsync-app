# ClipSync — Azure Bicep Infrastructure

Provisions **two environments** (dev and prod) on Azure using Bicep (IaC).
All resources follow the `<abbreviation>-clipsync-<env>-inc` naming convention.

---

## What This Provisions

| Resource | Name pattern | SKU | Est. cost/env |
|---|---|---|---|
| AKS Cluster | `aks-clipsync-<env>-inc` | 2× Standard_B2s | ~$70/month |
| Container Registry | `acrclipsyncsharedinc` | Basic (shared) | ~$5/month total |
| PostgreSQL Flexible | `pg-clipsync-<env>-inc` | Burstable B1ms | ~$15/month |
| Azure Cache for Redis | `redis-clipsync-<env>-inc` | Basic C0 | ~$15/month |
| Log Analytics | `law-clipsync-<env>-inc` | PerGB2018 | ~$3/month |
| Application Insights | `ai-clipsync-<env>-inc` | Workspace-based | ~$2/month |
| Key Vault | `kv-clipsync-<env>-inc` | Standard | ~$1/month |

**Total estimated: ~$111/month per environment (~$216/month for both)**

> **Cost tip:** Deallocate or delete the dev AKS cluster when not actively developing. AKS control plane is free — you only pay for the VMs.

> **SKU availability:** Run `az vm list-skus --location centralindia --size Standard_B2s --output table` before deploying to confirm availability.

---

## Prerequisites

- **Azure CLI** ≥ 2.55 — [install guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Bicep CLI** — installed automatically by the scripts via `az bicep install`
- **kubectl** — [install guide](https://kubernetes.io/docs/tasks/tools/)
- An active Azure subscription with Contributor access

---

## First-Time Setup

```bash
# Step 1: Log in to Azure
az login

# Step 2: Select your subscription
az account set --subscription "<your-subscription-id>"
az account show   # verify

# Step 3: Install Bicep CLI
az bicep install
az bicep version  # verify

# Step 4: Update alert email in both parameter files
#   infra/bicep/main.parameters.dev.json   → alertEmail
#   infra/bicep/main.parameters.prod.json  → alertEmail

# Step 5: Set up the PostgreSQL password (choose one option):

# OPTION A — Pass via CLI flag (simplest for first deploy):
#   The deploy scripts accept extra --parameters flags.
#   Edit deploy-dev.sh and add: --parameters postgresAdminPassword="MyStr0ngP@ss!"

# OPTION B — Key Vault reference (recommended, avoids password on CLI):
#   1. Create a bootstrap Key Vault in a separate resource group
#   2. az keyvault secret set --vault-name <kv> --name postgres-admin-password --value "..."
#   3. Fill in the Key Vault resource ID in main.parameters.dev.json

# Step 6: Make scripts executable
cd infra/bicep/scripts
chmod +x deploy-dev.sh deploy-prod.sh destroy.sh

# Step 7: Deploy dev environment
./deploy-dev.sh

# Step 8: Verify the cluster
kubectl get nodes
kubectl get pods -A
```

---

## Deploying

```bash
# Deploy dev (ACR is created here and shared with prod)
./infra/bicep/scripts/deploy-dev.sh

# Deploy prod (reuses dev ACR; requires 'yes' confirmation)
./infra/bicep/scripts/deploy-prod.sh
```

## Destroying an Environment

```bash
# Tear down dev (prompts for confirmation)
./infra/bicep/scripts/destroy.sh dev

# Tear down prod (requires typing 'prod' + 'yes')
./infra/bicep/scripts/destroy.sh prod
```

---

## Folder Structure

```
infra/bicep/
├── main.bicep                    # Root orchestrator (subscription scope)
├── main.parameters.dev.json      # Dev environment values
├── main.parameters.prod.json     # Prod environment values
├── abbreviations.json            # Azure naming abbreviation map
├── modules/
│   ├── resourceGroup.bicep       # Resource group per environment
│   ├── logAnalytics.bicep        # Log Analytics Workspace
│   ├── appInsights.bicep         # Application Insights (workspace-based)
│   ├── acr.bicep                 # Container Registry (dev only — shared)
│   ├── aks.bicep                 # AKS cluster with Workload Identity + KV addon
│   ├── postgres.bicep            # PostgreSQL 16 Flexible Server
│   ├── redis.bicep               # Azure Cache for Redis (TLS-only)
│   ├── keyvault.bicep            # Key Vault with RBAC + all secrets
│   └── acrPullRole.bicep         # AcrPull role assignment helper
└── scripts/
    ├── deploy-dev.sh             # One-command dev deploy
    ├── deploy-prod.sh            # One-command prod deploy (confirmation gate)
    └── destroy.sh                # Tear down environment
```

---

## Useful Commands

```bash
# List all subscription-level deployments
az deployment sub list --query "[].{name:name, state:properties.provisioningState}" -o table

# Show all outputs from a deployment
az deployment sub show --name <deployment-name> --query "properties.outputs" -o json

# Get AKS credentials (configure kubectl)
az aks get-credentials \
  --resource-group rg-clipsync-dev-inc \
  --name aks-clipsync-dev-inc \
  --overwrite-existing

# Authenticate Docker to ACR
az acr login --name acrclipsyncsharedinc

# Read a secret from Key Vault
az keyvault secret show \
  --vault-name kv-clipsync-dev-inc \
  --name postgres-connection-string \
  --query value -o tsv

# Run Bicep linter on all files
az bicep build --file infra/bicep/main.bicep
for f in infra/bicep/modules/*.bicep; do az bicep build --file "$f"; done

# View AKS cluster resources
kubectl get nodes
kubectl get pods -A
kubectl top nodes
```

---

## Architecture Notes

### ACR is shared across environments
ACR is created only during the **dev** deployment. The prod AKS cluster is granted `AcrPull` access to the same registry. This avoids paying for two registries and keeps image management simple.

### Secrets are never in plain text
All connection strings, JWT secrets, and the PostgreSQL password are stored in Key Vault. AKS pods access secrets via the `azureKeyvaultSecretsProvider` addon using `SecretProviderClass` objects (configured in Week 3 Helm charts).

### Workload Identity (no stored credentials in pods)
AKS has Workload Identity + OIDC enabled. In Week 3, individual pod service accounts will be federated with Azure AD identities — pods get short-lived tokens automatically.

### `jwt-secret` and `session-secret` regenerate on every deploy
These are generated with `newGuid()` in Bicep. If you need stable secrets (e.g., to avoid invalidating existing sessions after a redeploy), manually update them in Key Vault after the first deploy:
```bash
az keyvault secret set \
  --vault-name kv-clipsync-dev-inc \
  --name jwt-secret \
  --value "$(openssl rand -base64 48)"
```
