// ─────────────────────────────────────────────────────────────────────────────
// modules/postgres.bicep
// Azure Database for PostgreSQL Flexible Server — managed PostgreSQL 16.
//
// Tier choice: Burstable B1ms (~$15/month) is right for dev/portfolio.
// For real production: upgrade to General Purpose D2s_v3 for consistent CPU.
//
// Security: password auth only (Azure AD auth disabled for simplicity).
// The admin password is stored in Key Vault — never in plain config files.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

@description('PostgreSQL administrator password — stored in Key Vault, not in params file')
@secure()
param adminPassword string

@description('Log Analytics Workspace resource ID for diagnostic log streaming')
param logAnalyticsWorkspaceId string

// PostgreSQL Flexible Server — ClipSync database backend
resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: 'pg-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  sku: {
    // Burstable tier: CPU credits accumulate when idle, burst when needed
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    // Note: 'postgres' and 'admin' are reserved login names in Azure PostgreSQL
    administratorLogin: 'clipsync_admin'
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      // Geo-redundant backup doubles storage cost — disable for portfolio
      geoRedundantBackup: 'Disabled'
    }
    // HA disabled: reduces cost; enable Zone Redundant HA for real production
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      // Azure AD auth disabled for simplicity; enable for passwordless auth in production
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

// Create the ClipSync application database inside the server
resource clipSyncDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: server
  name: 'clipsync'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Firewall rule: allow all Azure services to connect
// This includes AKS pods via their outbound public IPs.
// For production: restrict to the AKS VNet via VNet Integration.
resource azureServicesFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: server
  name: 'AllowAzureServices'
  properties: {
    // 0.0.0.0 to 0.0.0.0 is a special Azure rule meaning "allow Azure services"
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Diagnostic settings — stream PostgreSQL logs to Log Analytics for monitoring
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'pg-${projectName}-${environment}-diag'
  scope: server
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        // General query logs — captures slow queries, connection events
        category: 'PostgreSQLLogs'
        enabled: true
      }
      {
        // Query Store — runtime statistics for query performance tuning
        category: 'QueryStoreRuntimeStatistics'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output fqdn string = server.properties.fullyQualifiedDomainName
output serverName string = server.name
output databaseName string = clipSyncDb.name
output adminLogin string = server.properties.administratorLogin

@description('PostgreSQL connection string — stored in Key Vault as postgres-connection-string')
@secure()
output connectionString string = 'postgresql://${server.properties.administratorLogin}:${adminPassword}@${server.properties.fullyQualifiedDomainName}:5432/clipsync?sslmode=require'
