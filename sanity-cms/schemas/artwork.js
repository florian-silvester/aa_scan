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
      name: 'materials',
      title: 'Materials',
      type: 'array',
      of: [
        // Option 1: Reference existing materials
        {
          type: 'reference',
          to: [{type: 'material'}],
          title: 'Existing Material'
        },
        // Option 2: Add inline material
        {
          type: 'object',
          name: 'inlineMaterial',
          title: 'New Material',
          fields: [
            {
              name: 'name',
              title: 'Material Name',
              type: 'object',
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
              name: 'category',
              title: 'Material Category',
              type: 'string',
              options: {
                list: [
                  {title: 'Metals', value: 'metals'},
                  {title: 'Stones & Minerals', value: 'stones'},
                  {title: 'Organic', value: 'organic'},
                  {title: 'Ceramics & Glass', value: 'ceramics'},
                  {title: 'Textiles', value: 'textiles'},
                  {title: 'Synthetic', value: 'synthetic'},
                  {title: 'Treatments', value: 'treatments'},
                  {title: 'Other', value: 'other'}
                ]
              }
            },
            {
              name: 'description',
              title: 'Description',
              type: 'object',
              fields: [
                {name: 'en', title: 'English', type: 'text'},
                {name: 'de', title: 'German', type: 'text'}
              ]
            }
          ],
          preview: {
            select: {
              nameEn: 'name.en',
              nameDe: 'name.de',
              category: 'category'
            },
            prepare({nameEn, nameDe, category}) {
              const title = nameEn || nameDe || 'Untitled Material'
              const subtitle = category ? `Category: ${category}` : 'Custom material'
              return {
                title,
                subtitle
              }
            }
          }
        }
      ],
      group: 'details',
      fieldset: 'physical',
      description: 'Select existing materials or add new ones inline'
    },
    {
      name: 'size',
      title: 'Size/Dimensions',
      type: 'object',
      group: 'details',
      fieldset: 'physical',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
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
      type: 'object',
      group: 'details',
      fieldset: 'physical',
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
      image: 'images.0.asset',
      media: 'images.0'
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