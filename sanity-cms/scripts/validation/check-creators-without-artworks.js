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

async function checkCreatorsWithoutArtworks() {
  console.log('🔍 Checking creators without artworks...\n')
  
  try {
    // Get all creators
    const allCreators = await client.fetch(`
      *[_type == "creator"]{
        _id,
        name,
        slug,
        "profileUrl": profileUrl,
        "artworkCount": count(*[_type == "artwork" && references(^._id)]),
        "hasProfileImage": defined(profileImage.asset._ref),
        "categories": categories[]->title.en
      } | order(name)
    `)
    
    console.log(`👤 Total creators in database: ${allCreators.length}\n`)
    
    // Separate creators with and without artworks
    const creatorsWithoutArtworks = allCreators.filter(c => c.artworkCount === 0)
    const creatorsWithArtworks = allCreators.filter(c => c.artworkCount > 0)
    
    // Calculate statistics
    const percentageWithArtworks = ((creatorsWithArtworks.length / allCreators.length) * 100).toFixed(2)
    const percentageWithoutArtworks = ((creatorsWithoutArtworks.length / allCreators.length) * 100).toFixed(2)
    
    // Further categorize creators without artworks
    const creatorsWithProfile = creatorsWithoutArtworks.filter(c => c.hasProfileImage || c.profileUrl)
    const creatorsWithoutProfile = creatorsWithoutArtworks.filter(c => !c.hasProfileImage && !c.profileUrl)
    
    // Display results
    console.log('📊 SUMMARY:')
    console.log('━'.repeat(70))
    console.log(`✅ Creators with artworks:         ${creatorsWithArtworks.length.toString().padStart(6)} (${percentageWithArtworks}%)`)
    console.log(`❌ Creators without artworks:      ${creatorsWithoutArtworks.length.toString().padStart(6)} (${percentageWithoutArtworks}%)`)
    console.log('━'.repeat(70))
    console.log(`   With profile data:              ${creatorsWithProfile.length.toString().padStart(6)}`)
    console.log(`   Without any profile data:       ${creatorsWithoutProfile.length.toString().padStart(6)}`)
    console.log('')
    
    // Get artwork count statistics
    const artworkCounts = creatorsWithArtworks.map(c => c.artworkCount)
    const maxArtworks = Math.max(...artworkCounts)
    const minArtworks = Math.min(...artworkCounts)
    const avgArtworks = (artworkCounts.reduce((a, b) => a + b, 0) / artworkCounts.length).toFixed(2)
    
    console.log('📈 ARTWORK STATISTICS (for creators with artworks):')
    console.log(`   Min artworks per creator: ${minArtworks}`)
    console.log(`   Max artworks per creator: ${maxArtworks}`)
    console.log(`   Avg artworks per creator: ${avgArtworks}`)
    console.log('')
    
    // Display creators without artworks
    if (creatorsWithoutArtworks.length > 0) {
      console.log('❌ CREATORS WITHOUT ANY ARTWORKS:\n')
      
      // Show creators with profile data first (these might be important)
      if (creatorsWithProfile.length > 0) {
        console.log('⚠️  WITH PROFILE DATA (may need artworks added):')
        creatorsWithProfile.slice(0, 20).forEach((creator, idx) => {
          console.log(`${(idx + 1).toString().padStart(3)}. ${creator.name}`)
          if (creator.categories && creator.categories.length > 0) {
            console.log(`     Categories: ${creator.categories.join(', ')}`)
          }
          if (creator.profileUrl) {
            console.log(`     Profile URL: ${creator.profileUrl}`)
          }
          console.log(`     Slug: ${creator.slug?.current || 'N/A'}`)
          console.log(`     ID: ${creator._id}`)
          console.log('')
        })
        
        if (creatorsWithProfile.length > 20) {
          console.log(`... and ${creatorsWithProfile.length - 20} more creators with profile data\n`)
        }
      }
      
      // Show creators without any data (these might be orphaned/old data)
      if (creatorsWithoutProfile.length > 0) {
        console.log('🗑️  WITHOUT PROFILE DATA (candidates for deletion):')
        creatorsWithoutProfile.slice(0, 20).forEach((creator, idx) => {
          console.log(`${(idx + 1).toString().padStart(3)}. ${creator.name}`)
          console.log(`     ID: ${creator._id}`)
          console.log('')
        })
        
        if (creatorsWithoutProfile.length > 20) {
          console.log(`... and ${creatorsWithoutProfile.length - 20} more creators without profile data\n`)
        }
      }
    }
    
    // Display top creators by artwork count
    console.log('🏆 TOP 10 CREATORS BY ARTWORK COUNT:\n')
    const topCreators = [...creatorsWithArtworks]
      .sort((a, b) => b.artworkCount - a.artworkCount)
      .slice(0, 10)
    
    topCreators.forEach((creator, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${creator.name.padEnd(40)} ${creator.artworkCount.toString().padStart(3)} artworks`)
    })
    console.log('')
    
    // Save reports
    const timestamp = new Date().toISOString().split('T')[0]
    
    // CSV report for creators without artworks
    if (creatorsWithoutArtworks.length > 0) {
      const csvHeader = 'Creator Name,Has Profile Image,Profile URL,Categories,Slug,Creator ID\n'
      const csvRows = creatorsWithoutArtworks.map(creator => {
        const name = (creator.name || 'Unnamed').replace(/"/g, '""')
        const hasProfile = creator.hasProfileImage ? 'Yes' : 'No'
        const profileUrl = (creator.profileUrl || '').replace(/"/g, '""')
        const categories = creator.categories ? creator.categories.join('; ') : ''
        const slug = creator.slug?.current || 'N/A'
        return `"${name}","${hasProfile}","${profileUrl}","${categories}","${slug}","${creator._id}"`
      }).join('\n')
      
      const csvContent = csvHeader + csvRows
      const csvFilename = `../../reports/creators-without-artworks-${timestamp}.csv`
      fs.writeFileSync(csvFilename, csvContent)
      console.log(`💾 CSV report saved: ${csvFilename}`)
    }
    
    // CSV report for creators without profile data (deletion candidates)
    if (creatorsWithoutProfile.length > 0) {
      const csvHeader = 'Creator Name,Slug,Creator ID\n'
      const csvRows = creatorsWithoutProfile.map(creator => {
        const name = (creator.name || 'Unnamed').replace(/"/g, '""')
        const slug = creator.slug?.current || 'N/A'
        return `"${name}","${slug}","${creator._id}"`
      }).join('\n')
      
      const csvContent = csvHeader + csvRows
      const csvFilename = `../../reports/creators-no-artworks-no-profile-${timestamp}.csv`
      fs.writeFileSync(csvFilename, csvContent)
      console.log(`💾 Deletion candidates CSV: ${csvFilename}`)
    }
    
    // Save detailed JSON
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCreators: allCreators.length,
        creatorsWithArtworks: creatorsWithArtworks.length,
        creatorsWithoutArtworks: creatorsWithoutArtworks.length,
        creatorsWithoutArtworksButHasProfile: creatorsWithProfile.length,
        creatorsWithoutArtworksOrProfile: creatorsWithoutProfile.length,
        percentageWithArtworks: parseFloat(percentageWithArtworks),
        percentageWithoutArtworks: parseFloat(percentageWithoutArtworks),
        artworkStats: {
          min: minArtworks,
          max: maxArtworks,
          avg: parseFloat(avgArtworks)
        }
      },
      creatorsWithoutArtworks: creatorsWithoutArtworks.map(c => ({
        id: c._id,
        name: c.name,
        slug: c.slug?.current,
        hasProfileImage: c.hasProfileImage,
        profileUrl: c.profileUrl,
        categories: c.categories
      })),
      topCreators: topCreators.map(c => ({
        id: c._id,
        name: c.name,
        artworkCount: c.artworkCount,
        slug: c.slug?.current
      }))
    }
    
    const jsonFilename = `../../reports/creators-artwork-check-${timestamp}.json`
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonReport, null, 2))
    console.log(`💾 JSON report saved: ${jsonFilename}`)
    console.log('\n✨ Analysis complete!')
    
    // Final recommendations
    if (creatorsWithoutArtworks.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      if (creatorsWithProfile.length > 0) {
        console.log(`   • ${creatorsWithProfile.length} creators have profile data but no artworks`)
        console.log('     → Consider adding artworks or checking if they were meant to be linked')
      }
      if (creatorsWithoutProfile.length > 0) {
        console.log(`   • ${creatorsWithoutProfile.length} creators have no artworks AND no profile data`)
        console.log('     → These are likely orphaned records and could be safely deleted')
      }
    } else {
      console.log('\n🎉 Great! All creators have at least one artwork!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

checkCreatorsWithoutArtworks()

