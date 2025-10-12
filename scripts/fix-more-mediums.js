import {sanityClient} from '../sanity-cms/sanity-client.js'

const corrections = [
  { id: '80322914-b597-4d28-b5b3-97ee1842a0e4', name: 'Sachi Fujika', category: 'medium-ceramics' },
  { id: 'eb76d25d-1b30-4f36-90aa-278ff9d3c62b', name: 'Uta K. Becker', category: 'medium-ceramics' },
  { id: '0e81d25e-ac9e-44e9-97ed-1c7ef0daf679', name: 'Rudolf Bott', category: 'medium-metalwork' },
]

async function fixMediums() {
  console.log(`Correcting ${corrections.length} creators...\n`)
  
  for (const correction of corrections) {
    try {
      await sanityClient
        .patch(correction.id)
        .set({
          category: {
            _type: 'reference',
            _ref: correction.category
          }
        })
        .commit()
      
      console.log(`✓ ${correction.name} → ${correction.category}`)
    } catch (error) {
      console.error(`✗ ${correction.name}: ${error.message}`)
    }
  }
  
  console.log('\n=== Checking for other potential issues ===\n')
  
  // Get all creators with their assigned mediums to show for review
  const creators = await sanityClient.fetch(`
    *[_type == "creator" && _id in [
      '491082a1-ca63-453e-9832-b21ca5fca9c3',
      '654a008d-d63a-4e58-8ac6-e02542bc7b52',
      '62f31232-4a06-4e55-a5a8-b88804df5d10',
      'aec9b395-e14a-4bf4-98a1-e1522e2468d1',
      '37081e7e-3188-49eb-96c7-a9af00985df9',
      'd85c80b9-52fa-46e9-8c7b-ed240e0c2351',
      '69804864-a9b3-4588-ad07-e482ab2ec598',
      'f1d71ac6-123e-4cac-91a1-e1b036319974',
      '20b7734d-0943-4af0-8982-35dedf74fb47',
      'e8cf2fa6-235e-4c7e-85f5-f28128eae4f8',
      '6861709d-bb49-4f93-a21c-415ecb61be88',
      '86905d71-4e35-4a17-8d3b-de6fbd4ff7b9',
      'd9079553-4f95-4bf7-8f8b-7d41e85e4374',
      '5Nnn2PqcEKG4dqRP9h4Vju',
      '48ff4d93-6ed2-414b-92b4-3984598d216d',
      '48b52219-7f7d-4665-847e-054278b71379',
      'ebd1f833-20a4-4808-aefe-f642aab84207',
      '91a6321f-4240-4233-94a3-911540072d30',
      '0e81d25e-ac9e-44e9-97ed-1c7ef0daf679',
      '490eb184-0c7c-49e9-927b-193ed95337c5',
      '80322914-b597-4d28-b5b3-97ee1842a0e4',
      '93b13bea-81c1-41bd-8fd6-5e57539e5d40',
      'aa747b93-8bf9-43ab-97df-c4b80021c402',
      'b6bdb890-1c25-4c09-a09d-73016a79fbd9',
      '0b51c8d7-9250-4516-9df9-48397c625123',
      '9a57cbb0-4d76-4627-a9eb-632afef9a890',
      '1e6fcf27-0d13-4af8-883a-fabbd861f4b6',
      '6648cba0-0839-45ea-b26d-45eeff9e6fc7',
      'eb76d25d-1b30-4f36-90aa-278ff9d3c62b'
    ]] {
      name,
      "medium": category->slug.current
    } | order(name asc)
  `)
  
  console.log('Current assignments:')
  creators.forEach(c => {
    console.log(`${c.name.padEnd(25)} → ${c.medium || 'NO MEDIUM'}`)
  })
}

fixMediums()

