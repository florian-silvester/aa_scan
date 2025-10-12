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

async function webflowRequest(endpoint) {
  const baseUrl = 'https://api.webflow.com/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
    }
  })
  
  if (!response.ok) {
    throw new Error(`Webflow API error: ${response.status}`)
  }
  
  return response.json()
}

async function checkLocaleIds() {
  console.log('🔍 Checking Webflow Locale Configuration\n')
  
  const siteInfo = await webflowRequest(`/sites/${WEBFLOW_SITE_ID}`)
  
  console.log('Site:', siteInfo.displayName)
  console.log('\nLocale Configuration:')
  console.log(JSON.stringify(siteInfo.locales, null, 2))
  
  console.log('\n📝 What the sync code is using:')
  console.log(`  Primary (en): ${siteInfo.locales.primary?.cmsLocaleId}`)
  console.log(`  Primary tag: ${siteInfo.locales.primary?.tag}`)
  
  if (siteInfo.locales.secondary) {
    const germanLocale = siteInfo.locales.secondary.find(l => l.tag === 'de' || l.tag === 'de-DE')
    console.log(`  German (de-DE): ${germanLocale?.cmsLocaleId}`)
    console.log(`  German tag: ${germanLocale?.tag}`)
  }
  
  console.log('\n⚠️  CRITICAL CHECK:')
  console.log(`  When we update WITHOUT cmsLocaleId param → goes to ${siteInfo.locales.primary?.tag} locale`)
  console.log(`  When we update WITH cmsLocaleId=${siteInfo.locales.secondary?.[0]?.cmsLocaleId} → goes to ${siteInfo.locales.secondary?.[0]?.tag} locale`)
}

checkLocaleIds().catch(console.error)

