// ─────────────────────────────────────────────────────────────────────────────
// modules/appInsights.bicep
// Application Insights — captures HTTP traces, exceptions, dependency calls,
// and custom events from the ClipSync API and frontend.
// Workspace-based mode (not classic): all telemetry is stored in Log Analytics.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

@description('Log Analytics Workspace resource ID — App Insights stores data here')
param logAnalyticsWorkspaceId string

// Application Insights — APM for the ClipSync API and Next.js frontend
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${projectName}-${environment}-inc'
  location: location
  // kind = 'web' tells the portal to show web-specific dashboards
  kind: 'web'
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  properties: {
    Application_Type: 'web'
    // Link to Log Analytics — workspace-based mode is the modern approach
    WorkspaceResourceId: logAnalyticsWorkspaceId
    // LogAnalytics ingestion mode = data goes to the linked workspace
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    RetentionInDays: 30
    // 100% sampling — capture all requests (reduce for high-traffic production)
    SamplingPercentage: 100
  }
}

@description('Connection string — pass this to APPLICATIONINSIGHTS_CONNECTION_STRING env var')
@secure()
output connectionString string = appInsights.properties.ConnectionString

@description('Instrumentation key — legacy; prefer connection string for new deployments')
@secure()
output instrumentationKey string = appInsights.properties.InstrumentationKey

output appInsightsId string = appInsights.id
