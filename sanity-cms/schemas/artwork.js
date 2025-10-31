export default {
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  groups: [
    {name: 'main', title: 'Main Info'},
    {name: 'details', title: 'Details'},
    {name: 'meta', title: 'Metadata'}
  ],
  fieldsets: [
    {
      name: 'physical',
      title: 'Physical Properties',
      options: {collapsible: true, collapsed: false}
    }
  ],
  fields: [
    {
      name: 'name',
      title: 'Main Title',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required(),
      description: 'Main display title in format: Creator_work title'
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      group: 'main',
      options: {
        hotspot: true,
        storeOriginalFilename: true
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
    },
    {
      name: 'images',
      title: 'Artwork Images (Legacy)',
      type: 'array',
      group: 'main',
      hidden: true,
      description: 'Legacy field - use mainImage instead',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
            storeOriginalFilename: true
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
      title: 'Medium',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'main',
      description: 'Primary craft medium (e.g., Ceramics, Glass, Jewelry, Metalwork, Textiles, Woodwork)'
    },
    {
      name: 'medium',
      title: 'Type',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      group: 'main',
      description: 'Object type(s) (e.g., Vase, Chair, Ring, Brooch, Necklace, Bracelet). Use the "+" button to create new types.'
    },
    {
      name: 'materials',
      title: 'Materials',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'material'}]
        }
      ],
      group: 'details',
      fieldset: 'physical',
      description: 'Select materials. Use the "+" button to create new materials if needed.'
    },
    {
      name: 'finishes',
      title: 'Finishes',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'finish'}]
        }
      ],
      group: 'details',
      fieldset: 'physical',
      description: 'Select finishes/surface treatments. Use the "+" button to create new finishes if needed.'
    },
    {
      name: 'size',
      title: 'Size/Dimensions',
      type: 'string',
      group: 'details',
      fieldset: 'physical'
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      group: 'details',
      fieldset: 'physical'
    },
    {
      name: 'price',
      title: 'Price',
      type: 'string',
      group: 'details',
      fieldset: 'physical'
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
    // Source metadata for tracking scraped data
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
      name: 'name',
      titleEn: 'workTitle.en',
      titleDe: 'workTitle.de',
      creator: 'creator.name',
      categoryEn: 'category.title.en',
      categoryDe: 'category.title.de',
      materials: 'materials',
      year: 'year',
      image: 'mainImage.asset',
      media: 'mainImage'
    },
    prepare({name, titleEn, titleDe, creator, categoryEn, categoryDe, materials, year, image, media}) {
      const displayTitle = name || titleEn || titleDe || 'Untitled Artwork'
      const workTitle = titleEn || titleDe
      const categoryText = categoryEn || categoryDe || 'Unknown category'
      const materialText = materials && materials.length > 0 
        ? `${materials.length} material${materials.length > 1 ? 's' : ''}` 
        : 'No materials'
      const yearText = year ? ` (${year})` : ''
      const creatorText = creator ? ` by ${creator}` : ''
      const workTitleText = workTitle ? ` - ${workTitle}` : ''
      const subtitle = `${categoryText} - ${materialText}${yearText}${creatorText}${workTitleText}`
      
      return {
        title: displayTitle,
        subtitle,
        media: image || media
      }
    }
  }
} 