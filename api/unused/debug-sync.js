const {createClient} = require('@sanity/client')

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
})

// Test the loadAssetMappings function in isolation
async function testLoadAssetMappings() {
  try {
    console.log('🧪 Testing loadAssetMappings...')
    
    const result = await sanityClient.fetch(`
      *[_type == "webflowSyncSettings" && _id == "asset-mappings"][0] {
        assetMappings
      }
    `)
    
    console.log('📄 Sanity query result:', result)
    
    if (result?.assetMappings) {
      console.log('📄 assetMappings field exists:', typeof result.assetMappings)
      console.log('📄 assetMappings content:', result.assetMappings?.substring(0, 200) + '...')
      
      const parsedMappings = JSON.parse(result.assetMappings)
      console.log('✅ JSON parsed successfully, keys:', Object.keys(parsedMappings).length)
      
      return { success: true, mappings: parsedMappings }
    } else {
      console.log('📄 No existing asset mappings found')
      return { success: true, mappings: {} }
    }
  } catch (error) {
    console.error('❌ Error in loadAssetMappings:', error.message)
    return { success: false, error: error.message }
  }
}

// Main API handler
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    console.log('🔍 Debug sync starting...')
    
    // Test environment variables
    const envCheck = {
      SANITY_API_TOKEN: !!process.env.SANITY_API_TOKEN,
      WEBFLOW_API_TOKEN: !!process.env.WEBFLOW_API_TOKEN
    }
    console.log('🔑 Environment variables:', envCheck)
    
    if (!process.env.SANITY_API_TOKEN || !process.env.WEBFLOW_API_TOKEN) {
      throw new Error('Missing environment variables')
    }
    
    // Test basic Sanity connection
    const sanityTest = await sanityClient.fetch('*[_type == "materialType"][0]{_id}')
    console.log('📊 Sanity connection test:', sanityTest)
    
    // Test the problematic function
    const mappingsTest = await testLoadAssetMappings()
    console.log('🗂️ Asset mappings test:', mappingsTest)
    
    res.status(200).json({
      message: 'Debug completed',
      envCheck,
      sanityTest: !!sanityTest,
      mappingsTest
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error.message)
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }
} 