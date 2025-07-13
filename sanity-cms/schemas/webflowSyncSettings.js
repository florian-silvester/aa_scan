export default {
  name: 'webflowSyncSettings',
  title: 'Webflow Sync Settings',
  type: 'document',
  fields: [
    {
      name: 'assetMappings',
      title: 'Asset Mappings',
      type: 'text',
      description: 'JSON string mapping Sanity asset IDs to Webflow asset IDs for incremental sync'
    },
    {
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      description: 'When the mappings were last updated'
    }
  ]
} 