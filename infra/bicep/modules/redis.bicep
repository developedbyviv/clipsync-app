// ─────────────────────────────────────────────────────────────────────────────
// modules/redis.bicep
// Azure Cache for Redis — session store and real-time pub/sub for Socket.io.
//
// C0 Basic SKU: 250 MB cache, no SLA, ~$15/month. Fine for dev/portfolio.
// For production: upgrade to C1 Standard (1 GB, SLA, replication, ~$55/month).
//
// Security: TLS-only (enableNonSslPort = false), minimum TLS 1.2.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

@description('Log Analytics Workspace resource ID for diagnostic settings')
param logAnalyticsWorkspaceId string

// Azure Cache for Redis — used by ClipSync API for session caching and real-time pub/sub
resource cache 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  properties: {
    sku: {
      // Basic C0: 250 MB, no replication, no SLA — appropriate for dev/portfolio
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    // TLS-only: never expose the unencrypted port (6379) — always use 6380
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      // allkeys-lru: evict least-recently-used keys when memory is full
      // This prevents OOM errors at the cost of losing old cached data
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// Diagnostic settings — stream Redis metrics and connection events to Log Analytics
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'redis-${projectName}-${environment}-diag'
  scope: cache
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        // ConnectedClientList: logs client connection events
        category: 'ConnectedClientList'
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

// Retrieve the primary access key — required to build the connection string
var primaryKey = cache.listKeys().primaryKey

output hostName string = cache.properties.hostName
output sslPort int = cache.properties.sslPort

@description('Redis primary access key — stored in Key Vault as redis-connection-string')
@secure()
output primaryKey string = primaryKey

@description('ioredis-compatible connection string with TLS enabled')
@secure()
output connectionString string = '${cache.properties.hostName}:6380,password=${primaryKey},ssl=True,abortConnect=False'
