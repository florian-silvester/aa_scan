export default {
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  fieldsets: [
    {
      name: 'basicInfo',
      title: 'Basic Info',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'classification',
      title: 'Classification',
      options: {collapsible: true, collapsed: false}
    }
  ],
  fields: [
    {
      name: 'name',
      title: 'Main Title',
      type: 'string',
      validation: Rule => Rule.required(),
      description: 'Main display title in format: Creator_work title'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'workTitle.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'mainImage',
      title: 'Main Image',
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
    },
    {
      name: 'images',
      title: 'Artwork Images (Legacy)',
      type: 'array',
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
      fieldset: 'basicInfo',
      validation: Rule => Rule.required(),
      description: 'Descriptive title of the artwork',
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
      name: 'creator',
      title: 'Creator',
      type: 'reference',
      to: [{type: 'creator'}],
      fieldset: 'basicInfo',
      description: 'The artist/designer who created this work'
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      fieldset: 'basicInfo',
      description: 'Year of creation'
    },
    {
      name: 'size',
      title: 'Size/Dimensions',
      type: 'string',
      fieldset: 'basicInfo',
      description: 'Dimensions of the artwork'
    },
    {
      name: 'price',
      title: 'Price',
      type: 'string',
      fieldset: 'basicInfo',
      description: 'Price information'
    },
    {
      name: 'description',
      title: 'Description',
      type: 'object',
      fieldset: 'basicInfo',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      fieldset: 'classification',
      description: 'Primary craft medium (e.g., Ceramics, Glass, Jewelry, Metalwork, Textiles, Woodwork)'
    },
    {
      name: 'medium',
      title: 'Type',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      fieldset: 'classification',
      description: 'Object type(s) (e.g., Vase, Chair, Ring, Brooch, Necklace, Bracelet)'
    },
    {
      name: 'materials',
      title: 'Materials',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'material'}]}],
      fieldset: 'classification',
      description: 'Specific materials used (e.g., Gold, Silver, Bronze, Wood, Ceramic)'
    },
    {
      name: 'materialTypes',
      title: 'Material Types',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'materialType'}]}],
      fieldset: 'classification',
      description: 'Broad material categories (e.g., Metals, Stones & Minerals, Glass & Crystal, Ceramics & Clay)'
    },
    {
      name: 'finishes',
      title: 'Finishes',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'finish'}]}],
      fieldset: 'classification',
      description: 'Surface treatments (e.g., Polished, Matte, Glazed, Patinated, Brushed)'
    },
    // Source metadata for tracking scraped data
    {
      name: 'originalFilename',
      title: 'Original Filename',
      type: 'string',
      description: 'Original image filename from scraped data',
      hidden: true
    },
    // TEMPORARY FIELDS FOR CLEANUP - WILL BE REMOVED
    {
      name: 'isApprovedArtwork',
      title: 'Is Approved (Legacy)',
      type: 'boolean',
      description: 'Legacy approval field - will be removed',
      hidden: true
    },
    {
      name: 'maker',
      title: 'Maker (Legacy)',
      type: 'reference',
      to: [{type: 'creator'}],
      description: 'Legacy maker field - use Creator field instead',
      hidden: true
    },
    {
      name: 'sourceInfo',
      title: 'Source Info (Legacy)',
      type: 'object',
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