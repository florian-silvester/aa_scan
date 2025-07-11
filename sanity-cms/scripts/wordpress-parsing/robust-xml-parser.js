import fs from 'fs'
import { parseString } from 'xml2js'

/**
 * Robust WordPress XML Parser
 * Handles malformed XML exports by cleaning and preprocessing
 */

function cleanXML(xmlContent) {
  console.log('🧹 Cleaning XML content...')
  
  // Remove problematic doctype declarations that aren't at the beginning
  let cleaned = xmlContent.replace(/<!DOCTYPE[^>]*>/gi, (match, offset) => {
    // Keep only the first DOCTYPE declaration
    if (offset < 1000) {
      return match
    }
    console.log(`   Removed DOCTYPE at position ${offset}`)
    return ''
  })
  
  // Fix common XML issues
  cleaned = cleaned
    // Remove null bytes
    .replace(/\0/g, '')
    // Fix malformed CDATA sections
    .replace(/<!\[CDATA\[([^\]]*)\]\]>/g, (match, content) => {
      return `<![CDATA[${content.replace(/\]\]>/g, ']]&gt;')}]]>`
    })
    // Remove or escape problematic characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  console.log('✅ XML cleaning complete')
  return cleaned
}

async function parseWordPressXMLRobust(xmlFilePath) {
  console.log(`📄 Reading XML file: ${xmlFilePath}`)
  
  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found. Please provide the correct path.')
    return
  }

  console.log('📊 File size:', (fs.statSync(xmlFilePath).size / (1024 * 1024)).toFixed(1), 'MB')
  
  // Read file in chunks for large files
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf8')
  console.log('✅ File read successfully')
  
  // Clean the XML content
  const cleanedXML = cleanXML(xmlContent)
  
  return new Promise((resolve, reject) => {
    // Use more lenient parsing options
    const options = {
      trim: true,
      normalizeTags: false,
      normalize: false,
      ignoreAttrs: false,
      mergeAttrs: false,
      explicitArray: true,
      explicitRoot: true,
      strict: false, // Less strict parsing
      async: false
    }
    
    parseString(cleanedXML, options, (err, result) => {
      if (err) {
        console.error('❌ XML parsing failed:', err.message)
        
        // Try alternative approach - extract Orte data with regex
        console.log('🔍 Attempting regex-based extraction...')
        extractOrteWithRegex(cleanedXML)
        return
      }

      console.log('✅ XML parsed successfully')
      
      try {
        // Navigate the WordPress XML structure
        const rss = result.rss
        const channel = rss.channel[0]
        const items = channel.item || []
        
        console.log(`📊 Total items in export: ${items.length}`)
        
        // Filter for Orte posts
        const ortePosts = items.filter(item => {
          const postType = item['wp:post_type'] && item['wp:post_type'][0]
          return postType === 'orte'
        })
        
        console.log(`🏛️  Found ${ortePosts.length} Orte entries`)
        
        if (ortePosts.length === 0) {
          console.log('🔍 No Orte posts found. Let me check what post types are available...')
          const postTypes = new Set()
          items.forEach(item => {
            const type = item['wp:post_type'] && item['wp:post_type'][0]
            if (type) postTypes.add(type)
          })
          console.log('Available post types:', Array.from(postTypes).join(', '))
        }
        
        // Extract and clean the data
        const cleanedData = ortePosts.map(item => {
          const post = {
            id: item['wp:post_id'] ? item['wp:post_id'][0] : null,
            title: item.title ? item.title[0] : '',
            content: item['content:encoded'] ? item['content:encoded'][0] : '',
            excerpt: item['excerpt:encoded'] ? item['excerpt:encoded'][0] : '',
            slug: item['wp:post_name'] ? item['wp:post_name'][0] : '',
            status: item['wp:status'] ? item['wp:status'][0] : '',
            date: item['wp:post_date'] ? item['wp:post_date'][0] : '',
            type: item['wp:post_type'] ? item['wp:post_type'][0] : '',
            meta: {}
          }
          
          // Extract custom fields
          if (item['wp:postmeta']) {
            item['wp:postmeta'].forEach(meta => {
              const key = meta['wp:meta_key'] ? meta['wp:meta_key'][0] : null
              const value = meta['wp:meta_value'] ? meta['wp:meta_value'][0] : null
              if (key && value) {
                post.meta[key] = value
              }
            })
          }
          
          return post
        })
        
        saveResults(cleanedData, xmlFilePath)
        resolve(cleanedData)
        
      } catch (processError) {
        console.error('❌ Error processing XML data:', processError.message)
        extractOrteWithRegex(cleanedXML)
      }
    })
  })
}

function extractOrteWithRegex(xmlContent) {
  console.log('🔍 Using regex to extract Orte data...')
  
  // Regex to find Orte post items
  const ortePattern = /<item>[\s\S]*?<wp:post_type><!\[CDATA\[orte\]\]><\/wp:post_type>[\s\S]*?<\/item>/g
  const matches = xmlContent.match(ortePattern) || []
  
  console.log(`🏛️  Found ${matches.length} Orte entries with regex`)
  
  const extractedData = matches.map((item, index) => {
    // Extract key fields with regex
    const getId = item.match(/<wp:post_id><!\[CDATA\[(\d+)\]\]><\/wp:post_id>/)
    const getTitle = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    const getContent = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
    const getSlug = item.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)
    const getStatus = item.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/)
    const getDate = item.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/)
    
    return {
      id: getId ? getId[1] : `extracted_${index}`,
      title: getTitle ? getTitle[1] : `Orte ${index + 1}`,
      content: getContent ? getContent[1] : '',
      slug: getSlug ? getSlug[1] : '',
      status: getStatus ? getStatus[1] : '',
      date: getDate ? getDate[1] : '',
      type: 'orte',
      meta: {}
    }
  })
  
  saveResults(extractedData, 'regex-extraction')
  return extractedData
}

function saveResults(data, sourceFile) {
  const outputFile = `orte-parsed-${new Date().toISOString().split('T')[0]}.json`
  
  fs.writeFileSync(outputFile, JSON.stringify({
    export_date: new Date().toISOString(),
    source_file: sourceFile,
    total_orte: data.length,
    orte: data
  }, null, 2))
  
  console.log(`\n✅ Orte data extracted!`)
  console.log(`📁 Saved to: ${outputFile}`)
  
  // Show summary
  console.log('\n📋 Summary of found Orte:')
  data.forEach((ort, index) => {
    console.log(`  ${index + 1}. ${ort.title} (ID: ${ort.id})`)
  })
  
  // Look for Flow Gallery
  const flowGallery = data.find(ort => 
    ort.title.toLowerCase().includes('flow gallery') ||
    ort.content.toLowerCase().includes('flow gallery')
  )
  
  if (flowGallery) {
    console.log('\n🎯 Found Flow Gallery:')
    console.log(`   Title: ${flowGallery.title}`)
    console.log(`   Content preview: ${flowGallery.content.substring(0, 100)}...`)
  }
}

// Get XML file path from command line
const xmlFilePath = process.argv[2]

if (!xmlFilePath) {
  console.log('Please provide the XML file path:')
  console.log('node robust-xml-parser.js your-wordpress-export.xml')
  process.exit(1)
}

parseWordPressXMLRobust(xmlFilePath).catch(console.error) 