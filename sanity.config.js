import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {dashboardTool} from '@sanity/dashboard'
import {schemaTypes} from './schemas'
import {media} from 'sanity-plugin-media'
import MediaStatsWidget from './components/MediaStatsWidget'
import MediaStatsStructure from './components/MediaStatsStructure'
import {ImageIcon} from '@sanity/icons'

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
            // Custom Media Stats tool
            S.listItem()
              .title('📊 Media Analytics')
              .icon(ImageIcon)
              .child(
                S.component(MediaStatsStructure)
                  .title('Media Analytics Dashboard')
              ),
            S.divider(),
            // Regular document types
            S.documentTypeListItem('article').title('Articles'),
            S.documentTypeListItem('artwork').title('Artworks'),
            S.documentTypeListItem('creator').title('Creators'),
            S.documentTypeListItem('category').title('Categories'),
            S.documentTypeListItem('location').title('Locations'),
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

  document: {
    // Remove or disable preview for documents that might be causing issues
    productionUrl: (prev, {document}) => {
      // Only enable preview for specific document types if needed
      return undefined; // Disable preview for now
    }
  }
}) 