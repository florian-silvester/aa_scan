import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {media} from 'sanity-plugin-media'

import MediaStatsWidget from './components/MediaStatsWidget'
import SyncToWebflowAction from './components/SyncToWebflowAction'

// Custom tool for Webflow sync
const webflowSyncTool = {
  name: 'webflow-sync',
  title: 'Webflow Sync',
  icon: () => '🔄',
  component: SyncToWebflowAction,
}

export default defineConfig({
  name: 'default',
  title: 'Art Jewelry CMS',

  projectId: 'b8bczekj',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Art Aurea CMS')
          .items([
            // 👤 PROFILES SECTION (Most Important)
            S.listItem()
              .title('👤 Profiles')
              .child(
                S.list()
                  .title('Profiles')
                  .items([
                    S.listItem()
                      .title('All Profiles')
                      .child(S.documentTypeList('creator').title('All Profiles')),
                    S.divider(),
                    
                    // Tier filters
                    S.listItem()
                      .title('By Tier')
                      .child(
                        S.list()
                          .title('By Tier')
                          .items([
                            S.listItem()
                              .title('💰 Paid Profiles')
                              .child(S.documentTypeList('creator').title('Paid Profiles').filter('_type == "creator" && tier == "paid"')),
                            S.listItem()
                              .title('🆓 Free Profiles')
                              .child(S.documentTypeList('creator').title('Free Profiles').filter('_type == "creator" && tier == "free"')),
                          ])
                      ),
                    
                    // Category filters
                    S.listItem()
                      .title('By Category')
                      .child(
                        S.list()
                          .title('By Category')
                          .items([
                            S.listItem()
                              .title('Art Jewelry')
                              .child(S.documentList().title('Art Jewelry Profiles').filter('_type == "creator" && category->title.en == "Art Jewelry"')),
                            S.listItem()
                              .title('Ceramic Art')
                              .child(S.documentList().title('Ceramic Art Profiles').filter('_type == "creator" && category->title.en == "Ceramic Art"')),
                            S.listItem()
                              .title('Design Jewelry')
                              .child(S.documentList().title('Design Jewelry Profiles').filter('_type == "creator" && category->title.en == "Design Jewelry"')),
                            S.listItem()
                              .title('Textile | Accessories')
                              .child(S.documentList().title('Textile | Accessories Profiles').filter('_type == "creator" && category->title.en == "Textile | Accessories"')),
                            S.listItem()
                              .title('Studio Glass')
                              .child(S.documentList().title('Studio Glass Profiles').filter('_type == "creator" && category->title.en == "Studio Glass"')),
                            S.listItem()
                              .title('Metal Art')
                              .child(S.documentList().title('Metal Art Profiles').filter('_type == "creator" && category->title.en == "Metal Art"')),
                            S.listItem()
                              .title('Lighting')
                              .child(S.documentList().title('Lighting Profiles').filter('_type == "creator" && category->title.en == "Lighting"')),
                            S.listItem()
                              .title('Furniture | Objects')
                              .child(S.documentList().title('Furniture | Objects Profiles').filter('_type == "creator" && category->title.en == "Furniture | Objects"')),
                            S.listItem()
                              .title('Woodwork | Paper')
                              .child(S.documentList().title('Woodwork | Paper Profiles').filter('_type == "creator" && category->title.en == "Woodwork | Paper"')),
                            S.listItem()
                              .title('Rugs | Interior Textiles')
                              .child(S.documentList().title('Rugs | Interior Textiles Profiles').filter('_type == "creator" && category->title.en == "Rugs | Interior Textiles"')),
                            S.listItem()
                              .title('Diverse Design Objects')
                              .child(S.documentList().title('Diverse Design Objects Profiles').filter('_type == "creator" && category->title.en == "Diverse Design Objects"')),
                          ])
                      ),
                    
                    S.divider(),
                    S.documentTypeListItem('category').title('Categories'),
                  ])
              ),
            
            S.divider(),
            
            // 📝 ARTICLES SECTION
            S.listItem()
              .title('📝 Articles')
              .child(
                S.list()
                  .title('Articles')
                  .items([
                    S.listItem()
                      .title('All Articles')
                      .child(S.documentTypeList('article').title('All Articles')),
                    S.divider(),
                    S.listItem()
                      .title('Published Articles')
                      .child(S.documentTypeList('article').title('Published Articles').filter('_type == "article" && defined(date)')),
                    S.listItem()
                      .title('Draft Articles')
                      .child(S.documentTypeList('article').title('Draft Articles').filter('_type == "article" && !defined(date)')),
                  ])
              ),
            
            S.divider(),
            
            // 🎨 ARTWORKS & MATERIALS SECTION
            S.listItem()
              .title('🎨 Artworks & Materials')
              .child(
                S.list()
                  .title('Artworks & Materials')
                  .items([
                    S.listItem()
                      .title('Artworks')
                      .child(
                        S.list()
                          .title('Artworks')
                          .items([
                            S.listItem()
                              .title('All Artworks')
                              .child(S.documentTypeList('artwork').title('All Artworks')),
                            S.divider(),
                            
                            // By Medium
                            S.listItem()
                              .title('By Medium')
                              .child(async () => {
                                const client = S.context.getClient({ apiVersion: '2023-01-01' })
                                
                                // Get all unique mediums from artworks
                                const mediums = await client.fetch(`
                                  *[_type == "medium"] {
                                    _id,
                                    "name": name.en,
                                    "slug": slug.current
                                  } | order(name asc)
                                `)
                                
                                return S.list()
                                  .title('By Medium')
                                  .items(
                                    mediums.map(medium => 
                                      S.listItem()
                                        .title(medium.name)
                                        .child(
                                          S.documentList()
                                            .title(`${medium.name} Artworks`)
                                            .filter(`_type == "artwork" && $mediumId in medium[]._ref`)
                                            .params({ mediumId: medium._id })
                                        )
                                    )
                                  )
                              }),
                            
                            // By Material  
                            S.listItem()
                              .title('By Material')
                              .child(async () => {
                                const client = S.context.getClient({ apiVersion: '2023-01-01' })
                                
                                // Get all unique materials from artworks
                                const materials = await client.fetch(`
                                  *[_type == "material"] {
                                    _id,
                                    "name": name.en,
                                    "slug": slug.current
                                  } | order(name asc)
                                `)
                                
                                return S.list()
                                  .title('By Material')
                                  .items(
                                    materials.map(material => 
                                      S.listItem()
                                        .title(material.name)
                                        .child(
                                          S.documentList()
                                            .title(`${material.name} Artworks`)
                                            .filter(`_type == "artwork" && $materialId in materials[]._ref`)
                                            .params({ materialId: material._id })
                                        )
                                    )
                                  )
                              }),
                            
                            // By Category
                            S.listItem()
                              .title('By Category')
                              .child(async () => {
                                const client = S.context.getClient({ apiVersion: '2023-01-01' })
                                
                                // Get all unique categories from artworks
                                const categories = await client.fetch(`
                                  *[_type == "category"] {
                                    _id,
                                    "name": title.en,
                                    "slug": slug.current
                                  } | order(name asc)
                                `)
                                
                                return S.list()
                                  .title('By Category')
                                  .items(
                                    categories.map(category => 
                                      S.listItem()
                                        .title(category.name)
                                        .child(
                                          S.documentList()
                                            .title(`${category.name} Artworks`)
                                            .filter(`_type == "artwork" && category._ref == $categoryId`)
                                            .params({ categoryId: category._id })
                                        )
                                    )
                                  )
                              }),

                            // By Finish
                            S.listItem()
                              .id('byFinish')
                              .title('By Finish')
                              .child(async () => {
                                const client = S.context.getClient({ apiVersion: '2023-01-01' })
                                
                                // Get all unique finishes from artworks
                                const finishes = await client.fetch(`
                                  *[_type == "finish"] {
                                    _id,
                                    "name": title.en,
                                    "slug": slug.current
                                  } | order(name asc)
                                `)
                                
                                return S.list()
                                  .title('By Finish')
                                  .items(
                                    finishes.map(finish => 
                                      S.listItem()
                                        .id(finish._id)
                                        .title(finish.name)
                                        .child(
                                          S.documentList()
                                            .title(`${finish.name} Artworks`)
                                            .filter(`_type == "artwork" && $finishId in finishes[]._ref`)
                                            .params({ finishId: finish._id })
                                        )
                                    )
                                  )
                              }),
                          ])
                      ),
                    
                    S.divider(),
                    S.documentTypeListItem('medium').title('Medium Types'),
                    S.documentTypeListItem('material').title('Materials'),
                    S.documentTypeListItem('finish').title('Finishes'),
                    S.documentTypeListItem('materialType').title('Material Types'),
                  ])
              ),
            
            S.divider(),
            
            // 🌍 PLACES & GEOGRAPHY SECTION
            S.listItem()
              .title('🌍 Places & Geography')
              .child(
                S.list()
                  .title('Places & Geography')
                  .items([
                    S.listItem()
                      .title('All Locations')
                      .child(S.documentTypeList('location').title('All Locations')),
                    S.divider(),
                    
                    // Type filters  
                    S.listItem()
                      .title('By Type')
                      .child(
                        S.list()
                          .title('By Type')
                          .items([
                            S.listItem()
                              .title('Museums')
                              .child(
                                S.documentTypeList('location')
                                  .title('Museums')
                                  .filter('_type == "location" && type == "museum"')
                              ),
                            S.listItem()
                              .title('Galleries & Shops')
                              .child(
                                S.documentTypeList('location')
                                  .title('Galleries & Shops')
                                  .filter('_type == "location" && type == "shop-gallery"')
                              ),
                            S.listItem()
                              .title('Studios')
                              .child(
                                S.documentTypeList('location')
                                  .title('Studios')
                                  .filter('_type == "location" && type == "studio"')
                              ),
                          ])
                      ),
                    
                    // Dynamic hierarchical country/city filtering 
                    S.listItem()
                      .title('By Country')
                      .child(async () => {
                        const client = S.context.getClient({ apiVersion: '2023-01-01' })
                        
                        // Get all unique countries and their cities using new reference structure
                        const locations = await client.fetch(`
                          *[_type == "location" && defined(country) && defined(city)] {
                            "country": country->name.en,
                            "city": city->name.en
                          } | order(country asc, city asc)
                        `)
                        
                        // Group by country with unique city handling
                        const countriesMap = new Map()
                        locations.forEach(loc => {
                          if (!countriesMap.has(loc.country)) {
                            countriesMap.set(loc.country, new Set())
                          }
                          countriesMap.get(loc.country).add(loc.city)
                        })
                        
                        // Helper function to create safe IDs
                        const createSafeId = (text) => {
                          if (!text || typeof text !== 'string') {
                            return 'unknown'
                          }
                          return text
                            .toLowerCase()
                            .replace(/[äöüß]/g, (match) => {
                              const replacements = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }
                              return replacements[match] || match
                            })
                            .replace(/[^a-z0-9\s-]/g, '') // Remove other special chars
                            .replace(/\s+/g, '-')         // Replace spaces with hyphens
                            .replace(/-+/g, '-')          // Remove duplicate hyphens
                        }
                        
                        // Create country items with consistent city sub-navigation
                        const countryItems = Array.from(countriesMap.entries()).map(([country, cities]) => {
                          const cityArray = Array.from(cities).sort()
                          
                          // Always show city sub-navigation for consistency
                          return S.listItem()
                            .id(`country-${createSafeId(country)}`)
                            .title(`${country} (${cityArray.length})`)
                            .child(
                              S.list()
                                .title(country)
                                .items([
                                  S.listItem()
                                    .id(`all-${createSafeId(country)}`)
                                    .title(`All ${country}`)
                                    .child(
                                      S.documentTypeList('location')
                                        .title(`All ${country}`)
                                        .filter('_type == "location" && country->name.en == $country')
                                        .params({ country })
                                    ),
                                  S.divider(),
                                  ...cityArray.map((city, index) =>
                                    S.listItem()
                                      .id(`city-${createSafeId(country)}-${createSafeId(city)}-${index}`)
                                      .title(city)
                                      .child(
                                        S.documentTypeList('location')
                                          .title(`${city}, ${country}`)
                                          .filter('_type == "location" && country->name.en == $country && city->name.en == $city')
                                          .params({ country, city })
                                      )
                                  )
                                ])
                            )
                        })
                        
                        return S.list()
                          .title('By Country')
                          .items(countryItems)
                      }),
                    
                    S.divider(),
                    S.documentTypeListItem('country').title('Countries'),
                    S.documentTypeListItem('city').title('Cities'),
                  ])
              ),
          ])
    }),
    visionTool(),
    media(),
    webflowSyncTool,
  ],

  schema: {
    types: schemaTypes,
  },
})// Force deployment Fri Jul 18 12:55:42 CEST 2025
