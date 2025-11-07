const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) process.env[key.trim()] = value.trim()
  })
}

async function cleanupOrphanedGerman() {
  const CREATOR_COL = '68c6785963cdfa79c3a138ab'
  const EN_LOCALE = '68c6785963cdfa79c3a137cc'
  const DE_LOCALE = '68e134d0086ac0f97d5540b9'
  
  console.log('🧹 Cleaning up orphaned German creator items\n')
  console.log('='.repeat(60))
  
  // Step 1: Get ALL English items (the source of truth)
  console.log('\n📥 Fetching English locale items...')
  let enItems = []
  let offset = 0
  
  while (true) {
    await new Promise(r => setTimeout(r, 1000))
    const res = await fetch(`https://api.webflow.com/v2/collections/${CREATOR_COL}/items?limit=100&offset=${offset}`, {
      headers: { 
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'wf-locale-id': EN_LOCALE
      }
    })
    const data = await res.json()
    if (!data.items || data.items.length === 0) break
    enItems = enItems.concat(data.items)
    if (data.items.length < 100) break
    offset += 100
  }
  
  console.log(`✅ Found ${enItems.length} English locale creators`)
  
  // Step 2: Get ALL German items
  console.log('\n📥 Fetching German locale items...')
  let deItems = []
  offset = 0
  
  while (true) {
    await new Promise(r => setTimeout(r, 1000))
    const res = await fetch(`https://api.webflow.com/v2/collections/${CREATOR_COL}/items?limit=100&offset=${offset}`, {
      headers: { 
        'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        'wf-locale-id': DE_LOCALE
      }
    })
    const data = await res.json()
    if (!data.items || data.items.length === 0) break
    deItems = deItems.concat(data.items)
    if (data.items.length < 100) break
    offset += 100
  }
  
  console.log(`✅ Found ${deItems.length} German locale items`)
  
  // Step 3: Delete ALL German items (we'll recreate them properly)
  console.log(`\n🗑️  Will delete ALL ${deItems.length} German items\n`)
  console.log('⚠️  This will DELETE all German locale content!')
  console.log('⚠️  They will be recreated properly on next sync.')
  console.log('\n⏳ Starting in 5 seconds... (Ctrl+C to cancel)\n')
  
  await new Promise(r => setTimeout(r, 5000))
  
  let deleted = 0
  let failed = 0
  
  for (const item of deItems) {
    try {
      await new Promise(r => setTimeout(r, 1500)) // Rate limiting
      await fetch(`https://api.webflow.com/v2/collections/${CREATOR_COL}/items/${item.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
          'wf-locale-id': DE_LOCALE
        }
      })
      deleted++
      if (deleted % 25 === 0) {
        console.log(`  Deleted ${deleted}/${deItems.length}...`)
      }
    } catch (e) {
      console.error(`  ❌ Failed: ${item.id}`)
      failed++
    }
  }
  
  console.log(`\n✅ Cleanup complete!`)
  console.log(`   Deleted: ${deleted}`)
  console.log(`   Failed: ${failed}`)
  console.log(`\n💡 Next: Run full sync with fixed code:`)
  console.log(`   node api/sync-to-webflow.js --only=creator`)
}

cleanupOrphanedGerman().catch(console.error)

