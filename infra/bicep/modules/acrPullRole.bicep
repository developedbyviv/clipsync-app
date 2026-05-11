// ─────────────────────────────────────────────────────────────────────────────
// modules/acrPullRole.bicep
// Grants the AKS kubelet identity the AcrPull role on the Container Registry.
//
// Why a separate module?
// main.bicep has targetScope = 'subscription'. Role assignments on a resource
// group resource (ACR) require resource group scope — impossible to do inline
// at subscription scope. This helper module bridges that gap.
//
// Result: AKS pods can pull images from ACR without imagePullSecrets.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'resourceGroup'

@description('Name of the ACR to scope the role assignment to')
param acrName string

@description('Object ID of the AKS kubelet managed identity')
param kubeletIdentityObjectId string

// Reference the existing ACR so we can scope the role assignment to it
resource existingAcr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' existing = {
  name: acrName
}

// Grant the AKS kubelet identity AcrPull on the Container Registry.
// Role ID 7f951dda... = AcrPull — allows pulling images, no push or admin access.
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // guid() produces a stable, deterministic name from the three inputs
  name: guid(existingAcr.id, kubeletIdentityObjectId, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: existingAcr
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull built-in role
    )
    principalId: kubeletIdentityObjectId
    principalType: 'ServicePrincipal'
  }
}
