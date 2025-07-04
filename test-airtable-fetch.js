// Simple test to fetch and display Airtable data
import dotenv from 'dotenv'

// Load environment variables (if available)
dotenv.config()

// Use the credentials from your server logs
const AIRTABLE_TOKEN = 'patTAaaMx8SrQUjou.66e8097cfa8a431bff2e2bb845cacf49dacf5fb674742212bb492ac66c9d2e1f'
const BASE_ID = 'appEbYLjaQzk7Fs6y'

async function fetchAirtableTable(tableName) {
  try {
    console.log(`📥 Fetching ${tableName} from Airtable...`)
    
    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableName}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.records
  } catch (error) {
    console.error(`❌ Error fetching ${tableName}:`, error.message)
    return []
  }
}

async function testAirtableFetch() {
  console.log('🔍 Testing Airtable data fetch...\n')
  
  // Fetch Articles
  const articles = await fetchAirtableTable('Articles')
  console.log(`📋 Found ${articles.length} articles:`)
  articles.slice(0, 3).forEach((article, i) => {
    const fields = article.fields
    console.log(`  ${i + 1}. ${fields.Title || fields['Title EN'] || 'Untitled'}`)
    console.log(`     Author: ${fields.Author || 'Unknown'}`)
    console.log(`     Maker: ${fields.Maker || 'Unknown'}`)
    if (fields.Introduction || fields['Introduction EN']) {
      const intro = (fields.Introduction || fields['Introduction EN'] || '').substring(0, 100)
      console.log(`     Intro: ${intro}${intro.length >= 100 ? '...' : ''}`)
    }
    console.log('')
  })
  
  // Fetch Images/Artworks
  const artworks = await fetchAirtableTable('Images')
  console.log(`🎨 Found ${artworks.length} artworks:`)
  artworks.slice(0, 5).forEach((artwork, i) => {
    const fields = artwork.fields
    console.log(`  ${i + 1}. ${fields['Image ID'] || 'No ID'} - ${fields['Work Title'] || 'Untitled'}`)
    console.log(`     Maker: ${fields.Maker || 'Unknown'}`)
    console.log(`     Material: ${fields.Material || fields['Material EN'] || 'Unknown'}`)
    console.log(`     Year: ${fields.Year || 'Unknown'}`)
    console.log('')
  })
  
  console.log('📊 Summary:')
  console.log(`   Total Articles: ${articles.length}`)
  console.log(`   Total Artworks: ${artworks.length}`)
  
  return { articles, artworks }
}

// Run the test
testAirtableFetch()
  .then(() => console.log('✅ Test completed!'))
  .catch(error => console.error('❌ Test failed:', error)) 