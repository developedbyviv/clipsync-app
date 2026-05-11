# ClipSync — ArgoCD GitOps Configuration

ArgoCD manages continuous delivery for ClipSync across dev and prod environments.
All deployments are Git-driven — the cluster state always reflects `infra/helm/clipsync/`.

---

## Architecture

```
GitHub repo (main / develop)
       │
       │  Git poll (3 min) or webhook
       ▼
   ArgoCD (running in AKS — argocd namespace)
       │
       ├── clipsync-dev  ── auto-sync ──► clipsync-dev namespace
       │   (develop branch)               (AKS dev cluster)
       │
       └── clipsync-prod ── manual sync ► clipsync-prod namespace
           (main branch)                  (AKS prod cluster)
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| kubectl | ≥ 1.28 | [docs](https://kubernetes.io/docs/tasks/tools/) |
| argocd CLI | ≥ 2.10 | [docs](https://argo-cd.readthedocs.io/en/stable/cli_installation/) |
| AKS credentials | configured | `az aks get-credentials ...` |

---

## Step-by-Step Setup

### 1. Configure kubectl for AKS

```bash
# Dev cluster
az aks get-credentials \
  --resource-group rg-clipsync-dev-inc \
  --name aks-clipsync-dev-inc \
  --overwrite-existing

kubectl get nodes   # verify
```

### 2. Install ArgoCD

```bash
cd argocd/install
chmod +x argocd-install.sh
./argocd-install.sh
```

The script will print the ArgoCD UI URL and admin password when complete.

### 3. Apply AppProject

```bash
# Create the clipsync project boundary in ArgoCD
kubectl apply -f argocd/projects/clipsync-project.yaml
```

### 4. Apply Applications

```bash
# Register dev application (auto-sync enabled)
kubectl apply -f argocd/applications/dev/clipsync-dev.yaml

# Register prod application (manual sync only)
kubectl apply -f argocd/applications/prod/clipsync-prod.yaml
```

### 5. Verify

```bash
argocd app list
# NAME           CLUSTER      NAMESPACE      PROJECT    STATUS  HEALTH
# clipsync-dev   in-cluster   clipsync-dev   clipsync   Synced  Healthy
# clipsync-prod  in-cluster   clipsync-prod  clipsync   Synced  Healthy
```

---

## Before First Deploy — Fill in Placeholders

Both `values-dev.yaml` and `values-prod.yaml` have `REPLACE_WITH_*` placeholders.
Fill these in after running the Bicep infrastructure deployment:

```bash
# Tenant ID
az account show --query tenantId -o tsv

# Workload Identity client ID (created as part of Week 4 Workload Identity setup)
az identity show \
  --name wi-clipsync-dev \
  --resource-group rg-clipsync-dev-inc \
  --query clientId -o tsv
```

Update these files and commit — ArgoCD will pick up the change automatically (dev).

---

## GitOps Flows

### Dev (automatic)

```
develop branch  →  GitHub Actions builds image
                →  pushes :latest to acrclipsyncsharedinc.azurecr.io
                →  ArgoCD detects diff (poll or webhook)
                →  auto-syncs to clipsync-dev namespace
                →  kubectl rollout status deployment/clipsync-api -n clipsync-dev
```

### Prod (manual approval)

```
main branch     →  GitHub Actions builds image
                →  pushes :<git-sha> to ACR
                →  updates image tag in values-prod.yaml
                →  ArgoCD detects diff — does NOT auto-apply
                →  Engineer reviews diff in ArgoCD UI
                →  Manual sync:
                     argocd app sync clipsync-prod
                →  Monitor rollout:
                     argocd app wait clipsync-prod --health
```

---

## Useful Commands

```bash
# List all ArgoCD applications
argocd app list

# Get detailed status of an application
argocd app get clipsync-dev

# Trigger a manual sync (required for prod)
argocd app sync clipsync-prod

# Wait for sync to complete and check health
argocd app wait clipsync-prod --health --timeout 300

# View live diff (what will change on next sync)
argocd app diff clipsync-prod

# Rollback to previous version
argocd app rollback clipsync-prod

# Force a refresh (re-read Git without waiting for poll)
argocd app get clipsync-dev --refresh

# Delete an application (does NOT delete deployed resources)
argocd app delete clipsync-dev

# Delete with cascade (also deletes deployed Kubernetes resources)
argocd app delete clipsync-dev --cascade
```

---

## Security Notes

- **Prod never auto-syncs** — every production change requires a human to run `argocd app sync clipsync-prod`
- **Secrets are not in Git** — all secrets are in Azure Key Vault, fetched at runtime via the CSI driver
- **AppProject boundaries** — the `clipsync` AppProject restricts ArgoCD to only deploy to `clipsync-dev` and `clipsync-prod` namespaces
- **dev-deployer role** — the GitHub Actions CI pipeline uses a scoped ArgoCD token that can only sync `clipsync-dev`, not prod
