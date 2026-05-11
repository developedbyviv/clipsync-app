// ─────────────────────────────────────────────────────────────────────────────
// modules/aks.bicep
// AKS cluster that runs all ClipSync workloads.
//
// Key design decisions:
//   • SystemAssigned identity — avoids storing service principal credentials
//   • Workload Identity + OIDC — pods authenticate to Azure without secrets
//   • azureKeyvaultSecretsProvider addon — mounts KV secrets as volumes
//   • omsagent addon — sends container logs/metrics to Log Analytics
//   • autoUpgradeProfile: patch — auto-applies patch versions only
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Project name')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region')
param location string

@description('Number of nodes in the system agent pool')
param nodeCount int = 2

@description('VM size for agent nodes. Standard_B2s = 2 vCPU, 4 GB RAM, ~$35/month each')
param nodeSize string = 'Standard_B2s'

@description('Log Analytics Workspace resource ID — enables Azure Monitor for containers')
param logAnalyticsWorkspaceId string

// AKS managed cluster — the Kubernetes control plane and node pools
resource cluster 'Microsoft.ContainerService/managedClusters@2024-01-01' = {
  name: 'aks-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
  }
  // SystemAssigned identity: Azure creates and manages the identity automatically
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    kubernetesVersion: '1.29'
    // DNS prefix for the API server FQDN — must be unique in the region
    dnsPrefix: 'aks-${projectName}-${environment}'

    // System agent pool — runs kube-system components + ClipSync workloads
    agentPoolProfiles: [
      {
        name: 'systempool'
        count: nodeCount
        vmSize: nodeSize
        osType: 'Linux'
        // System mode: this pool can run kube-system pods (required)
        mode: 'System'
        enableAutoScaling: false
        // 30 GB OS disk is sufficient for our container images
        osDiskSizeGB: 30
        // VirtualMachineScaleSets required for most AKS features (autoscaler etc.)
        type: 'VirtualMachineScaleSets'
        nodeTaints: []
        tags: {
          environment: environment
        }
      }
    ]

    networkProfile: {
      // Azure CNI: each pod gets an IP from the VNet subnet (real VNet IPs)
      networkPlugin: 'azure'
      // Azure network policy: enforces Kubernetes NetworkPolicy objects
      networkPolicy: 'azure'
      // Standard load balancer for outbound internet traffic
      loadBalancerSku: 'standard'
      outboundType: 'loadBalancer'
    }

    addonProfiles: {
      // Azure Monitor for containers — sends stdout/stderr logs + metrics to Log Analytics
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalyticsWorkspaceId
        }
      }
      // Key Vault Secrets Provider — lets pods mount KV secrets as volumes
      // Configured via SecretProviderClass objects in Kubernetes (see Week 3)
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: {
          // Auto-refresh secrets when they change in Key Vault
          enableSecretRotation: 'true'
          rotationPollInterval: '2m'
        }
      }
    }

    // OIDC Issuer URL — required for Workload Identity federation
    oidcIssuerProfile: {
      enabled: true
    }

    securityProfile: {
      // Workload Identity: pods get short-lived Azure AD tokens, no stored credentials
      workloadIdentity: {
        enabled: true
      }
    }

    // Patch channel: automatically applies patch updates (1.29.x → 1.29.y)
    // Does NOT auto-upgrade minor versions — you control 1.29 → 1.30 manually
    autoUpgradeProfile: {
      upgradeChannel: 'patch'
    }
  }
}

output clusterName string = cluster.name
output clusterId string = cluster.id

@description('Object ID of the kubelet managed identity — used for AcrPull and Key Vault RBAC')
output kubeletIdentityObjectId string = cluster.properties.identityProfile.kubeletidentity.objectId

@description('OIDC issuer URL — used when creating Federated Identity Credentials for Workload Identity')
output oidcIssuerUrl string = cluster.properties.oidcIssuerProfile.issuerURL
