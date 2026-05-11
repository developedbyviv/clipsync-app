// ─────────────────────────────────────────────────────────────────────────────
// modules/logAnalytics.bicep
// Log Analytics Workspace — central log and metrics sink.
// All other resources (AKS, PostgreSQL, Redis, App Insights) send data here.
// Pricing: PerGB2018 — pay per GB ingested; first 5 GB/month free.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

// Log Analytics Workspace — receives logs from all ClipSync Azure resources
resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  properties: {
    sku: {
      // PerGB2018 = pay per GB ingested; cheapest option for portfolio projects
      name: 'PerGB2018'
    }
    // 30 days = free retention tier; beyond 30 days costs ~$0.10/GB/month
    retentionInDays: 30
    features: {
      // Scope log access to the resource that generated the log (not workspace-wide)
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

@description('Log Analytics Workspace GUID — used by agents for data ingestion')
output workspaceId string = workspace.properties.customerId

@description('Full resource ID — used by other resources to link diagnostic settings')
output workspaceResourceId string = workspace.id

output workspaceName string = workspace.name
