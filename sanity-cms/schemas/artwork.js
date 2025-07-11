export default {
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  groups: [
    {name: 'main', title: 'Main Info'},
    {name: 'details', title: 'Details'},
    {name: 'meta', title: 'Metadata'}
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
            hotspot: true,
            storeOriginalFilename: false
          },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'object',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'workTitle',
      title: 'Work Title',
      type: 'object',
      group: 'main',
      validation: Rule => Rule.required(),
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'string',
          validation: Rule => Rule.required()
        },
        {
          name: 'de', 
          title: 'German',
          type: 'string',
          validation: Rule => Rule.required()
        }
      ]
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'main',
      options: {
        source: 'workTitle.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'creator',
      title: 'Creator',
      type: 'reference',
      to: [{type: 'creator'}],
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
      name: 'medium',
      title: 'Medium',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      group: 'main',
      description: 'Specific medium/type (e.g., brooches, vases, rings)'
    },
    {
      name: 'material',
      title: 'Material',
      type: 'object',
      group: 'details',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'size',
      title: 'Size/Dimensions',
      type: 'object',
      group: 'details',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      group: 'details'
    },
    {
      name: 'price',
      title: 'Price',
      type: 'object',
      group: 'details',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'description',
      title: 'Description',
      type: 'object',
      group: 'details',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
    },
    {
      name: 'rawCaption',
      title: 'Raw Caption',
      type: 'object',
      group: 'details',
      description: 'Full original caption text from scraped data',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
    },
    // Source metadata for tracking scraped data
    {
      name: 'sourceUrls',
      title: 'Source URLs',
      type: 'object',
      group: 'meta',
      fields: [
        {name: 'en', title: 'English URL', type: 'url'},
        {name: 'de', title: 'German URL', type: 'url'}
      ]
    },
    {
      name: 'originalFilename',
      title: 'Original Filename',
      type: 'string',
      group: 'meta',
      description: 'Original image filename from scraped data'
    },
    // TEMPORARY FIELDS FOR CLEANUP - WILL BE REMOVED
    {
      name: 'isApprovedArtwork',
      title: 'Is Approved (Legacy)',
      type: 'boolean',
      group: 'meta',
      description: 'Legacy approval field - will be removed',
      hidden: true
    },
    {
      name: 'maker',
      title: 'Maker (Legacy)',
      type: 'reference',
      to: [{type: 'creator'}],
      group: 'meta',
      description: 'Legacy maker field - use Creator field instead',
      hidden: true
    },
    {
      name: 'sourceInfo',
      title: 'Source Info (Legacy)',
      type: 'object',
      group: 'meta',
      description: 'Migration metadata - will be removed',
      hidden: true,
      fields: [
        {name: 'extractedArtist', type: 'string'},
        {name: 'originalUrl', type: 'string'},
        {name: 'wordpressMediaId', type: 'number'}
      ]
    }
  ],
  preview: {
    select: {
      titleEn: 'workTitle.en',
      titleDe: 'workTitle.de',
      creator: 'creator.name',
      category: 'category.title',
      materialEn: 'material.en',
      materialDe: 'material.de',
      year: 'year',
      image: 'images.0.asset',
      media: 'images.0'
    },
    prepare({titleEn, titleDe, creator, category, materialEn, materialDe, year, image, media}) {
      const displayTitle = titleEn || titleDe || 'Untitled Artwork'
      const categoryText = category || 'Unknown category'
      const materialText = materialEn || materialDe || 'Unknown material'
      const yearText = year ? ` (${year})` : ''
      const creatorText = creator ? ` by ${creator}` : ''
      const subtitle = `${categoryText} - ${materialText}${yearText}${creatorText}`
      
      return {
        title: displayTitle,
        subtitle,
        media: image || media
      }
    }
  }
} 