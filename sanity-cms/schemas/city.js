export default {
  name: 'city',
  title: 'City',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'City Name',
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
      name: 'country',
      title: 'Country',
      type: 'reference',
      to: [{type: 'country'}],
      validation: Rule => Rule.required()
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
      countryEn: 'country.name.en',
      countryDe: 'country.name.de'
    },
    prepare({nameEn, nameDe, countryEn, countryDe}) {
      const title = nameEn || nameDe || 'Untitled City'
      const countryName = countryEn || countryDe
      const subtitle = countryName ? `${countryName}` : undefined
      return {
        title,
        subtitle
      }
    }
  }
} 