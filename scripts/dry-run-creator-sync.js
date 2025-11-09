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

async function dryRunCreatorSync() {
  console.log('🎨 DRY RUN: Finding creator with all aggregate fields populated\n')

  // Find a creator with all aggregate fields
  const creator = await sanityClient.fetch(`
    *[_type == "creator" 
      && defined(creatorMaterials) 
      && defined(creatorMaterialTypes)
      && defined(creatorFinishes)
      && defined(creatorMediumTypes)
      && count(creatorMaterials) > 0
      && count(creatorMaterialTypes) > 0
      && count(creatorFinishes) > 0
      && count(creatorMediumTypes) > 0
    ][0] {
      _id,
      name,
      lastName,
      category->{_id, "title": title.en},
      "creatorMaterials": creatorMaterials[]->{_id, "name": name.en},
      "creatorMaterialTypes": creatorMaterialTypes[]->{_id, "name": name.en},
      "creatorFinishes": creatorFinishes[]->{_id, "name": name.en},
      "creatorMediumTypes": creatorMediumTypes[]->{_id, "title": title.en},
      associatedLocations[]->{_id, name},
      website,
      email,
      birthYear
    }
  `)

  if (!creator) {
    console.log('❌ No creator found with all aggregate fields populated')
    return
  }

  console.log('📋 FOUND CREATOR:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Name: ${creator.name}`)
  console.log(`Last Name: ${creator.lastName || 'N/A'}`)
  console.log(`Primary Category: ${creator.category?.title || 'None'}`)
  console.log(`Website: ${creator.website || 'N/A'}`)
  console.log(`Email: ${creator.email || 'N/A'}`)
  console.log(`Birth Year: ${creator.birthYear || 'N/A'}`)
  console.log()

  console.log('🔗 AGGREGATE REFERENCE FIELDS (from artworks):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log(`\n📦 Creator Materials (${creator.creatorMaterials?.length || 0}):`)
  creator.creatorMaterials?.forEach((mat, i) => {
    console.log(`   ${i + 1}. ${mat?.name || 'Unknown'} (ID: ${mat?._id})`)
  })

  console.log(`\n📦 Creator Material Types (${creator.creatorMaterialTypes?.length || 0}):`)
  creator.creatorMaterialTypes?.forEach((mt, i) => {
    console.log(`   ${i + 1}. ${mt?.name || 'Unknown'} (ID: ${mt?._id})`)
  })

  console.log(`\n📦 Creator Finishes (${creator.creatorFinishes?.length || 0}):`)
  creator.creatorFinishes?.forEach((fin, i) => {
    console.log(`   ${i + 1}. ${fin?.name || 'Unknown'} (ID: ${fin?._id})`)
  })

  console.log(`\n📦 Creator Medium Types (${creator.creatorMediumTypes?.length || 0}):`)
  creator.creatorMediumTypes?.forEach((med, i) => {
    console.log(`   ${i + 1}. ${med?.title || 'Unknown'} (ID: ${med?._id})`)
  })

  console.log(`\n📦 Associated Locations (${creator.associatedLocations?.length || 0}):`)
  creator.associatedLocations?.forEach((loc, i) => {
    console.log(`   ${i + 1}. ${loc?.name || 'Unknown'} (ID: ${loc?._id})`)
  })

  console.log('\n\n🔄 WHAT WOULD BE SYNCED TO WEBFLOW:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nWebflow fieldData structure:')
  console.log(JSON.stringify({
    name: creator.name,
    'last-name': creator.lastName,
    'category': `<WEBFLOW_ID for ${creator.category?.title}>`,
    'creator-materials': creator.creatorMaterials?.map(m => `<WEBFLOW_ID for ${m?.name}>`),
    'creator-material-types': creator.creatorMaterialTypes?.map(mt => `<WEBFLOW_ID for ${mt?.name}>`),
    'creator-finishes': creator.creatorFinishes?.map(f => `<WEBFLOW_ID for ${f?.name}>`),
    'creator-media-types': creator.creatorMediumTypes?.map(m => `<WEBFLOW_ID for ${m?.title}>`),
    'locations': creator.associatedLocations?.map(l => `<WEBFLOW_ID for ${l?.name}>`),
    'website': creator.website,
    'email': creator.email,
    'birth-year': creator.birthYear
  }, null, 2))

  console.log('\n\n✅ Field Mapping Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Sanity → Webflow:')
  console.log('  creatorMaterials[] → creator-materials (multi-ref)')
  console.log('  creatorMaterialTypes[] → creator-material-types (multi-ref)')
  console.log('  creatorFinishes[] → creator-finishes (multi-ref)')
  console.log('  creatorMediumTypes[] → creator-media-types (multi-ref)')
  console.log('  category → category (single ref)')
  console.log('  associatedLocations[] → locations (multi-ref)')
}

dryRunCreatorSync().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})

