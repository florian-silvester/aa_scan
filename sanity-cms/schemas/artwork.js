export default {
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  groups: [
    {name: 'main', title: 'Main Info'},
    {name: 'details', title: 'Details'},
    {name: 'meta', title: 'Metadata'},
  ],
  fields: [
    {
      name: 'images',
      title: 'Artwork Images',
      type: 'array',
      group: 'main',
      validation: Rule => Rule.required().min(1).error('At least one image is required'),
      of: [
        {
          type: 'image',
          options: {
            hotspot: true
          },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string'
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string'
            }
          ]
        }
      ],
      options: {
        layout: 'grid'
      }
    },
    {
      name: 'workTitle',
      title: 'Work Title',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required()
    },
    {
      name: 'maker',
      title: 'Maker',
      type: 'reference',
      to: [{type: 'creator'}],
      group: 'main'
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      group: 'main'
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'main'
    },
    {
      name: 'materialEn',
      title: 'Material (English)',
      type: 'string',
      group: 'main'
    },
    {
      name: 'materialDe',
      title: 'Material (German)',
      type: 'string',
      group: 'main'
    },
    {
      name: 'measurements',
      title: 'Measurements',
      type: 'string',
      group: 'details',
    },
    {
      name: 'commentsEn',
      title: 'Comments (English)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'details',
    },
    {
      name: 'commentsDe',
      title: 'Comments (German)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'details',
    },
    {
      name: 'photoCredit',
      title: 'Photo Credit',
      type: 'string',
      group: 'details',
    },
    {
      name: 'imageId',
      title: 'Legacy Image ID',
      type: 'string',
      group: 'meta',
      description: 'Original image ID for reference'
    },
    {
      name: 'articles',
      title: 'Related Articles',
      type: 'array',
      group: 'meta',
      of: [{type: 'reference', to: [{type: 'article'}]}],
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: {
        source: 'workTitle',
        maxLength: 96
      }
    }
  ],
  preview: {
    select: {
      title: 'workTitle',
      maker: 'maker.name',
      year: 'year',
      category: 'category.title',
      materialEn: 'materialEn',
      materialDe: 'materialDe',
      media: 'images.0.asset',
      imageId: 'imageId'
    },
    prepare(selection) {
      const { title, maker, year, category, materialEn, materialDe, media, imageId } = selection
      
      // Create a compact display title
      const displayTitle = title || imageId || 'Untitled Artwork'
      
      // Create a rich subtitle with key info
      const categoryInfo = category || 'Unknown category'
      const materialInfo = materialEn || materialDe || 'Unknown material'
      const yearInfo = year ? ` (${year})` : ''
      const makerInfo = maker ? ` by ${maker}` : ''
      
      // Format: "Category - Material (Year) by Maker"
      const subtitle = `${categoryInfo} - ${materialInfo}${yearInfo}${makerInfo}`
      
      return {
        title: displayTitle,
        subtitle: subtitle,
        media: media
      }
    }
  }
} 