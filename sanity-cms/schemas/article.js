export default {
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'metadata', title: 'Metadata'},
    {name: 'content', title: 'Content'},
  ],
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
          type: 'string'
        }
      ]
    },
    {
      name: 'author',
      title: 'Author',
      type: 'string'
    },
    {
      name: 'maker',
      title: 'Featured Creator',
      type: 'reference',
      to: [{type: 'creator'}],
      description: 'The creator/artist featured in this article'
    },
    {
      name: 'date',
      title: 'Date',
      type: 'date'
    },
    {
      name: 'introduction',
      title: 'Introduction',
      type: 'object',
      group: 'content',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [{type: 'block'}]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [{type: 'block'}]
        }
      ]
    },
    {
      name: 'fullText',
      title: 'Full Text',
      type: 'object',
      group: 'content',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [{type: 'block'}]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [{type: 'block'}]
        }
      ]
    },
    {
      name: 'images',
      title: 'Featured Images',
      type: 'array',
      description: 'Select images from the media library for this article',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true
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
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'object',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      options: {
        layout: 'grid',
      }
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    // LEGACY FIELDS - will be removed after migration
    {
      name: 'titleEn',
      title: 'Title (English) - LEGACY',
      type: 'string',
      hidden: true,
      description: 'Legacy field - use Title object instead'
    },
    {
      name: 'titleDe',
      title: 'Title (German) - LEGACY',
      type: 'string',
      hidden: true,
      description: 'Legacy field - use Title object instead'
    },
    {
      name: 'introductionEn',
      title: 'Introduction (English) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Introduction object instead'
    },
    {
      name: 'introductionDe',
      title: 'Introduction (German) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Introduction object instead'
    },
    {
      name: 'fullTextEn',
      title: 'Full Text (English) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Full Text object instead'
    },
    {
      name: 'fullTextDe',
      title: 'Full Text (German) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Full Text object instead'
    }
  ],
  preview: {
    select: {
      titleEn: 'title.en',
      titleDe: 'title.de',
      author: 'author',
      maker: 'maker.name',
      date: 'date',
      media: 'images.0.asset'
    },
    prepare(selection) {
      const { titleEn, titleDe, author, maker, date, media } = selection
      const displayTitle = titleEn || titleDe || 'Untitled'
      const byLine = [author, maker].filter(Boolean).join(' • ')
      return {
        title: displayTitle,
        subtitle: byLine || 'No author/creator',
        description: date ? new Date(date).toLocaleDateString() : 'No date',
        media: media
      }
    }
  }
} 