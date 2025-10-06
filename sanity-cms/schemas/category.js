export default {
  name: 'category',
  title: 'Medium',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
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
      name: 'description',
      title: 'Description',
      type: 'object',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title.en',
        maxLength: 96
      }
    },
    // LEGACY FIELD - will be removed after migration
    {
      name: 'titleDe',
      title: 'Title (German) - LEGACY',
      type: 'string',
      hidden: true,
      description: 'Legacy field - use Title object instead'
    }
  ],
  preview: {
    select: {
      titleEn: 'title.en',
      titleDe: 'title.de'
    },
    prepare(selection) {
      const { titleEn, titleDe } = selection
      const title = titleEn || titleDe || 'Untitled Category'
      const subtitle = titleDe ? `German: ${titleDe}` : undefined
      return {
        title,
        subtitle
      }
    }
  }
} 