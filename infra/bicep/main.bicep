// ─────────────────────────────────────────────────────────────────────────────
// main.bicep — Root orchestrator for ClipSync Azure infrastructure.
//
// Deploys two environments (dev / prod) at Azure subscription scope.
// Modules are called in dependency order; Bicep resolves the graph automatically.
//
// Deployment order (resolved by Bicep from output references):
//   1. resourceGroup
//   2. logAnalytics        (depends on: rg)
//   3. appInsights         (depends on: logAnalytics)
//   4. acr                 (depends on: rg — dev environment only)
//   5. aks                 (depends on: logAnalytics)
//   6. postgres            (depends on: logAnalytics)
//   7. redis               (depends on: logAnalytics)
//   8. keyvault            (depends on: aks + postgres + redis + appInsights)
//   9. acrPullRole         (depends on: acr + aks — dev only)
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'subscription'

// ── Parameters ────────────────────────────────────────────────────────────────

@description('Environment name — controls naming and ACR conditional creation')
@allowed(['dev', 'prod'])
param environment string

@description('Azure region for all resources. Default: centralindia (closest to Mumbai)')
param location string = 'centralindia'

@description('Project name — used in all resource names and tags')
param projectName string = 'clipsync'

@description('Number of AKS agent nodes. 2 is the minimum for HA.')
@minValue(1)
@maxValue(10)
param aksNodeCount int = 2

@description('VM size for AKS nodes. Standard_B2s = 2 vCPU, 4 GB RAM, ~$35/month each.')
param aksNodeSize string = 'Standard_B2s'

@description('PostgreSQL administrator password. Pass via --parameters or Key Vault reference.')
@secure()
param postgresAdminPassword string

@description('Email address for Azure Monitor alert notifications')
param alertEmail string

// ── Variables ─────────────────────────────────────────────────────────────────

// Short region code appended to all resource names
var regionShort = 'inc' // India Central

// ── Module: Resource Group ────────────────────────────────────────────────────

// Creates rg-clipsync-<env>-inc — the container for all environment resources
module rg './modules/resourceGroup.bicep' = {
  name: 'deploy-resourceGroup-${environment}'
  params: {
    projectName: projectName
    environment: environment
    location: location
  }
}

// ── Module: Log Analytics Workspace ──────────────────────────────────────────

// Creates law-clipsync-<env>-inc — central log sink for all resources
module logAnalytics './modules/logAnalytics.bicep' = {
  name: 'deploy-logAnalytics-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
  }
}

// ── Module: Application Insights ─────────────────────────────────────────────

// Creates ai-clipsync-<env>-inc — APM for ClipSync API and frontend
module appInsights './modules/appInsights.bicep' = {
  name: 'deploy-appInsights-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceResourceId
  }
}

// ── Module: Container Registry (dev only — shared across environments) ────────

// Creates acrclipsyncsharedinc — Docker image registry.
// ACR is created only in the dev deployment and reused by prod.
// Prod AKS gets AcrPull access via a separate role assignment.
module acr './modules/acr.bicep' = if (environment == 'dev') {
  name: 'deploy-acr-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
  }
}

// ── Module: AKS Cluster ───────────────────────────────────────────────────────

// Creates aks-clipsync-<env>-inc — Kubernetes cluster for ClipSync workloads
module aks './modules/aks.bicep' = {
  name: 'deploy-aks-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
    nodeCount: aksNodeCount
    nodeSize: aksNodeSize
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceResourceId
  }
}

// ── Module: PostgreSQL ────────────────────────────────────────────────────────

// Creates pg-clipsync-<env>-inc — PostgreSQL 16 Flexible Server
module postgres './modules/postgres.bicep' = {
  name: 'deploy-postgres-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
    adminPassword: postgresAdminPassword
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceResourceId
  }
}

// ── Module: Redis ─────────────────────────────────────────────────────────────

// Creates redis-clipsync-<env>-inc — Azure Cache for Redis (session + pub/sub)
module redis './modules/redis.bicep' = {
  name: 'deploy-redis-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceResourceId
  }
}

// ── Module: Key Vault ─────────────────────────────────────────────────────────

// Creates kv-clipsync-<env>-inc — stores all secrets.
// Bicep deploys this AFTER aks, postgres, redis because we reference their outputs.
module keyvault './modules/keyvault.bicep' = {
  name: 'deploy-keyvault-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: location
    aksKubeletObjectId: aks.outputs.kubeletIdentityObjectId
    postgresConnectionString: postgres.outputs.connectionString
    redisConnectionString: redis.outputs.connectionString
    appInsightsConnectionString: appInsights.outputs.connectionString
  }
}

// ── AcrPull Role Assignment ───────────────────────────────────────────────────

// Grants AKS kubelet identity the AcrPull role on ACR.
// Done via a resource-group-scoped helper module because main.bicep is
// subscription-scoped and cannot directly scope to an RG resource inline.
// Only applied in dev (where ACR is created); prod reuses the dev ACR.
module acrPullRole './modules/acrPullRole.bicep' = if (environment == 'dev') {
  name: 'deploy-acrPullRole-${environment}'
  scope: resourceGroup(rg.outputs.resourceGroupName)
  params: {
    acrName: acr.outputs.acrName
    kubeletIdentityObjectId: aks.outputs.kubeletIdentityObjectId
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output resourceGroupName string = rg.outputs.resourceGroupName
output aksClusterName string = aks.outputs.clusterName

@description('ACR login server — e.g. acrclipsyncsharedinc.azurecr.io')
output acrLoginServer string = environment == 'dev' ? acr.outputs.acrLoginServer : 'acrclipsyncsharedinc.azurecr.io'

output postgresHost string = postgres.outputs.fqdn
output redisHostName string = redis.outputs.hostName
output keyVaultName string = keyvault.outputs.keyVaultName

@description('Application Insights connection string — also stored in Key Vault')
@secure()
output appInsightsConnectionString string = appInsights.outputs.connectionString

output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
