import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-01-01'
})

async function checkArtworksWithoutCreators() {
  console.log('🔍 Checking artworks for creator links...\n')
  
  try {
    // Get all artworks
    const allArtworks = await client.fetch(`
      *[_type == "artwork"]{
        _id,
        name,
        "workTitle": workTitle.en,
        "workTitleDe": workTitle.de,
        slug,
        "creator": creator->name,
        "creatorRef": creator._ref,
        "maker": maker->name,
        "makerRef": maker._ref,
        "categoryEn": category->title.en,
        "categoryDe": category->title.de,
        year,
        "imageCount": count(images)
      } | order(name)
    `)
    
    console.log(`🎨 Total artworks in database: ${allArtworks.length}\n`)
    
    // Separate artworks with and without creators
    const artworksWithoutCreator = []
    const artworksWithCreator = []
    const artworksWithMakerOnly = []
    
    for (const artwork of allArtworks) {
      if (!artwork.creatorRef && !artwork.makerRef) {
        artworksWithoutCreator.push(artwork)
      } else if (artwork.creatorRef) {
        artworksWithCreator.push(artwork)
      } else if (artwork.makerRef && !artwork.creatorRef) {
        artworksWithMakerOnly.push(artwork)
      }
    }
    
    // Calculate statistics
    const totalWithLinks = artworksWithCreator.length + artworksWithMakerOnly.length
    const percentageWithCreator = ((artworksWithCreator.length / allArtworks.length) * 100).toFixed(2)
    const percentageWithMaker = ((artworksWithMakerOnly.length / allArtworks.length) * 100).toFixed(2)
    const percentageWithoutLinks = ((artworksWithoutCreator.length / allArtworks.length) * 100).toFixed(2)
    const percentageTotal = ((totalWithLinks / allArtworks.length) * 100).toFixed(2)
    
    // Display results
    console.log('📊 SUMMARY:')
    console.log('━'.repeat(60))
    console.log(`✅ Artworks with Creator link:    ${artworksWithCreator.length.toString().padStart(6)} (${percentageWithCreator}%)`)
    console.log(`⚠️  Artworks with Maker only:      ${artworksWithMakerOnly.length.toString().padStart(6)} (${percentageWithMaker}%)`)
    console.log(`❌ Artworks without any link:     ${artworksWithoutCreator.length.toString().padStart(6)} (${percentageWithoutLinks}%)`)
    console.log('━'.repeat(60))
    console.log(`📈 Total with links:              ${totalWithLinks.toString().padStart(6)} (${percentageTotal}%)`)
    console.log(`📉 Total without links:           ${artworksWithoutCreator.length.toString().padStart(6)} (${percentageWithoutLinks}%)`)
    console.log('')
    
    // Display artworks without creators
    if (artworksWithoutCreator.length > 0) {
      console.log('❌ ARTWORKS WITHOUT CREATOR LINKS:\n')
      artworksWithoutCreator.slice(0, 30).forEach((artwork, idx) => {
        const title = artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled'
        const category = artwork.categoryEn || artwork.categoryDe || 'N/A'
        const year = artwork.year || 'N/A'
        
        console.log(`${(idx + 1).toString().padStart(3)}. ${title}`)
        console.log(`     Category: ${category} | Year: ${year} | Images: ${artwork.imageCount}`)
        console.log(`     Slug: ${artwork.slug?.current || 'N/A'}`)
        console.log(`     ID: ${artwork._id}`)
        console.log('')
      })
      
      if (artworksWithoutCreator.length > 30) {
        console.log(`... and ${artworksWithoutCreator.length - 30} more artworks without creator links\n`)
      }
    }
    
    // Display artworks with maker only
    if (artworksWithMakerOnly.length > 0) {
      console.log('⚠️  ARTWORKS WITH LEGACY MAKER FIELD ONLY:\n')
      artworksWithMakerOnly.slice(0, 20).forEach((artwork, idx) => {
        const title = artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled'
        const maker = artwork.maker || 'Unknown'
        
        console.log(`${(idx + 1).toString().padStart(3)}. ${title}`)
        console.log(`     Maker: ${maker}`)
        console.log(`     ID: ${artwork._id}`)
        console.log('')
      })
      
      if (artworksWithMakerOnly.length > 20) {
        console.log(`... and ${artworksWithMakerOnly.length - 20} more artworks with maker only\n`)
      }
    }
    
    // Save CSV report
    const timestamp = new Date().toISOString().split('T')[0]
    
    // Report 1: Artworks without any creator link
    if (artworksWithoutCreator.length > 0) {
      const csvHeader = 'Artwork Name,Category,Year,Images,Slug,Artwork ID\n'
      const csvRows = artworksWithoutCreator.map(artwork => {
        const title = (artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled').replace(/"/g, '""')
        const category = (artwork.categoryEn || artwork.categoryDe || 'N/A').replace(/"/g, '""')
        const year = artwork.year || 'N/A'
        const slug = artwork.slug?.current || 'N/A'
        return `"${title}","${category}","${year}",${artwork.imageCount},"${slug}","${artwork._id}"`
      }).join('\n')
      
      const csvContent = csvHeader + csvRows
      const csvFilename = `../../reports/artworks-without-creators-${timestamp}.csv`
      fs.writeFileSync(csvFilename, csvContent)
      console.log(`💾 CSV report saved: ${csvFilename}`)
    }
    
    // Report 2: Artworks with maker only (needs migration)
    if (artworksWithMakerOnly.length > 0) {
      const csvHeader = 'Artwork Name,Maker Name,Slug,Artwork ID,Maker ID\n'
      const csvRows = artworksWithMakerOnly.map(artwork => {
        const title = (artwork.workTitle || artwork.workTitleDe || artwork.name || 'Untitled').replace(/"/g, '""')
        const maker = (artwork.maker || 'Unknown').replace(/"/g, '""')
        const slug = artwork.slug?.current || 'N/A'
        return `"${title}","${maker}","${slug}","${artwork._id}","${artwork.makerRef}"`
      }).join('\n')
      
      const csvContent = csvHeader + csvRows
      const csvFilename = `../../reports/artworks-with-maker-only-${timestamp}.csv`
      fs.writeFileSync(csvFilename, csvContent)
      console.log(`💾 CSV report saved: ${csvFilename}`)
    }
    
    // Save detailed JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalArtworks: allArtworks.length,
        artworksWithCreator: artworksWithCreator.length,
        artworksWithMakerOnly: artworksWithMakerOnly.length,
        artworksWithoutAnyLink: artworksWithoutCreator.length,
        totalWithLinks: totalWithLinks,
        percentageWithCreator: parseFloat(percentageWithCreator),
        percentageWithMaker: parseFloat(percentageWithMaker),
        percentageWithoutLinks: parseFloat(percentageWithoutLinks),
        percentageTotal: parseFloat(percentageTotal)
      },
      artworksWithoutCreator: artworksWithoutCreator.map(aw => ({
        id: aw._id,
        name: aw.name,
        workTitle: aw.workTitle,
        workTitleDe: aw.workTitleDe,
        slug: aw.slug?.current,
        category: aw.categoryEn || aw.categoryDe,
        year: aw.year,
        imageCount: aw.imageCount
      })),
      artworksWithMakerOnly: artworksWithMakerOnly.map(aw => ({
        id: aw._id,
        name: aw.name,
        workTitle: aw.workTitle,
        maker: aw.maker,
        makerRef: aw.makerRef,
        slug: aw.slug?.current
      }))
    }
    
    const jsonFilename = `../../reports/artworks-creator-check-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('\n✨ Analysis complete!')
    
    // Final summary
    if (artworksWithoutCreator.length === 0 && artworksWithMakerOnly.length === 0) {
      console.log('\n🎉 Great news! All artworks are linked to creators!')
    } else if (artworksWithoutCreator.length === 0) {
      console.log(`\n⚠️  ${artworksWithMakerOnly.length} artworks still use the legacy "maker" field and should be migrated to "creator"`)
    } else {
      console.log(`\n⚠️  ${artworksWithoutCreator.length} artworks need creator links assigned`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

checkArtworksWithoutCreators()

