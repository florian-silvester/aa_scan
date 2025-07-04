export default {
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'titleDe',
      title: 'Title (German)',
      type: 'string'
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      }
    }
  ],
  preview: {
    select: {
      title: 'title',
      titleDe: 'titleDe'
    },
    prepare(selection) {
      const { title, titleDe } = selection
      const subtitle = titleDe ? `German: ${titleDe}` : undefined
      return {
        title,
        subtitle
      }
    }
  }
} 