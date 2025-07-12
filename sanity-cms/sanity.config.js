import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {dashboardTool} from '@sanity/dashboard'
import {schemaTypes} from './schemas'
import {media} from 'sanity-plugin-media'
import MediaStatsWidget from './components/MediaStatsWidget'

export default defineConfig({
  name: 'default',
  title: 'Art Aurea CMS',

  projectId: 'b8bczekj', 
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Art Aurea CMS')
          .items([

            // Artworks with dynamic material filtering
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
                    
                    // Dynamic material filtering
                    S.listItem()
                      .title('By Material')
                      .child(async () => {
                        const client = S.context.getClient({ apiVersion: '2023-01-01' })

                        try {
                          // Fetch all materials with proper name structure
                          const materials = await client.fetch(`
                            *[_type == "material" && defined(name.en)] | order(name.en asc) {
                              _id,
                              "nameEn": name.en,
                              "nameDe": name.de,
                              slug
                            }
                          `)

                          if (!materials || materials.length === 0) {
                            return S.list()
                              .title('By Material')
                              .items([
                                S.listItem()
                                  .title('No materials found')
                                  .child(S.component(() => S.documentTypeList('material').title('Create Materials First')))
                              ])
                          }

                          // Create material filter items
                          const materialItems = materials.map(material => 
                            S.listItem()
                              .title(material.nameEn || material.nameDe || 'Unnamed Material')
                              .child(
                                S.documentList()
                                  .title(`Artworks: ${material.nameEn}`)
                                  .filter(`
                                    _type == "artwork" && (
                                      $materialId in materials[]._ref ||
                                      $materialNameEn in materials[].name.en ||
                                      $materialNameDe in materials[].name.de
                                    )
                                  `)
                                  .params({ 
                                    materialId: material._id,
                                    materialNameEn: material.nameEn,
                                    materialNameDe: material.nameDe
                                  })
                              )
                          )

                          return S.list()
                            .title('By Material')
                            .items([
                              S.listItem()
                                .title('📊 All Materials Overview')
                                .child(S.documentTypeList('material').title('All Materials')),
                              S.listItem()
                                .title('🆕 Artworks with Custom Materials')
                                .child(
                                  S.documentList()
                                    .title('Custom Materials')
                                    .filter('_type == "artwork" && count(materials[_type == "inlineMaterial"]) > 0')
                                ),
                              S.divider(),
                              ...materialItems
                            ])

                        } catch (error) {
                          console.error('Error fetching materials:', error)
                          return S.list()
                            .title('By Material')
                            .items([
                              S.listItem()
                                .title('Error loading materials')
                                .child(S.component(() => S.documentTypeList('material').title('Check Console for Errors')))
                            ])
                        }
                      }),
                  ])
              ),

            // Creators with comprehensive category filtering  
            S.listItem()
              .title('Creators')
              .child(
                S.list()
                  .title('Creators')
                  .items([
                    S.listItem()
                      .title('All Creators')
                      .child(S.documentTypeList('creator').title('All Creators')),
                    S.divider(),
                    S.listItem()
                      .title('Art Jewelry')
                      .child(S.documentList().title('Art Jewelry Creators').filter('_type == "creator" && category->title.en == "Art Jewelry"')),
                    S.listItem()
                      .title('Ceramic Art')
                      .child(S.documentList().title('Ceramic Art Creators').filter('_type == "creator" && category->title.en == "Ceramic Art"')),
                    S.listItem()
                      .title('Design Jewelry')
                      .child(S.documentList().title('Design Jewelry Creators').filter('_type == "creator" && category->title.en == "Design Jewelry"')),
                    S.listItem()
                      .title('Textile | Accessories')
                      .child(S.documentList().title('Textile | Accessories Creators').filter('_type == "creator" && category->title.en == "Textile | Accessories"')),
                    S.listItem()
                      .title('Studio Glass')
                      .child(S.documentList().title('Studio Glass Creators').filter('_type == "creator" && category->title.en == "Studio Glass"')),
                    S.listItem()
                      .title('Metal Art')
                      .child(S.documentList().title('Metal Art Creators').filter('_type == "creator" && category->title.en == "Metal Art"')),
                    S.listItem()
                      .title('Lighting')
                      .child(S.documentList().title('Lighting Creators').filter('_type == "creator" && category->title.en == "Lighting"')),
                    S.listItem()
                      .title('Furniture | Objects')
                      .child(S.documentList().title('Furniture | Objects Creators').filter('_type == "creator" && category->title.en == "Furniture | Objects"')),
                    S.listItem()
                      .title('Woodwork | Paper')
                      .child(S.documentList().title('Woodwork | Paper Creators').filter('_type == "creator" && category->title.en == "Woodwork | Paper"')),
                    S.listItem()
                      .title('Rugs | Interior Textiles')
                      .child(S.documentList().title('Rugs | Interior Textiles Creators').filter('_type == "creator" && category->title.en == "Rugs | Interior Textiles"')),
                    S.listItem()
                      .title('Diverse Design Objects')
                      .child(S.documentList().title('Diverse Design Objects Creators').filter('_type == "creator" && category->title.en == "Diverse Design Objects"'))
                  ])
              ),
            S.documentTypeListItem('category').title('Categories'),
            
            // Locations with dynamic filtering
            S.listItem()
              .title('Locations')
              .child(
                S.list()
                  .title('Locations')
                  .items([
                    S.listItem()
                      .title('All Locations')
                      .child(S.documentTypeList('location').title('All Locations')),
                    S.divider(),
                    
                    // Type filters  
                    S.listItem()
                      .title('📍 By Type')
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
                      .title('🌍 By Country')
                      .child(async () => {
                        const client = S.context.getClient({ apiVersion: '2023-01-01' })
                        
                        // Get all unique countries and their cities
                        const locations = await client.fetch(`
                          *[_type == "location" && defined(country) && defined(location)] {
                            country,
                            location
                          } | order(country asc, location asc)
                        `)
                        
                        // Group by country with unique city handling
                        const countriesMap = new Map()
                        locations.forEach(loc => {
                          if (!countriesMap.has(loc.country)) {
                            countriesMap.set(loc.country, new Set())
                          }
                          countriesMap.get(loc.country).add(loc.location)
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
                        
                        // Create country items with city sub-navigation
                        const countryItems = Array.from(countriesMap.entries()).map(([country, cities]) => {
                          const cityArray = Array.from(cities).sort()
                          
                          if (cityArray.length === 1) {
                            // Single city - direct link
                            return S.listItem()
                              .id(`country-${createSafeId(country)}`)
                              .title(country)
                              .child(
                                S.documentTypeList('location')
                                  .title(country)
                                  .filter('_type == "location" && country == $country')
                                  .params({ country })
                              )
                          } else {
                            // Multiple cities - create sub-navigation
                            return S.listItem()
                              .id(`country-${createSafeId(country)}`)
                              .title(country)
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
                                          .filter('_type == "location" && country == $country')
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
                                            .filter('_type == "location" && country == $country && location == $city')
                                            .params({ country, city })
                                        )
                                    )
                                  ])
                              )
                          }
                        })
                        
                        return S.list()
                          .title('By Country')
                          .items(countryItems)
                      }),
                  ])
              ),
            
            S.documentTypeListItem('material').title('Materials'),
            S.documentTypeListItem('medium').title('Media Types'),
          ])
    }),
    visionTool(),
    media(),
    dashboardTool({
      widgets: [
        {
          name: 'media-stats',
          component: MediaStatsWidget,
          layout: {
            width: 'full',
            height: 'auto'
          }
        }
      ]
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})