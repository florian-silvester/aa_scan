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
      name: 'titleEn',
      title: 'Title (English)',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'titleDe',
      title: 'Title (German)',
      type: 'string'
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
      name: 'introductionEn',
      title: 'Introduction (English)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    },
    {
      name: 'introductionDe',
      title: 'Introduction (German)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    },
    {
      name: 'fullTextEn',
      title: 'Full Text (English)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    },
    {
      name: 'fullTextDe',
      title: 'Full Text (German)',
      type: 'array',
      of: [{type: 'block'}],
      group: 'content',
    },
    {
      name: 'images',
      title: 'Featured Artworks',
      type: 'array',
      description: 'Link artworks to this article',
      of: [
        {
          type: 'reference',
          to: [{ type: 'artwork' }]
        }
      ],
      options: {
        layout: 'grid',
        columns: 2
      }
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'titleEn',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    }
  ],
  preview: {
    select: {
      title: 'titleEn',
      titleDe: 'titleDe',
      author: 'author',
      maker: 'maker.name',
      date: 'date',
      media: 'images.0.images.0.asset'
    },
    prepare(selection) {
      const { title, titleDe, author, maker, date, media } = selection
      const displayTitle = title || titleDe || 'Untitled'
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