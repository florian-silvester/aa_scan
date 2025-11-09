import {CreatorArtworksView} from '../components/CreatorArtworksView'

export default {
  name: 'creator',
  title: 'Creator',
  type: 'document',
  fieldsets: [
    {
      name: 'info',
      title: 'Info',
      options: { collapsible: true, collapsed: false }
    },
    {
      name: 'artworks',
      title: 'Artworks',
      options: { collapsible: true, collapsed: false }
    },
    {
      name: 'images',
      title: 'Images',
      options: { collapsible: true, collapsed: false }
    },
    {
      name: 'craftProperties',
      title: 'Craft Properties',
      options: { collapsible: true, collapsed: false }
    }
  ],
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      description: 'Last name for sorting purposes',
    },
    // Info Group
    {
      name: 'biography',
      title: 'Biography',
      type: 'object',
      fieldset: 'info',
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
      fieldset: 'info',
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
      fieldset: 'info',
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      fieldset: 'info',
    },
    {
      name: 'nationality',
      title: 'Nationality',
      type: 'object',
      fieldset: 'info',
      fields: [
        {name: 'en', title: 'English', type: 'string'},
        {name: 'de', title: 'German', type: 'string'}
      ]
    },
    {
      name: 'birthYear',
      title: 'Birth Year',
      type: 'number',
      fieldset: 'info',
    },
    {
      name: 'associatedLocations',
      title: 'Associated Locations',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'location'}]}],
      fieldset: 'info',
      description: 'Studios, galleries, museums, or shops associated with this creator',
    },
    // Artworks Group
    {
      name: 'artworks',
      title: 'Artworks',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'artwork'}]}],
      fieldset: 'artworks',
      description: 'Artworks created by this artist',
    },
    // Images Group
    {
      name: 'image',
      title: 'Profile Image',
      type: 'image',
      fieldset: 'images',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'studioImage',
      title: 'Studio Image',
      type: 'image',
      fieldset: 'images',
      options: {
        hotspot: true,
        storeOriginalFilename: true,
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
      ],
      description: 'Image of the creator\'s studio/workspace',
    },
    {
      name: 'portraitImage',
      title: 'Portrait Image',
      type: 'image',
      fieldset: 'images',
      options: {
        hotspot: true,
        storeOriginalFilename: true,
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
      ],
      description: 'Portrait photograph of the creator',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      fieldset: 'images',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    // Craft Properties Group
    {
      name: 'category',
      title: 'Medium',
      type: 'reference',
      to: [{type: 'category'}],
      fieldset: 'craftProperties',
      description: 'Primary craft medium (e.g., Ceramics, Glass, Jewelry, Metalwork, Textiles, Woodwork)',
    },
    {
      name: 'creatorMediumTypes',
      title: 'All Medium Types',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'medium'}]}],
      fieldset: 'craftProperties',
      description: 'Auto-aggregated: All unique medium types from this creator\'s artworks',
      readOnly: true,
    },
    {
      name: 'creatorMaterials',
      title: 'All Materials Used',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'material'}]}],
      fieldset: 'craftProperties',
      description: 'Auto-aggregated: All unique materials from this creator\'s artworks',
      readOnly: true,
    },
    {
      name: 'creatorMaterialTypes',
      title: 'All Material Types',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'materialType'}]}],
      fieldset: 'craftProperties',
      description: 'Auto-aggregated: All unique material types from this creator\'s artworks',
      readOnly: true,
    },
    {
      name: 'creatorFinishes',
      title: 'All Finishes Used',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'finish'}]}],
      fieldset: 'craftProperties',
      description: 'Auto-aggregated: All unique finishes from this creator\'s artworks',
      readOnly: true,
    },
  ],
  preview: {
    select: {
      title: 'name',
      media: 'image',
    },
  },
}
