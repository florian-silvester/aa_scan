import fs from 'fs'
import { parseString } from 'xml2js'

/**
 * WordPress XML Export Parser
 * Extracts Orte (Places/Galleries) data from WordPress XML export
 */

async function parseWordPressXML(xmlFilePath) {
  console.log(`📄 Reading XML file: ${xmlFilePath}`)
  
  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found. Please provide the correct path.')
    console.log('Usage: node parse-wordpress-xml.js your-export-file.xml')
    return
  }

  const xmlContent = fs.readFileSync(xmlFilePath, 'utf8')
  
  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result) => {
      if (err) {
        reject(err)
        return
      }

      console.log('✅ XML parsed successfully')
      
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
      
      // Extract and clean the data
      const cleanedData = ortePosts.map(item => {
        // Basic post data
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
        
        // Extract custom fields (meta data)
        if (item['wp:postmeta']) {
          item['wp:postmeta'].forEach(meta => {
            const key = meta['wp:meta_key'] ? meta['wp:meta_key'][0] : null
            const value = meta['wp:meta_value'] ? meta['wp:meta_value'][0] : null
            if (key && value) {
              post.meta[key] = value
            }
          })
        }
        
        // Extract categories/taxonomies
        if (item.category) {
          post.categories = item.category.map(cat => ({
            name: cat._ || cat,
            domain: cat.$.domain || 'category',
            nicename: cat.$.nicename || ''
          }))
        }
        
        return post
      })
      
      // Save the cleaned data
      const outputFile = `orte-parsed-${new Date().toISOString().split('T')[0]}.json`
      fs.writeFileSync(outputFile, JSON.stringify({
        export_date: new Date().toISOString(),
        source_file: xmlFilePath,
        total_orte: cleanedData.length,
        orte: cleanedData
      }, null, 2))
      
      console.log(`\n✅ Orte data extracted!`)
      console.log(`📁 Saved to: ${outputFile}`)
      
      // Show summary
      console.log('\n📋 Summary of found Orte:')
      cleanedData.forEach((ort, index) => {
        console.log(`  ${index + 1}. ${ort.title} (ID: ${ort.id})`)
        
        // Show some meta fields if they exist
        const metaKeys = Object.keys(ort.meta)
        if (metaKeys.length > 0) {
          console.log(`     Meta fields: ${metaKeys.slice(0, 3).join(', ')}${metaKeys.length > 3 ? '...' : ''}`)
        }
      })
      
      // Look for Flow Gallery specifically
      const flowGallery = cleanedData.find(ort => 
        ort.title.toLowerCase().includes('flow gallery') ||
        ort.content.toLowerCase().includes('flow gallery')
      )
      
      if (flowGallery) {
        console.log('\n🎯 Found Flow Gallery:')
        console.log(`   Title: ${flowGallery.title}`)
        console.log(`   Content preview: ${flowGallery.content.substring(0, 100)}...`)
        if (Object.keys(flowGallery.meta).length > 0) {
          console.log(`   Meta fields: ${Object.keys(flowGallery.meta).join(', ')}`)
        }
      }
      
      resolve(cleanedData)
    })
  })
}

// Get XML file path from command line or prompt user
const xmlFilePath = process.argv[2]

if (!xmlFilePath) {
  console.log('Please provide the XML file path:')
  console.log('node parse-wordpress-xml.js your-wordpress-export.xml')
  process.exit(1)
}

parseWordPressXML(xmlFilePath).catch(console.error) 