// ─────────────────────────────────────────────────────────────────────────────
// modules/acr.bicep
// Azure Container Registry — stores Docker images for the ClipSync API
// and frontend. Shared across dev and prod environments (created once).
//
// Security: adminUserEnabled = false. AKS pulls images using the kubelet
// managed identity with the AcrPull role — no stored credentials needed.
//
// ACR naming rule: alphanumeric only, 5–50 chars, globally unique.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Azure region')
param location string

@description('Environment name (used for tags only — ACR is shared across environments)')
param environment string

@description('Project name')
param projectName string

// Container Registry — stores clipsync-api and clipsync-frontend Docker images
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  // Must be globally unique, alphanumeric only — no hyphens allowed in ACR names
  name: 'acrclipsyncsharedinc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
    note: 'shared-across-environments'
  }
  sku: {
    // Basic SKU: ~$5/month. Supports all features needed for a portfolio project.
    name: 'Basic'
  }
  properties: {
    // Never enable admin credentials — use AcrPull managed identity instead
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    // Zone redundancy not available on Basic SKU; enable on Premium for production
    zoneRedundancy: 'Disabled'
  }
}

output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output acrResourceId string = acr.id
