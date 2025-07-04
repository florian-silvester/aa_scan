import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
// import {table} from '@sanity/table' // Using MUI DataGrid instead
import {schemaTypes} from './schemas'
import ArtworkTableView from './components/ArtworkTableView'
import ArticleTableView from './components/ArticleTableView'
import CreatorTableView from './components/CreatorTableView'
import LocationTableView from './components/LocationTableView'

export default defineConfig({
  name: 'art-jewelry-cms',
  title: 'Art Jewelry CMS',

  projectId: 'b8bczekj', 
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Art Aurea Studio')
          .items([
            // ARTICLES
            S.listItem()
              .title('Articles')
              .child(
                S.list()
                  .title('Article Management')
                  .items([
                    S.listItem()
                      .title('Table View')
                      .child(
                        S.component(ArticleTableView)
                          .title('Article Table')
                      ),
                    S.divider(),
                    S.listItem()
                      .title('All Articles')
                      .child(S.documentTypeList('article').title('All Articles')),
                  ])
              ),
            
            S.divider(),
            
            // CREATORS
            S.listItem()
              .title('Creators')
              .child(
                S.list()
                  .title('Creator Management')
                  .items([
                    S.listItem()
                      .title('Table View')
                      .child(
                        S.component(CreatorTableView)
                          .title('Creator Table')
                      ),
                    S.divider(),
                    S.listItem()
                      .title('All Creators')
                      .child(S.documentTypeList('creator').title('All Creators')),
                  ])
              ),
            
            // CATEGORIES
            S.listItem()
              .title('Categories')
              .child(S.documentTypeList('category').title('Categories')),
            
            // LOCATIONS
            S.listItem()
              .title('Locations')
              .child(
                S.list()
                  .title('Browse Locations')
                  .items([
                    // TABLE VIEW
                    S.listItem()
                      .title('Table View')
                      .child(
                        S.component(LocationTableView)
                          .title('Location Table')
                      ),
                    
                    S.divider(),
                    
                    // ALL LOCATIONS
                    S.listItem()
                      .title('All Locations')
                      .child(
                        S.documentTypeList('location')
                          .title('All Locations')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    
                    S.divider(),
                    
                    // BY TYPE
                    S.listItem()
                      .title('Museums')
                      .child(
                        S.documentList()
                          .title('Museums')
                          .filter('_type == "location" && type == "museum"')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.listItem()
                      .title('Shops & Galleries')
                      .child(
                        S.documentList()
                          .title('Shops & Galleries')
                          .filter('_type == "location" && type == "shop-gallery"')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    S.listItem()
                      .title('Studios')
                      .child(
                        S.documentList()
                          .title('Studios')
                          .filter('_type == "location" && type == "studio"')
                          .defaultOrdering([{field: 'name', direction: 'asc'}])
                      ),
                    
                    S.divider(),
                    
                    // BY COUNTRY
                    S.listItem()
                      .title('By Country')
                      .child(
                        S.documentList()
                          .title('Browse by Country')
                          .filter('_type == "location"')
                          .defaultOrdering([{field: 'country', direction: 'asc'}, {field: 'name', direction: 'asc'}])
                      ),
                  ])
              ),
            
            S.divider(),
            
            // ARTWORK VIEWS - ADVANCED STRUCTURE
            S.listItem()
              .title('Artwork Collection')
              .child(
                S.list()
                  .title('Browse Artworks')
                  .items([
                    // TABLE VIEW - Proper spreadsheet columns
                    S.listItem()
                      .title('Table View')
                      .child(
                        S.component(ArtworkTableView)
                          .title('Artwork Table')
                      ),
                    
                    S.divider(),
                    
                    // ALL ARTWORKS
                    S.listItem()
                      .title('All Artworks')
                      .child(
                        S.documentTypeList('artwork')
                          .title('All Artworks')
                          .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                      ),
                    
                    S.divider(),
                    
                    // BY MAKER - Will be populated when artworks are added
                    S.listItem()
                      .title('By Maker')
                      .child(
                        S.documentList()
                          .title('Browse by Maker')
                          .filter('_type == "artwork"')
                          .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                      ),
                    
                    // BY CATEGORY
                    S.listItem()
                      .title('By Category')
                      .child(
                        S.list()
                          .title('Browse by Category')
                          .items([
                            S.listItem()
                              .title('Diverse Design Objects')
                              .child(
                                S.documentList()
                                  .title('Diverse Design Objects')
                                  .filter('_type == "artwork" && category->title == "Diverse Design Objects"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Furniture | Objects')
                              .child(
                                S.documentList()
                                  .title('Furniture | Objects')
                                  .filter('_type == "artwork" && category->title == "Furniture | Objects"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Lighting')
                              .child(
                                S.documentList()
                                  .title('Lighting')
                                  .filter('_type == "artwork" && category->title == "Lighting"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Rugs | Interior Textiles')
                              .child(
                                S.documentList()
                                  .title('Rugs | Interior Textiles')
                                  .filter('_type == "artwork" && category->title == "Rugs | Interior Textiles"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Ceramic Art')
                              .child(
                                S.documentList()
                                  .title('Ceramic Art')
                                  .filter('_type == "artwork" && category->title == "Ceramic Art"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Metal Art')
                              .child(
                                S.documentList()
                                  .title('Metal Art')
                                  .filter('_type == "artwork" && category->title == "Metal Art"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                      ),
                    S.listItem()
                              .title('Studio Glass')
                      .child(
                                S.documentList()
                                  .title('Studio Glass')
                                  .filter('_type == "artwork" && category->title == "Studio Glass"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Woodwork | Paper')
                              .child(
                                S.documentList()
                                  .title('Woodwork | Paper')
                                  .filter('_type == "artwork" && category->title == "Woodwork | Paper"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Art Jewelry')
                              .child(
                                S.documentList()
                                  .title('Art Jewelry')
                                  .filter('_type == "artwork" && category->title == "Art Jewelry"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Design Jewelry')
                              .child(
                                S.documentList()
                                  .title('Design Jewelry')
                                  .filter('_type == "artwork" && category->title == "Design Jewelry"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                            S.listItem()
                              .title('Textile | Accessories')
                              .child(
                                S.documentList()
                                  .title('Textile | Accessories')
                                  .filter('_type == "artwork" && category->title == "Textile | Accessories"')
                                  .defaultOrdering([{field: 'year', direction: 'desc'}])
                              ),
                          ])
                      ),
                    
                    // BY YEAR
                    S.listItem()
                      .title('By Year')
                      .child(
                        S.list()
                          .title('Browse by Year')
                          .items([
                            S.listItem()
                              .title('2025')
                              .child(
                                S.documentList()
                                  .title('2025 Artworks')
                                  .filter('_type == "artwork" && year == "2025"')
                                  .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                              ),
                            S.listItem()
                              .title('2024')
                              .child(
                                S.documentList()
                                  .title('2024 Artworks')
                                  .filter('_type == "artwork" && year == "2024"')
                                  .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                              ),
                            S.listItem()
                              .title('2023')
                              .child(
                                S.documentList()
                                  .title('2023 Artworks')
                                  .filter('_type == "artwork" && year == "2023"')
                                  .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                              ),
                            S.listItem()
                              .title('2022')
                              .child(
                                S.documentList()
                                  .title('2022 Artworks')
                                  .filter('_type == "artwork" && year == "2022"')
                                  .defaultOrdering([{field: 'workTitle', direction: 'asc'}])
                              ),
                          ])
                      ),
                    
                    // RECENT ADDITIONS
                    S.listItem()
                      .title('Recent Additions')
                      .child(
                        S.documentTypeList('artwork')
                          .title('Recently Added')
                          .filter('_type == "artwork"')
                          .defaultOrdering([{field: '_createdAt', direction: 'desc'}])
                      ),
                  ])
              ),
          ]),
      
      // CUSTOM DOCUMENT VIEWS - Multiple tabs for artworks
      defaultDocumentNode: (S, {schemaType}) => {
        if (schemaType === 'artwork') {
          return S.document().views([
            S.view.form(),
            S.view.component(ArtworkTableView).title('Table')
          ])
        }
        return S.document().views([S.view.form()])
      }
    }),
    visionTool(),
    media({
      creditLine: {
        enabled: true,
        // Enable credit line field for photographer/license info
      },
      maximumUploadSize: 10000000 // 10MB max file size
    }),
    // table(), // Using MUI DataGrid instead
  ],

  schema: {
    types: schemaTypes,
  },
}) 