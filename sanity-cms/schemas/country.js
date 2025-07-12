export default {
  name: 'country',
  title: 'Country',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Country Name',
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
      name: 'code',
      title: 'Country Code',
      type: 'string',
      validation: Rule => Rule.required().length(2),
      description: 'Two-letter country code (ISO 3166-1 alpha-2)'
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
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      code: 'code'
    },
    prepare({nameEn, nameDe, code}) {
      const title = nameEn || nameDe || 'Untitled Country'
      const subtitle = code ? `(${code})` : undefined
      return {
        title,
        subtitle
      }
    }
  }
} 