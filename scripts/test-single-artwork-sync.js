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

const {createClient} = require('@sanity/client')

// Sanity client
const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
})

// Webflow API helper
async function webflowRequest(endpoint, options = {}) {
  const baseUrl = 'https://api.webflow.com/v2'
  const fetch = (await import('node-fetch')).default
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : null
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Webflow API Error:', errorText)
    throw new Error(`Webflow API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

const ARTWORKS_COLLECTION_ID = '686e50ba1170cab27bfa6c49'

async function testSingleArtworkSync() {
  try {
    console.log('🎨 Testing single artwork sync with URL-based images...')
    
    // Get one artwork with images from Sanity
    const artwork = await sanityClient.fetch(`
      *[_type == "artwork" && defined(images) && count(images) > 0][0] {
        _id,
        name,
        workTitle,
        description,
        slug,
        images[]{ 
          asset->{
            _id,
            url,
            originalFilename
          },
          alt
        }
      }
    `)
    
    if (!artwork) {
      console.log('❌ No artwork with images found in Sanity')
      return
    }
    
    console.log(`📋 Found artwork: "${artwork.name}" with ${artwork.images.length} images`)
    
    // Transform images using new URL-based approach
    const artworkImages = artwork.images.map(image => {
      if (!image.asset?.url) return null
      
      const altText = image.alt?.en || image.alt?.de || ''
      const artworkName = artwork.name || artwork.workTitle?.en || artwork.workTitle?.de
      
      let enhancedAltText = altText
      if (!enhancedAltText && artworkName) {
        enhancedAltText = artworkName
      }
      
      return {
        url: image.asset.url,
        alt: enhancedAltText || artworkName || 'Artwork image'
      }
    }).filter(Boolean)
    
    console.log(`🖼️  Prepared ${artworkImages.length} images:`)
    artworkImages.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.alt} (${img.url.substring(0, 50)}...)`)
    })
    
    // Create Webflow artwork
    const webflowData = {
      items: [{
        fieldData: {
          name: artwork.name + ' - URL Test',
          slug: (artwork.slug?.current || artwork.name).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-url-test',
          'artwork-images': artworkImages  // Using URL format!
        }
      }]
    }
    
    console.log('🚀 Creating artwork in Webflow...')
    const result = await webflowRequest(`/collections/${ARTWORKS_COLLECTION_ID}/items`, {
      method: 'POST',
      body: webflowData
    })
    
    console.log('✅ Artwork created successfully!')
    console.log('Item ID:', result.items[0].id)
    
    // Verify the result
    const items = await webflowRequest(`/collections/${ARTWORKS_COLLECTION_ID}/items?name=${encodeURIComponent(artwork.name + ' - URL Test')}`)
    
    if (items.items.length > 0) {
      const createdArtwork = items.items[0]
      console.log('🔍 Verification:')
      console.log(`  - Name: ${createdArtwork.fieldData.name}`)
      console.log(`  - Images: ${createdArtwork.fieldData['artwork-images']?.length || 0}`)
      
      if (createdArtwork.fieldData['artwork-images']?.length > 0) {
        console.log('🎉 SUCCESS! Images were uploaded and linked:')
        createdArtwork.fieldData['artwork-images'].forEach((img, i) => {
          console.log(`  ${i + 1}. ${img.alt} - ${img.fileId}`)
        })
      } else {
        console.log('❌ FAILED! No images in the created artwork')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testSingleArtworkSync() 