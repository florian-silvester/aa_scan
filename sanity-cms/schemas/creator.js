import {CreatorArtworksView} from '../components/CreatorArtworksView'

export default {
  name: 'creator',
  title: 'Creator',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'image',
      title: 'Profile Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'studioImages',
      title: 'Studio Images',
      type: 'array',
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
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      description: 'Images of the creator\'s studio/workspace',
    },
    {
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
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
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            },
            {
              name: 'title',
              title: 'Image Title',
              type: 'object',
              fields: [
                {name: 'en', title: 'English', type: 'string'},
                {name: 'de', title: 'German', type: 'string'}
              ]
            }
          ]
        }
      ],
      description: 'Portfolio/gallery images showcasing the creator\'s work, process, or artistic environment',
    },
    {
      name: 'biography',
      title: 'Biography',
      type: 'object',
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
      name: 'portrait',
      title: 'Portrait/Introduction',
      type: 'object',
      description: 'A shorter portrait/introduction text',
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
      name: 'website',
      title: 'Website',
      type: 'url',
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string',
    },
    {
      name: 'nationality',
      title: 'Nationality',
      type: 'object',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'birthYear',
      title: 'Birth Year',
      type: 'number',
    },
    {
      name: 'specialties',
      title: 'Specialties/Techniques',
      type: 'object',
      description: 'Key techniques, materials, or specialties',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'array',
          of: [{type: 'string'}]
        },
        {
          name: 'de', 
          title: 'German',
          type: 'array',
          of: [{type: 'string'}]
        }
      ]
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
    },
    {
      name: 'tier',
      title: 'Tier',
      type: 'string',
      options: {
        list: [
          {title: 'Free', value: 'free'},
          {title: 'Paid', value: 'paid'},
        ],
      },
      initialValue: 'free',
    },
    {
      name: 'associatedLocations',
      title: 'Associated Locations',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'location'}]}],
      description: 'Studios, galleries, museums, or shops associated with this creator',
    },
    {
      name: 'artworks',
      title: 'Artworks',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'artwork'}]}],
      description: 'Artworks created by this artist',
    },
    {
      name: 'artworksDisplay',
      title: 'Artworks by this Creator',
      type: 'object',
      fields: [
        {
          name: 'placeholder',
          type: 'string',
          hidden: true,
        }
      ],
      components: {
        input: CreatorArtworksView
      },
      options: {
        collapsible: false,
      }
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    // LEGACY FIELDS - will be removed after migration
    {
      name: 'biographyEn',
      title: 'Biography (English) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Biography object instead'
    },
    {
      name: 'biographyDe',
      title: 'Biography (German) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Biography object instead'
    },
    {
      name: 'portraitEn',
      title: 'Portrait (English) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Portrait object instead'
    },
    {
      name: 'portraitDe',
      title: 'Portrait (German) - LEGACY',
      type: 'array',
      of: [{type: 'block'}],
      hidden: true,
      description: 'Legacy field - use Portrait object instead'
    },
  ],
  preview: {
    select: {
      title: 'name',
      media: 'image',
    },
  },
} 