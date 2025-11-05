export default {
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'metadata', title: 'Metadata'},
    {name: 'hero', title: 'Hero Section'},
    {name: 'images', title: 'Images'},
    {name: 'final', title: 'Connections'},
    {name: 'publication', title: 'Publication Info'},
  ],
  fieldsets: [
    {
      name: 'publicationDetails',
      title: 'Publication Details',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'craftProperties',
      title: 'Craft Properties',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'imageSet1',
      title: 'Image Set 1',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'imageSet2',
      title: 'Image Set 2',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'imageSet3',
      title: 'Image Set 3',
      options: {collapsible: true, collapsed: false}
    },
    {
      name: 'imageSet4',
      title: 'Image Set 4',
      options: {collapsible: true, collapsed: false}
    }
  ],
  fields: [
    // METADATA
    {
      name: 'featuredCreator',
      title: 'Featured Creator',
      type: 'reference',
      group: 'metadata',
      to: [{type: 'creator'}],
      description: 'The creator/artist featured in this article',
      initialValue: async (value, context) => {
        const {document, getClient} = context
        const creatorName = document?.creatorName
        
        if (!creatorName) return undefined
        
        // Extract last word (likely surname)
        const nameParts = creatorName.trim().split(/\s+/)
        const lastName = nameParts[nameParts.length - 1]
        
        if (!lastName) return undefined
        
        // Search for creator matching this name
        const client = getClient({apiVersion: '2023-01-01'})
        const query = `*[_type == "creator" && (
          name match $searchTerm ||
          slug.current match $slugTerm
        )][0]._id`
        
        const creatorId = await client.fetch(query, {
          searchTerm: `*${lastName}*`,
          slugTerm: `*${lastName.toLowerCase()}*`
        })
        
        return creatorId ? {_type: 'reference', _ref: creatorId} : undefined
      }
    },
    {
      name: 'creatorName',
      title: 'Creator Name',
      type: 'string',
      group: 'metadata',
      validation: Rule => Rule.required(),
      description: 'Creator name (one language, typically German)'
    },
    {
      name: 'title',
      title: 'Article Title',
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
          type: 'string',
          validation: Rule => Rule.required()
        }
      ]
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'publication',
      options: {
        source: (doc) => {
          const creator = doc.creatorName || ''
          const title = doc.title?.en || doc.title?.de || ''
          return `${creator} ${title}`.trim()
        },
        maxLength: 96
      },
      validation: Rule => Rule.required()
    },

    // HERO IMAGE
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      group: 'hero',
      options: {
        hotspot: true
      }
    },

    // INTRO (separate from fullText)
    {
      name: 'intro',
      title: 'Introduction',
      type: 'object',
      group: 'hero',
      description: 'Article introduction (separate from main text)',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        }
      ]
    },

    // FULL TEXT (body only - no headlines or intro)
    {
      name: 'fullText',
      title: 'Full Article Text',
      type: 'object',
      group: 'hero',
      description: 'Article body text. Insert Image Group blocks where images should appear.',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ]
            },
            {type: 'imageMarker'}
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ]
            },
            {type: 'imageMarker'}
          ]
        }
      ]
    },

    // SECTION 1
    {
      name: 'section1Images',
      title: 'Section 1 Images',
      type: 'array',
      group: 'images',
      fieldset: 'imageSet1',
      of: [
        {
          type: 'image',
          options: {hotspot: true}
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section1Layout',
      title: 'Section 1 Layout',
      type: 'string',
      group: 'images',
      fieldset: 'imageSet1',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'},
          {title: 'Sticky left', value: 'Sticky left'},
          {title: 'Sticky right', value: 'Sticky right'}
        ]
      }
    },
    {
      name: 'section1Captions',
      title: 'Section 1 Captions',
      type: 'object',
      group: 'images',
      fieldset: 'imageSet1',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        }
      ]
    },

    // SECTION 2
    {
      name: 'section2Images',
      title: 'Section 2 Images',
      type: 'array',
      group: 'images',
      fieldset: 'imageSet2',
      of: [
        {
          type: 'image',
          options: {hotspot: true}
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section2Layout',
      title: 'Section 2 Layout',
      type: 'string',
      group: 'images',
      fieldset: 'imageSet2',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'},
          {title: 'Sticky left', value: 'Sticky left'},
          {title: 'Sticky right', value: 'Sticky right'}
        ]
      }
    },
    {
      name: 'section2Captions',
      title: 'Section 2 Captions',
      type: 'object',
      group: 'images',
      fieldset: 'imageSet2',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        }
      ]
    },

    // SECTION 3
    {
      name: 'section3Images',
      title: 'Section 3 Images',
      type: 'array',
      group: 'images',
      fieldset: 'imageSet3',
      of: [
        {
          type: 'image',
          options: {hotspot: true}
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section3Layout',
      title: 'Section 3 Layout',
      type: 'string',
      group: 'images',
      fieldset: 'imageSet3',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'},
          {title: 'Sticky left', value: 'Sticky left'},
          {title: 'Sticky right', value: 'Sticky right'}
        ]
      }
    },
    {
      name: 'section3Captions',
      title: 'Section 3 Captions',
      type: 'object',
      group: 'images',
      fieldset: 'imageSet3',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        }
      ]
    },

    // SECTION 4
    {
      name: 'section4Images',
      title: 'Section 4 Images',
      type: 'array',
      group: 'images',
      fieldset: 'imageSet4',
      of: [
        {
          type: 'image',
          options: {hotspot: true}
        }
      ],
      options: {layout: 'grid'}
    },
    {
      name: 'section4Layout',
      title: 'Section 4 Layout',
      type: 'string',
      group: 'images',
      fieldset: 'imageSet4',
      options: {
        list: [
          {title: 'Full', value: 'Full'},
          {title: 'Main', value: 'Main'},
          {title: 'Small', value: 'Small'},
          {title: 'Sticky left', value: 'Sticky left'},
          {title: 'Sticky right', value: 'Sticky right'}
        ]
      }
    },
    {
      name: 'section4Captions',
      title: 'Section 4 Captions',
      type: 'object',
      group: 'images',
      fieldset: 'imageSet4',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        },
        {
          name: 'de',
          title: 'German',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                {title: 'Normal', value: 'normal'}
              ],
              lists: [],
              marks: {
                decorators: [
                  {title: 'Strong', value: 'strong'},
                  {title: 'Emphasis', value: 'em'}
                ]
              }
            }
          ]
        }
      ]
    },

    // FINAL SECTION
    {
      name: 'sectionFinalImage1',
      title: 'Final Section Image',
      type: 'image',
      group: 'final',
      options: {hotspot: true}
    },

    // CRAFT PROPERTIES (Connections)
    {
      name: 'materials',
      title: 'Materials',
      type: 'array',
      group: 'final',
      fieldset: 'craftProperties',
      of: [{type: 'reference', to: [{type: 'material'}]}],
      description: 'Select relevant materials for this article'
    },
    {
      name: 'medium',
      title: 'Medium',
      type: 'array',
      group: 'final',
      fieldset: 'craftProperties',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      description: 'Select relevant mediums for this article'
    },
    {
      name: 'finishes',
      title: 'Finishes',
      type: 'array',
      group: 'final',
      fieldset: 'craftProperties',
      of: [{type: 'reference', to: [{type: 'finish'}]}],
      description: 'Select relevant finishes for this article'
    },
    
    // PUBLICATION INFO (separate group after Connections)
    {
      name: 'date',
      title: 'Publication Date',
      type: 'datetime',
      group: 'publication',
      fieldset: 'publicationDetails'
    },
    {
      name: 'issue',
      title: 'Issue',
      type: 'string',
      group: 'publication',
      fieldset: 'publicationDetails',
      description: 'Magazine issue (e.g., "AA57", "2024/05")'
    },
    {
      name: 'authors',
      title: 'Author(s)',
      type: 'array',
      group: 'publication',
      fieldset: 'publicationDetails',
      of: [{type: 'reference', to: [{type: 'author'}]}],
      description: 'Article authors'
    },
    {
      name: 'photographers',
      title: 'Photographer(s)',
      type: 'array',
      group: 'publication',
      fieldset: 'publicationDetails',
      of: [{type: 'reference', to: [{type: 'photographer'}]}],
      description: 'Photographers'
    }
  ],
  preview: {
    select: {
      creatorName: 'creatorName',
      titleEn: 'title.en',
      titleDe: 'title.de',
      authors: 'authors',
      date: 'date',
      media: 'heroImage'
    },
    prepare(selection) {
      const { creatorName, titleEn, titleDe, authors, date, media } = selection
      const title = titleEn || titleDe || 'Untitled'
      const displayName = creatorName || 'No Creator'
      const byLine = authors?.[0] || ''
      return {
        title: displayName,
        subtitle: title,
        description: date ? new Date(date).toLocaleDateString() : 'No date',
        media: media
      }
    }
  }
} 