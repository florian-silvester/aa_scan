export default {
  name: 'medium',
  title: 'Medium',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'object',
      validation: (Rule) => Rule.required(),
      description: 'e.g., Brooches, Vases, Rings, Bowls',
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
      name: 'description',
      title: 'Description',
      type: 'object',
      description: 'Brief description of this medium/type',
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
      validation: (Rule) => Rule.required(),
      description: 'The broader category this medium belongs to'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name.en',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      category: 'category.title.en',
      descriptionEn: 'description.en',
      descriptionDe: 'description.de'
    },
    prepare(selection) {
      const { nameEn, nameDe, category, descriptionEn, descriptionDe } = selection
      const title = nameEn || nameDe || 'Untitled Medium'
      const description = descriptionEn || descriptionDe
      const subtitle = category ? `${category}${description ? ` - ${description}` : ''}` : description
      return {
        title,
        subtitle
      }
    }
  },
} 