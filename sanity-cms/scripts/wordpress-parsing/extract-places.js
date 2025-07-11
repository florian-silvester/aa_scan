import fs from 'fs'
import { parseString } from 'xml2js'

/**
 * Places (Galleries/Locations) Extractor
 * Extracts "places" post type from WordPress XML
 */

async function extractPlaces(xmlFilePath) {
  console.log(`📄 Reading XML file: ${xmlFilePath}`)
  
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf8')
  console.log(`📊 File size: ${(xmlContent.length / (1024 * 1024)).toFixed(1)} MB`)
  
  return new Promise((resolve, reject) => {
    const options = {
      trim: true,
      explicitArray: true,
      explicitRoot: true,
      strict: false
    }
    
    parseString(xmlContent, options, (err, result) => {
      if (err) {
        console.error('❌ XML parsing failed, using regex fallback...')
        extractPlacesWithRegex(xmlContent)
        return
      }

      try {
        console.log('✅ XML parsed successfully')
        
        const channel = result.rss.channel[0]
        const items = channel.item || []
        
        console.log(`📊 Total items: ${items.length}`)
        
        // Filter for places posts
        const placesPosts = items.filter(item => {
          const postType = item['wp:post_type'] && item['wp:post_type'][0]
          return postType === 'places'
        })
        
        console.log(`🏛️  Found ${placesPosts.length} places entries`)
        
        // Extract and clean the data
        const placesData = placesPosts.map(item => {
          const place = {
            id: item['wp:post_id'] ? item['wp:post_id'][0] : null,
            title: item.title ? item.title[0] : '',
            content: item['content:encoded'] ? item['content:encoded'][0] : '',
            excerpt: item['excerpt:encoded'] ? item['excerpt:encoded'][0] : '',
            slug: item['wp:post_name'] ? item['wp:post_name'][0] : '',
            status: item['wp:status'] ? item['wp:status'][0] : '',
            date: item['wp:post_date'] ? item['wp:post_date'][0] : '',
            modified: item['wp:post_modified'] ? item['wp:post_modified'][0] : '',
            link: item.link ? item.link[0] : '',
            type: 'places',
            meta: {},
            categories: []
          }
          
          // Extract custom fields (metadata)
          if (item['wp:postmeta']) {
            item['wp:postmeta'].forEach(meta => {
              const key = meta['wp:meta_key'] ? meta['wp:meta_key'][0] : null
              const value = meta['wp:meta_value'] ? meta['wp:meta_value'][0] : null
              if (key && value && !key.startsWith('_')) { // Skip private meta fields
                place.meta[key] = value
              }
            })
          }
          
          // Extract categories
          if (item.category) {
            place.categories = item.category.map(cat => ({
              name: cat._ || cat,
              domain: cat.$ && cat.$.domain ? cat.$.domain : 'category',
              nicename: cat.$ && cat.$.nicename ? cat.$.nicename : ''
            }))
          }
          
          return place
        })
        
        saveResults(placesData)
        showSummary(placesData)
        resolve(placesData)
        
      } catch (processError) {
        console.error('❌ Error processing XML:', processError.message)
        extractPlacesWithRegex(xmlContent)
      }
    })
  })
}

function extractPlacesWithRegex(xmlContent) {
  console.log('🔍 Using regex to extract places data...')
  
  // Regex to find places post items
  const placesPattern = /<item>[\s\S]*?<wp:post_type><!\[CDATA\[places\]\]><\/wp:post_type>[\s\S]*?<\/item>/g
  const matches = xmlContent.match(placesPattern) || []
  
  console.log(`🏛️  Found ${matches.length} places entries with regex`)
  
  const extractedData = matches.map((item, index) => {
    // Extract key fields with regex
    const getId = item.match(/<wp:post_id><!\[CDATA\[(\d+)\]\]><\/wp:post_id>/)
    const getTitle = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    const getContent = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
    const getSlug = item.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)
    const getStatus = item.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/)
    const getDate = item.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/)
    const getLink = item.match(/<link>(.*?)<\/link>/)
    
    return {
      id: getId ? getId[1] : `extracted_${index}`,
      title: getTitle ? getTitle[1] : `Place ${index + 1}`,
      content: getContent ? getContent[1] : '',
      slug: getSlug ? getSlug[1] : '',
      status: getStatus ? getStatus[1] : '',
      date: getDate ? getDate[1] : '',
      link: getLink ? getLink[1] : '',
      type: 'places',
      meta: {},
      categories: []
    }
  })
  
  saveResults(extractedData)
  showSummary(extractedData)
  return extractedData
}

function saveResults(data) {
  const outputFile = `places-extracted-${new Date().toISOString().split('T')[0]}.json`
  
  fs.writeFileSync(outputFile, JSON.stringify({
    export_date: new Date().toISOString(),
    total_places: data.length,
    places: data
  }, null, 2))
  
  console.log(`\n✅ Places data extracted!`)
  console.log(`📁 Saved to: ${outputFile}`)
}

function showSummary(data) {
  console.log('\n📋 Summary of extracted places:')
  data.slice(0, 10).forEach((place, index) => {
    console.log(`  ${index + 1}. ${place.title} (ID: ${place.id})`)
  })
  
  if (data.length > 10) {
    console.log(`  ... and ${data.length - 10} more`)
  }
  
  // Look for Flow Gallery specifically
  const flowGallery = data.find(place => 
    place.title.toLowerCase().includes('flow gallery') ||
    place.content.toLowerCase().includes('flow gallery')
  )
  
  if (flowGallery) {
    console.log('\n🎯 Found Flow Gallery!')
    console.log(`   Title: ${flowGallery.title}`)
    console.log(`   ID: ${flowGallery.id}`)
    console.log(`   Slug: ${flowGallery.slug}`)
    console.log(`   Status: ${flowGallery.status}`)
    if (Object.keys(flowGallery.meta).length > 0) {
      console.log(`   Meta fields: ${Object.keys(flowGallery.meta).join(', ')}`)
    }
  } else {
    console.log('\n🔍 Flow Gallery not found, but here are galleries with "Flow" in the name:')
    const flowMatches = data.filter(place => 
      place.title.toLowerCase().includes('flow')
    )
    flowMatches.forEach(match => {
      console.log(`   - ${match.title}`)
    })
  }
  
  // Show gallery types
  const galleryTypes = data.filter(place => 
    place.title.toLowerCase().includes('gallery') ||
    place.title.toLowerCase().includes('galerie')
  )
  console.log(`\n🎨 Found ${galleryTypes.length} galleries/galeries`)
}

// Get XML file path from command line
const xmlFilePath = process.argv[2]

if (!xmlFilePath) {
  console.log('Please provide the XML file path:')
  console.log('node extract-places.js your-wordpress-export.xml')
  process.exit(1)
}

extractPlaces(xmlFilePath).catch(console.error) 