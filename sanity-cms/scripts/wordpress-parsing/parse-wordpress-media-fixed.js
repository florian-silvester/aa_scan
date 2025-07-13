import fs from 'fs'
import { parseString } from 'xml2js'

/**
 * WordPress Media Parser - FIXED VERSION
 * Extracts only ORIGINAL full-size images, not thumbnails/variants
 */

async function parseWordPressMediaFixed(xmlFilePath) {
  console.log(`📄 Reading XML file: ${xmlFilePath}`)
  
  const stats = fs.statSync(xmlFilePath)
  console.log(`📊 File size: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`)
  
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf8')
  
  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result) => {
      if (err) {
        reject(err)
        return
      }

      console.log('✅ XML parsed successfully')
      
      const rss = result.rss
      const channel = rss.channel[0]
      const items = channel.item || []
      
      console.log(`📊 Total items in export: ${items.length}`)
      
      // Find all media attachments
      const mediaAttachments = items.filter(item => {
        const postType = item['wp:post_type'] && item['wp:post_type'][0]
        return postType === 'attachment'
      })
      
      console.log(`📸 Found ${mediaAttachments.length} media attachments`)
      
      // Extract ONLY original images (no size variants)
      const originalImages = []
      const seenUrls = new Set()
      
      mediaAttachments.forEach(item => {
        const attachmentUrl = item['wp:attachment_url'] && item['wp:attachment_url'][0]
        
        if (!attachmentUrl) return
        
        // Skip if we've already seen this URL
        if (seenUrls.has(attachmentUrl)) return
        seenUrls.add(attachmentUrl)
        
        // Extract file type from URL
        const urlParts = attachmentUrl.split('.')
        const fileExt = urlParts[urlParts.length - 1].toLowerCase()
        
        // Only include images
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        if (!imageTypes.includes(fileExt)) return
        
        const media = {
          id: item['wp:post_id'] ? item['wp:post_id'][0] : null,
          title: item.title ? item.title[0] : '',
          filename: item['wp:post_name'] ? item['wp:post_name'][0] : '',
          url: attachmentUrl,
          date: item['wp:post_date'] ? item['wp:post_date'][0] : '',
          type: fileExt,
          parent: item['wp:post_parent'] ? item['wp:post_parent'][0] : '0',
          description: item['content:encoded'] ? item['content:encoded'][0] : '',
          excerpt: item['excerpt:encoded'] ? item['excerpt:encoded'][0] : ''
        }
        
        originalImages.push(media)
      })
      
      console.log(`🖼️  Original images (deduplicated): ${originalImages.length}`)
      
      // Analyze image patterns for artworks
      const jewelryKeywords = ['schmuck', 'jewelry', 'ring', 'kette', 'necklace', 'bracelet', 'earring', 'brosche', 'pendant', 'gold', 'silber', 'silver']
      const artworkImages = originalImages.filter(img => {
        const searchText = `${img.title} ${img.filename} ${img.description}`.toLowerCase()
        return jewelryKeywords.some(keyword => searchText.includes(keyword))
      })
      
      console.log(`💎 Artwork images: ${artworkImages.length}`)
      
      // Count unique artists
      const artistNames = new Set()
      originalImages.forEach(img => {
        const searchText = `${img.title} ${img.filename}`.toLowerCase()
        // Extract artist names (simple pattern matching)
        const namePatterns = searchText.match(/([a-z]+[-_][a-z]+)/g) || []
        namePatterns.forEach(pattern => {
          if (pattern.includes('-') || pattern.includes('_')) {
            artistNames.add(pattern)
          }
        })
      })
      
      console.log(`👨‍🎨 Unique artist patterns found: ${artistNames.size}`)
      
      // Show some examples
      console.log('\n📋 SAMPLE ORIGINAL IMAGES:')
      originalImages.slice(0, 15).forEach((img, i) => {
        console.log(`${i + 1}. ${img.title}`)
        console.log(`   File: ${img.filename}`)
        console.log(`   URL: ${img.url}`)
        console.log('')
      })
      
      // Save results
      const outputFile = `wordpress-original-media-${new Date().toISOString().split('T')[0]}.json`
      fs.writeFileSync(outputFile, JSON.stringify({
        export_date: new Date().toISOString(),
        source_file: xmlFilePath,
        total_attachments: mediaAttachments.length,
        original_images: originalImages.length,
        artwork_images: artworkImages.length,
        unique_artists: artistNames.size,
        all_images: originalImages,
        artwork_images_data: artworkImages
      }, null, 2))
      
      console.log(`\n✅ FIXED media analysis saved to: ${outputFile}`)
      console.log(`🎯 Reduced from ${mediaAttachments.length} attachments to ${originalImages.length} original images!`)
      
      resolve({
        total: mediaAttachments.length,
        originals: originalImages.length,
        artworks: artworkImages.length,
        data: originalImages
      })
    })
  })
}

// Run the fixed parser
const xmlFilePath = process.argv[2] || 'artaurea.WordPress.2025-07-09 (2).xml'
parseWordPressMediaFixed(xmlFilePath).catch(console.error) 