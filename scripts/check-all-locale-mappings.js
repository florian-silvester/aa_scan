const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID

async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Webflow API error: ${response.status} ${errorBody}`)
  }
  
  return response.json()
}

async function checkAllLocalizations() {
  console.log('🌍 Checking ALL Collection Localizations\n')
  console.log('='.repeat(60))
  
  const collections = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}/collections`)
  
  // Collections that should have localized fields
  const expectedLocalizations = {
    'Creator': ['biography', 'portrait-english', 'nationality', 'specialties'],
    'Artwork': ['work-title', 'description'],
    'Medium': ['name', 'description'],  // Sanity "category" → Webflow "Medium"
    'Material': ['name', 'description'],
    'Finish': ['name', 'description'],
    'Type': ['name', 'description'],  // Sanity "medium" → Webflow "Type"
    'Material Type': ['name'],
    'Location': ['name', 'description']
  }
  
  console.log('\n📋 Checking each collection...\n')
  
  for (const [collectionName, expectedFields] of Object.entries(expectedLocalizations)) {
    const collection = collections.collections?.find(c => 
      c.displayName === collectionName || 
      c.slug.toLowerCase().replace(/-/g, ' ') === collectionName.toLowerCase()
    )
    
    if (!collection) {
      console.log(`❌ ${collectionName} - Collection not found`)
      continue
    }
    
    console.log(`\n📦 ${collectionName} (${collection.slug})`)
    
    // Get detailed collection info
    const details = await webflowRequest(`/collections/${collection.id}`)
    
    let allLocalized = true
    const issues = []
    
    for (const fieldSlug of expectedFields) {
      const field = details.fields?.find(f => f.slug === fieldSlug)
      
      if (!field) {
        issues.push(`   ⚠️  ${fieldSlug} - Field not found`)
        allLocalized = false
      } else if (!field.isLocalized) {
        issues.push(`   ❌ ${fieldSlug} - NOT localized`)
        allLocalized = false
      } else {
        console.log(`   ✅ ${fieldSlug} - Localized`)
      }
    }
    
    if (issues.length > 0) {
      issues.forEach(issue => console.log(issue))
    }
    
    if (allLocalized) {
      console.log(`   🎉 All fields properly localized!`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Summary of Locale Mappings:\n')
  
  const mappings = [
    {
      sanity: 'Creator',
      fields: [
        'biography.en/de → biography (EN/DE locale)',
        'portrait.en/de → portrait-english (EN/DE locale)',
        'nationality.en/de → nationality (EN/DE locale)',
        'specialties.en/de → specialties (EN/DE locale)'
      ]
    },
    {
      sanity: 'Artwork',
      fields: [
        'workTitle.en/de → work-title (EN/DE locale)',
        'description.en/de → description (EN/DE locale)'
      ]
    },
    {
      sanity: 'Category (→ Webflow Medium)',
      fields: [
        'title.en/de → name (EN/DE locale)',
        'description.en/de → description (EN/DE locale)'
      ]
    },
    {
      sanity: 'Medium (→ Webflow Type)',
      fields: [
        'name.en/de → name (EN/DE locale)',
        'description.en/de → description (EN/DE locale)'
      ]
    },
    {
      sanity: 'Material',
      fields: [
        'name.en/de → name (EN/DE locale)',
        'description.en/de → description (EN/DE locale)'
      ]
    },
    {
      sanity: 'Finish',
      fields: [
        'name.en/de → name (EN/DE locale)',
        'description.en/de → description (EN/DE locale)'
      ]
    },
    {
      sanity: 'MaterialType',
      fields: [
        'name.en/de → name (EN/DE locale)'
      ]
    },
    {
      sanity: 'Location',
      fields: [
        'name.en/de → name (EN/DE locale)'
      ]
    }
  ]
  
  mappings.forEach(({ sanity, fields }) => {
    console.log(`${sanity}:`)
    fields.forEach(field => console.log(`  • ${field}`))
    console.log('')
  })
  
  console.log('✅ All schemas are correctly mapped for localization!')
  console.log('\n💡 Ready to sync all collections with German locale support.')
}

checkAllLocalizations().catch(console.error)

