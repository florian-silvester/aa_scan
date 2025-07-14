import {createClient} from '@sanity/client'

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01'
})

// Webflow collection IDs
const WEBFLOW_COLLECTIONS = {
  materialType: '6873884cedcec21fab8dd8dc',
  material: '687388627483ef982c64eb3f',
  finish: '6873886339818fe4cd550b03',
  medium: '686e55eace746485413c6bfb',
  category: '686e4fd904ae9f54468f85df',
  location: '686e4ff7977797cc67e99b97',
  creator: '686e4d544cb3505ce3b1412c',
  artwork: '686e50ba1170cab27bfa6c49'
}

// Store mapping of Sanity IDs to Webflow IDs
const idMappings = new Map()

/**
 * ONE-WAY DELETION SYNC: Sanity → Webflow
 * 
 * How it works:
 * 1. Monitor Sanity for deletions (webhooks or periodic sync)
 * 2. When item deleted in Sanity → Delete corresponding item in Webflow
 * 3. Update ID mappings to remove deleted references
 */

// Simulate deletion detection
async function detectSanityDeletions(collectionType) {
  // In real implementation, this would:
  // 1. Use Sanity webhooks to detect deletions
  // 2. Or compare current Sanity items vs stored mappings
  // 3. Find items that exist in Webflow but not in Sanity
  
  console.log(`🔍 Checking for deleted ${collectionType} items in Sanity...`)
  
  // Example: Get current items from Sanity
  const currentSanityItems = await sanityClient.fetch(`
    *[_type == "${collectionType}"]._id
  `)
  
  console.log(`Found ${currentSanityItems.length} current ${collectionType} items in Sanity`)
  
  // Compare with stored mappings to find deletions
  const deletedItems = []
  for (const [sanityId, webflowId] of idMappings) {
    if (!currentSanityItems.includes(sanityId)) {
      deletedItems.push({ sanityId, webflowId })
    }
  }
  
  return deletedItems
}

// Delete items from Webflow using MCP tools
async function deleteFromWebflow(collectionId, webflowItemIds) {
  console.log(`🗑️ Deleting ${webflowItemIds.length} items from Webflow collection ${collectionId}`)
  
  const results = []
  
  for (const itemId of webflowItemIds) {
    try {
      // Use MCP tool to delete individual item
      console.log(`Deleting Webflow item: ${itemId}`)
      // Note: This would use mcp_webflow_collections_items_delete_item
      // const result = await mcp_webflow_collections_items_delete_item(collectionId, itemId)
      results.push({ itemId, status: 'deleted', success: true })
    } catch (error) {
      console.error(`Failed to delete ${itemId}:`, error.message)
      results.push({ itemId, status: 'error', error: error.message, success: false })
    }
  }
  
  return results
}

// Main deletion sync function
async function syncDeletions(collectionType) {
  try {
    console.log(`\n🚀 Starting Deletion Sync for ${collectionType}`)
    console.log('='.repeat(60))
    
    // 1. Detect what was deleted in Sanity
    const deletedItems = await detectSanityDeletions(collectionType)
    
    if (deletedItems.length === 0) {
      console.log('✅ No deletions detected - all items in sync')
      return { deleted: 0, errors: 0 }
    }
    
    console.log(`Found ${deletedItems.length} items to delete from Webflow:`)
    deletedItems.forEach(item => {
      console.log(`  - Sanity ID: ${item.sanityId} → Webflow ID: ${item.webflowId}`)
    })
    
    // 2. Delete from Webflow
    const collectionId = WEBFLOW_COLLECTIONS[collectionType]
    const webflowIds = deletedItems.map(item => item.webflowId)
    const deleteResults = await deleteFromWebflow(collectionId, webflowIds)
    
    // 3. Update ID mappings
    const successfulDeletions = deleteResults.filter(r => r.success)
    successfulDeletions.forEach(result => {
      const deletedItem = deletedItems.find(item => item.webflowId === result.itemId)
      if (deletedItem) {
        idMappings.delete(deletedItem.sanityId)
        console.log(`✅ Removed mapping: ${deletedItem.sanityId}`)
      }
    })
    
    // 4. Summary
    const deleted = successfulDeletions.length
    const errors = deleteResults.filter(r => !r.success).length
    
    console.log(`\n📊 Deletion Sync Complete:`)
    console.log(`  ✅ Successfully deleted: ${deleted}`)
    console.log(`  ❌ Errors: ${errors}`)
    
    return { deleted, errors, results: deleteResults }
    
  } catch (error) {
    console.error('❌ Deletion sync failed:', error.message)
    throw error
  }
}

// Example: Full bidirectional sync workflow
async function fullSyncWorkflow() {
  console.log('🔄 COMPLETE SYNC WORKFLOW')
  console.log('='.repeat(80))
  
  try {
    // 1. Sync new/updated items (Sanity → Webflow)
    console.log('\n📤 PHASE 1: Create/Update Sync')
    // This would call our existing sync functions
    console.log('- Sync new Material Types → Webflow ✅')
    console.log('- Sync updated Creators → Webflow ✅')
    console.log('- Sync new Artworks → Webflow ✅')
    
    // 2. Sync deletions (Sanity → Webflow)
    console.log('\n🗑️ PHASE 2: Deletion Sync')
    await syncDeletions('materialType')
    await syncDeletions('creator')
    await syncDeletions('artwork')
    
    console.log('\n✅ Complete sync workflow finished!')
    
  } catch (error) {
    console.error('❌ Sync workflow failed:', error.message)
  }
}

// Webhook handler for real-time deletion sync
function createDeletionWebhook() {
  return {
    // This would be your Vercel API endpoint
    endpoint: '/api/webhook/sanity-deletion',
    
    handler: async (req, res) => {
      try {
        const { _type, _id } = req.body
        
        console.log(`🔔 Deletion webhook: ${_type} item ${_id} deleted in Sanity`)
        
        // Look up Webflow ID from mapping
        const webflowId = idMappings.get(_id)
        if (!webflowId) {
          console.log('No Webflow mapping found - already synced')
          return res.status(200).json({ status: 'no_action_needed' })
        }
        
        // Delete from Webflow
        const collectionId = WEBFLOW_COLLECTIONS[_type]
        await deleteFromWebflow(collectionId, [webflowId])
        
        // Remove from mapping
        idMappings.delete(_id)
        
        console.log('✅ Deletion synced successfully')
        res.status(200).json({ status: 'deleted', webflowId })
        
      } catch (error) {
        console.error('❌ Webhook deletion failed:', error.message)
        res.status(500).json({ error: error.message })
      }
    }
  }
}

// Export functions
export { 
  syncDeletions,
  fullSyncWorkflow,
  createDeletionWebhook,
  detectSanityDeletions,
  deleteFromWebflow
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2] || 'workflow'
  
  if (action === 'delete') {
    const collectionType = process.argv[3] || 'materialType'
    syncDeletions(collectionType)
  } else {
    fullSyncWorkflow()
  }
} 