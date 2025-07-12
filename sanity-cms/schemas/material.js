export default {
  name: 'material',
  title: 'Material',
  type: 'document',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'materialType',
      title: 'Material Type',
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
      materialType: 'materialType'
    },
    prepare({nameEn, nameDe, materialType}) {
      const title = nameEn || nameDe || 'Untitled Material'
      const subtitle = materialType ? `Type: ${materialType}` : undefined
      return {
        title,
        subtitle
      }
    }
  }
} 