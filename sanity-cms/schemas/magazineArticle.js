export const MAGAZINE_SECTIONS = [
  {title: 'Feature', value: 'feature'},
  {title: 'Arts Crafts World', value: 'artsCraftsWorld'},
  {title: 'Review', value: 'review'},
  {title: 'Preview', value: 'preview'},
  {title: 'Special', value: 'special'},
  {title: 'Book Review', value: 'bookReview'},
  {title: 'News', value: 'news'},
  {title: 'Editorial', value: 'editorial'}
]

export const MAGAZINE_STATUSES = [
  {title: 'Imported', value: 'imported'},
  {title: 'Reviewed', value: 'reviewed'},
  {title: 'On Website', value: 'promoted'}
]

const localeString = (name, title, type = 'string') => ({
  name,
  title,
  type: 'object',
  fields: [
    {name: 'en', title: 'English', type},
    {name: 'de', title: 'German', type}
  ]
})

const localeBlocks = (name, title) => ({
  name,
  title,
  type: 'object',
  fields: [
    {name: 'en', title: 'English', type: 'array', of: [{type: 'block'}]},
    {name: 'de', title: 'German', type: 'array', of: [{type: 'block'}]}
  ]
})

const articleImage = {
  type: 'image',
  options: {hotspot: true},
  // the import marks captions it could not place with certainty
  validation: Rule => Rule.custom(value =>
    value?.captionCheck ? 'Check this caption, then untick "Check caption"' : true
  ).warning(),
  fields: [
    localeString('caption', 'Caption', 'text'),
    {
      name: 'captionCheck',
      title: 'Check caption',
      type: 'boolean',
      description: 'Set by the import when it could not tell for sure which caption belongs to this picture. Untick once checked.'
    },
    {
      name: 'pictured',
      title: 'Work Shown By',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'magazinePerson'}], weak: true}],
      description: 'Whose work or portrait is in this image'
    },
    {
      name: 'credit',
      title: 'Photo Credit',
      type: 'string',
      description: 'Credit exactly as printed'
    },
    {
      name: 'photographer',
      title: 'Photographer',
      type: 'reference',
      to: [{type: 'magazinePerson'}],
      weak: true,
    }
  ]
}

export default {
  name: 'magazineArticle',
  title: 'Magazine Article',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'images', title: 'Images'},
    {name: 'connections', title: 'Connections'},
    {name: 'archive', title: 'Archive'}
  ],
  fieldsets: [
    {name: 'pages', title: 'Pages', options: {columns: 2}}
  ],
  fields: [
    // CONTENT
    {
      name: 'issue',
      title: 'Issue',
      type: 'reference',
      group: 'content',
      to: [{type: 'magazineIssue'}],
      weak: true,
      validation: Rule => Rule.required()
    },
    {
      name: 'section',
      title: 'Section',
      type: 'string',
      group: 'content',
      options: {list: MAGAZINE_SECTIONS}
    },
    {
      name: 'pageStart',
      title: 'First Page',
      type: 'number',
      group: 'content',
      fieldset: 'pages'
    },
    {
      name: 'pageEnd',
      title: 'Last Page',
      type: 'number',
      group: 'content',
      fieldset: 'pages'
    },
    {
      ...localeString('title', 'Title'),
      group: 'content',
      validation: Rule => Rule.custom(value =>
        value?.en || value?.de ? true : 'Add a title in at least one language'
      )
    },
    {
      ...localeString('teaser', 'Teaser', 'text'),
      group: 'content',
      description: 'Short summary, usually from the contents page'
    },
    {
      ...localeBlocks('body', 'Text'),
      group: 'content'
    },
    {
      name: 'byline',
      title: 'Byline',
      type: 'string',
      group: 'content',
      description: 'Author line exactly as printed'
    },

    // IMAGES
    {
      name: 'images',
      title: 'Printed Images',
      type: 'array',
      group: 'images',
      options: {layout: 'grid'},
      of: [articleImage],
      description: 'Images that appear in the printed article'
    },
    {
      name: 'extraImages',
      title: 'Extra Images',
      type: 'array',
      group: 'images',
      options: {layout: 'grid'},
      of: [articleImage],
      description: 'Images from the issue folder that were not printed, e.g. for lack of space'
    },

    // CONNECTIONS
    {
      name: 'featured',
      title: 'Featured People',
      type: 'array',
      group: 'connections',
      of: [{type: 'reference', to: [{type: 'magazinePerson'}], weak: true}],
      description: 'People this article is about'
    },
    {
      name: 'mentioned',
      title: 'Mentioned People',
      type: 'array',
      group: 'connections',
      of: [{type: 'reference', to: [{type: 'magazinePerson'}], weak: true}],
      description: 'Other people named in the text or captions'
    },
    {
      name: 'authors',
      title: 'Authors',
      type: 'array',
      group: 'connections',
      of: [{type: 'reference', to: [{type: 'magazinePerson'}], weak: true}]
    },

    // ARCHIVE
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'archive',
      options: {list: MAGAZINE_STATUSES, layout: 'radio', direction: 'horizontal'},
      initialValue: 'imported'
    },
    {
      name: 'promotedTo',
      title: 'Website Article',
      type: 'reference',
      group: 'archive',
      to: [{type: 'article'}],
      weak: true,
      description: 'The website article made from this magazine article'
    },
    {
      name: 'sourceFolder',
      title: 'Source Folder',
      type: 'string',
      group: 'archive',
      description: 'Dropbox folder with the original text and images'
    }
  ],
  orderings: [
    {
      title: 'Issue, Newest First',
      name: 'issueDesc',
      by: [
        {field: 'issue.number', direction: 'desc'},
        {field: 'pageStart', direction: 'asc'}
      ]
    }
  ],
  preview: {
    select: {
      titleEn: 'title.en',
      titleDe: 'title.de',
      issueNumber: 'issue.number',
      pageStart: 'pageStart',
      section: 'section',
      media: 'images.0'
    },
    prepare(selection) {
      const { titleEn, titleDe, issueNumber, pageStart, section, media } = selection
      const sectionTitle = MAGAZINE_SECTIONS.find(s => s.value === section)?.title
      return {
        title: titleEn || titleDe || 'Untitled',
        subtitle: [
          issueNumber && `AA ${issueNumber}`,
          pageStart && `p. ${pageStart}`,
          sectionTitle
        ].filter(Boolean).join(' · '),
        media
      }
    }
  }
}
