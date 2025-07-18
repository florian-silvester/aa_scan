#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

async function verifyMultipleCreators() {
  const fetch = (await import('node-fetch')).default
  
  // Get creators and check their works
  const creatorsResponse = await fetch('https://api.webflow.com/v2/collections/686e4d544cb3505ce3b1412c/items?limit=20', {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })
  
  const creators = await creatorsResponse.json()
  
  console.log('✅ Creator works verification:')
  console.log('Creator Name → Works Count')
  console.log('─'.repeat(50))
  
  creators.items.forEach(creator => {
    const worksCount = creator.fieldData.works?.length || 0
    const status = worksCount > 0 ? '✅' : '⚪'
    console.log(`${status} ${creator.fieldData.name} → ${worksCount} artworks`)
  })
  
  // Count creators with works
  const creatorsWithWorks = creators.items.filter(c => c.fieldData.works?.length > 0)
  console.log('─'.repeat(50))
  console.log(`📊 ${creatorsWithWorks.length}/${creators.items.length} creators have artworks linked`)
  
  // Show summary
  if (creatorsWithWorks.length > 0) {
    console.log('\n✅ Creator → Artwork linkage is working!')
  } else {
    console.log('\n❌ Creator → Artwork linkage needs fixing')
  }
}

verifyMultipleCreators().catch(console.error) 