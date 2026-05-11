// ─────────────────────────────────────────────────────────────────────────────
// modules/resourceGroup.bicep
// Creates the resource group that contains all environment resources.
// targetScope = 'subscription' because resource groups live at sub level.
// ─────────────────────────────────────────────────────────────────────────────
targetScope = 'subscription'

@description('Project name — used in all resource names')
param projectName string

@description('Environment name: dev or prod')
param environment string

@description('Azure region for the resource group')
param location string

// Resource group — logical container for all ClipSync resources in this environment
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${projectName}-${environment}-inc'
  location: location
  tags: {
    environment: environment
    project: projectName
    managedBy: 'bicep'
    createdDate: utcNow('yyyy-MM-dd')
  }
}

@description('Name of the created resource group')
output resourceGroupName string = rg.name

@description('Resource ID of the created resource group')
output resourceGroupId string = rg.id
