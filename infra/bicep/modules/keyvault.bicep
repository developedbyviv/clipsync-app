// ─────────────────────────────────────────────────────────────────────────────
// modules/keyvault.bicep
// Azure Key Vault — centralised secret store for all ClipSync credentials.
//
// RBAC model (enableRbacAuthorization = true) is used instead of access
// policies — RBAC is the modern, recommended approach.
//
// AKS kubelet identity is granted 'Key Vault Secrets User' so pods can
// mount secrets via the azureKeyvaultSecretsProvider addon.
//
// Secrets stored here (never in .env files or Kubernetes secrets in plain text):
//   • postgres-connection-string
//   • redis-connection-string
//   • appinsights-connection-string
//   • jwt-secret (auto-generated on first deploy)
//   • session-secret (auto-generated on first deploy)
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

@description('Object ID of the AKS kubelet managed identity — granted Secrets User role')
param aksKubeletObjectId string

@description('PostgreSQL connection string to store as a Key Vault secret')
@secure()
param postgresConnectionString string

@description('Redis connection string to store as a Key Vault secret')
@secure()
param redisConnectionString string

@description('Application Insights connection string to store as a Key Vault secret')
@secure()
param appInsightsConnectionString string

// Key Vault — the single source of truth for all ClipSync secrets
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenant().tenantId
    // RBAC model: access controlled via Azure role assignments, not access policies
    enableRbacAuthorization: true
    // Soft delete: secrets recoverable for 7 days after deletion
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    // Purge protection disabled: allows immediate purge in dev (save cost)
    // MUST be enabled in production to prevent accidental permanent deletion
    enablePurgeProtection: false
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      // Allow all networks — tighten with VNet rules for production hardening
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Grant AKS kubelet identity the 'Key Vault Secrets User' role.
// This allows pods using the azureKeyvaultSecretsProvider addon to read secrets.
// Role ID 4633458b... = Key Vault Secrets User (read-only on secret values)
resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // guid() ensures a stable, deterministic role assignment name
  name: guid(kv.id, aksKubeletObjectId, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalId: aksKubeletObjectId
    principalType: 'ServicePrincipal'
  }
}

// ── Secrets ──────────────────────────────────────────────────────────────────

// PostgreSQL connection string — used by the API container via SecretProviderClass
resource postgresSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'postgres-connection-string'
  properties: {
    value: postgresConnectionString
    contentType: 'text/plain'
  }
}

// Redis connection string — used by the API for session and pub/sub
resource redisSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'redis-connection-string'
  properties: {
    value: redisConnectionString
    contentType: 'text/plain'
  }
}

// Application Insights connection string — used by both API and frontend
resource appInsightsSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'appinsights-connection-string'
  properties: {
    value: appInsightsConnectionString
    contentType: 'text/plain'
  }
}

// JWT signing secret — auto-generated on first deploy using newGuid()
// WARNING: newGuid() generates a new value on every deployment — if you need
// a stable secret, set it manually in Key Vault after first deploy.
resource jwtSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'jwt-secret'
  properties: {
    value: newGuid()
    contentType: 'text/plain'
  }
}

// Session secret — auto-generated on first deploy
resource sessionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'session-secret'
  properties: {
    value: newGuid()
    contentType: 'text/plain'
  }
}

output keyVaultName string = kv.name
output keyVaultUri string = kv.properties.vaultUri
output keyVaultId string = kv.id
