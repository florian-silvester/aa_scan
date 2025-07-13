import {createClient} from '@sanity/client'
import dotenv from 'dotenv'

// Load environment variables explicitly
dotenv.config()

// Verify environment loading
console.log('🔍 COMPREHENSIVE PERMISSION TEST\n')
console.log('📋 Environment Check:')
console.log('- SANITY_API_TOKEN:', process.env.SANITY_API_TOKEN ? `Present (${process.env.SANITY_API_TOKEN.length} chars)` : 'Missing')
console.log('')

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || '',
  apiVersion: '2023-01-01',
})

console.log('🔧 Client Configuration:')
console.log('- Project ID:', client.config().projectId)
console.log('- Dataset:', client.config().dataset)
console.log('- Token Status:', client.config().token ? 'Loaded Successfully' : 'MISSING')
console.log('- Token Preview:', client.config().token ? '***' + client.config().token.slice(-8) : 'None')
console.log('')

async function testPermissions() {
  try {
    console.log('📊 Testing Read Permissions...')
    const artworkCount = await client.fetch('count(*[_type == "artwork"])')
    console.log('✅ READ: Success -', artworkCount, 'artworks found')
    
    console.log('\n🔨 Testing Write Permissions...')
    const testDoc = await client.create({
      _type: 'test-permissions',
      _id: 'permission-test-' + Date.now(),
      title: 'Comprehensive Permission Test',
      createdAt: new Date().toISOString()
    })
    console.log('✅ CREATE: Success -', testDoc._id)
    
    console.log('\n✏️  Testing Update Permissions...')
    const updatedDoc = await client.patch(testDoc._id)
      .set({ title: 'Updated Title', updatedAt: new Date().toISOString() })
      .commit()
    console.log('✅ UPDATE: Success -', updatedDoc._id)
    
    console.log('\n🗑️  Testing Delete Permissions...')
    await client.delete(testDoc._id)
    console.log('✅ DELETE: Success - test document removed')
    
    console.log('\n🎉 ALL PERMISSIONS CONFIRMED!')
    console.log('💪 READY FOR COMPREHENSIVE AUTOMATED ACTION!')
    
    return true
    
  } catch (error) {
    console.error('\n❌ PERMISSION TEST FAILED:')
    console.error('Error:', error.message)
    console.error('\n🔧 Debug Info:')
    console.error('- Error Type:', error.constructor.name)
    console.error('- Status Code:', error.statusCode || 'Unknown')
    console.error('- Details:', error.details || 'None')
    
    if (error.message.includes('Insufficient permissions')) {
      console.error('\n💡 SOLUTION: The token needs proper Editor permissions')
      console.error('1. Go to: https://www.sanity.io/manage/personal/tokens')
      console.error('2. Verify the token has "Editor" permissions')
      console.error('3. Ensure it\'s for the correct project: b8bczekj')
    }
    
    return false
  }
}

testPermissions() 