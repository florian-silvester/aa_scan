import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.bak' })

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
})

async function dryRunArtworkSync() {
  console.log('🎨 DRY RUN: Finding artwork with multiple fields populated\n')

  // Find an artwork with materials, materialTypes, finishes, and medium
  const artwork = await sanityClient.fetch(`
    *[_type == "artwork" 
      && defined(materials) 
      && defined(materialTypes)
      && defined(finishes)
      && defined(medium)
      && count(materials) > 0
      && count(materialTypes) > 0
      && count(finishes) > 0
      && count(medium) > 0
    ][0] {
      _id,
      name,
      "workTitle": workTitle.en,
      creator->{_id, name},
      category->{_id, "title": title.en},
      materials[]->{_id, "name": name.en},
      materialTypes[]->{_id, "name": name.en},
      finishes[]->{_id, "name": name.en},
      medium[]->{_id, "title": title.en},
      year,
      size,
      price
    }
  `)

  if (!artwork) {
    console.log('❌ No artwork found with all fields populated')
    return
  }

  console.log('📋 FOUND ARTWORK:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Name: ${artwork.name}`)
  console.log(`Work Title: ${artwork.workTitle}`)
  console.log(`Creator: ${artwork.creator?.name || 'None'}`)
  console.log(`Category: ${artwork.category?.title || 'None'}`)
  console.log(`Year: ${artwork.year || 'N/A'}`)
  console.log(`Size: ${artwork.size || 'N/A'}`)
  console.log(`Price: ${artwork.price || 'N/A'}`)
  console.log()

  console.log('🔗 REFERENCE FIELDS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log(`\n📦 Materials (${artwork.materials?.length || 0}):`)
  artwork.materials?.forEach((mat, i) => {
    console.log(`   ${i + 1}. ${mat?.name || 'Unknown'} (ID: ${mat?._id})`)
  })

  console.log(`\n📦 Material Types (${artwork.materialTypes?.length || 0}):`)
  artwork.materialTypes?.forEach((mt, i) => {
    console.log(`   ${i + 1}. ${mt?.name || 'Unknown'} (ID: ${mt?._id})`)
  })

  console.log(`\n📦 Finishes (${artwork.finishes?.length || 0}):`)
  artwork.finishes?.forEach((fin, i) => {
    console.log(`   ${i + 1}. ${fin?.name || 'Unknown'} (ID: ${fin?._id})`)
  })

  console.log(`\n📦 Medium Types / Object Types (${artwork.medium?.length || 0}):`)
  artwork.medium?.forEach((med, i) => {
    console.log(`   ${i + 1}. ${med?.title || 'Unknown'} (ID: ${med?._id})`)
  })

  console.log('\n\n🔄 WHAT WOULD BE SYNCED TO WEBFLOW:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nWebflow fieldData structure:')
  console.log(JSON.stringify({
    name: artwork.name,
    'work-title': artwork.workTitle,
    'creator': `<WEBFLOW_ID for ${artwork.creator?.name}>`,
    'media-reference': `<WEBFLOW_ID for ${artwork.category?.title}>`,
    'materials': artwork.materials?.map(m => `<WEBFLOW_ID for ${m?.name}>`),
    'material-type': artwork.materialTypes?.map(mt => `<WEBFLOW_ID for ${mt?.name}>`),
    'medium': artwork.medium?.map(m => `<WEBFLOW_ID for ${m?.title}>`),
    'finishes': artwork.finishes?.map(f => `<WEBFLOW_ID for ${f?.name}>`),
    'year': artwork.year,
    'size-dimensions': artwork.size,
    'price': artwork.price
  }, null, 2))

  console.log('\n\n✅ Field Mapping Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Sanity → Webflow:')
  console.log('  materials[] → materials (multi-ref)')
  console.log('  materialTypes[] → material-type (multi-ref)')
  console.log('  finishes[] → finishes (multi-ref)')
  console.log('  medium[] → medium (multi-ref)')
  console.log('  category → media-reference (single ref)')
  console.log('  creator → creator (single ref)')
}

dryRunArtworkSync().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})

