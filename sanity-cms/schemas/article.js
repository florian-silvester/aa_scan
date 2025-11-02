export default {
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'metadata', title: 'Metadata'},
    {name: 'hero', title: 'Hero Section'},
    {name: 'section1', title: 'Section 1'},
    {name: 'section2', title: 'Section 2'},
    {name: 'section3', title: 'Section 3'},
    {name: 'section4', title: 'Section 4'},
    {name: 'final', title: 'Final Section'},
  ],
  fields: [
    // METADATA
    {
      name: 'name',
      title: 'Name',
      type: 'object',
      group: 'metadata',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'metadata',
      options: {
        source: 'name.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'date',
      title: 'Publication Date',
      type: 'datetime',
      group: 'metadata'
    },
    {
      name: 'featuredCreator',
      title: 'Featured Creator',
      type: 'reference',
      group: 'metadata',
      to: [{type: 'creator'}],
      description: 'The creator/artist featured in this article'
    },
    {
      name: 'authors',
      title: 'Author(s)',
      type: 'array',
      group: 'metadata',
      of: [{type: 'reference', to: [{type: 'author'}]}],
      description: 'Article authors'
    },
    {
      name: 'photographers',
      title: 'Photographer(s)',
      type: 'array',
      group: 'metadata',
      of: [{type: 'reference', to: [{type: 'photographer'}]}],
      description: 'Photographers'
    },
    {
      name: 'materials',
      title: 'Materials',
      type: 'array',
      group: 'metadata',
      of: [{type: 'reference', to: [{type: 'material'}]}],
      description: 'Select relevant materials for this article'
    },
    {
      name: 'medium',
      title: 'Medium',
      type: 'array',
      group: 'metadata',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      description: 'Select relevant mediums for this article'
    },
    {
      name: 'finishes',
      title: 'Finishes',
      type: 'array',
      group: 'metadata',
      of: [{type: 'reference', to: [{type: 'finish'}]}],
      description: 'Select relevant finishes for this article'
    },

    // HERO SECTION
    {
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'object',
      group: 'hero',
      description: 'Main headline (supports rich text)',
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
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      group: 'hero',
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
        }
      ]
    },
    {
      name: 'intro',
      title: 'Introduction',
      type: 'object',
      group: 'hero',
      description: 'Introduction text (rich text)',
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

    // SECTION 1
    {
      name: 'section1Images',
      title: 'Section 1 Images',
      type: 'array',
      group: 'section1',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
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
              description: 'Will be combined with alt text in Webflow',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section1Layout',
      title: 'Section 1 Layout',
      type: 'string',
      group: 'section1',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'}
        ]
      }
    },
    {
      name: 'section1Text',
      title: 'Section 1 Text',
      type: 'object',
      group: 'section1',
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

    // SECTION 2
    {
      name: 'section2Images',
      title: 'Section 2 Images',
      type: 'array',
      group: 'section2',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
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
              description: 'Will be combined with alt text in Webflow',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section2Layout',
      title: 'Section 2 Layout',
      type: 'string',
      group: 'section2',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'}
        ]
      }
    },
    {
      name: 'section2Text',
      title: 'Section 2 Text',
      type: 'object',
      group: 'section2',
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

    // SECTION 3
    {
      name: 'section3Images',
      title: 'Section 3 Images',
      type: 'array',
      group: 'section3',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
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
              description: 'Will be combined with alt text in Webflow',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section3Layout',
      title: 'Section 3 Layout',
      type: 'string',
      group: 'section3',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'}
        ]
      }
    },
    {
      name: 'section3Text',
      title: 'Section 3 Text',
      type: 'object',
      group: 'section3',
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

    // SECTION 4
    {
      name: 'section4Images',
      title: 'Section 4 Images',
      type: 'array',
      group: 'section4',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
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
              description: 'Will be combined with alt text in Webflow',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section4Layout',
      title: 'Section 4 Layout',
      type: 'string',
      group: 'section4',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'}
        ]
      }
    },
    {
      name: 'section4Text',
      title: 'Section 4 Text',
      type: 'object',
      group: 'section4',
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

    // FINAL SECTION
    {
      name: 'sectionFinalImage1',
      title: 'Final Section Image',
      type: 'image',
      group: 'final',
      options: {hotspot: true},
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
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      authors: 'authors',
      creator: 'featuredCreator.name',
      date: 'date',
      media: 'heroImage'
    },
    prepare(selection) {
      const { nameEn, nameDe, authors, creator, date, media } = selection
      const displayName = nameEn || nameDe || 'Untitled'
      const byLine = [authors?.[0], creator].filter(Boolean).join(' • ')
      return {
        title: displayName,
        subtitle: byLine || 'No author/creator',
        description: date ? new Date(date).toLocaleDateString() : 'No date',
        media: media
      }
    }
  }
} 