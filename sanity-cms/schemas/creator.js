export default {
  name: 'creator',
  title: 'Creator',
  type: 'document',
  fields: [
    {
      name: 'image',
      title: 'Portrait Photo',
      type: 'image',
      options: {
        hotspot: true
      },
      description: 'Mugshot/portrait photo of the creator'
    },
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'biographyEn',
      title: 'Biography (English)',
      type: 'array',
      of: [{type: 'block'}]
    },
    {
      name: 'biographyDe',
      title: 'Biography (German)',
      type: 'array',
      of: [{type: 'block'}]
    },
    {
      name: 'portraitEn',
      title: 'Portrait (English)',
      type: 'array',
      of: [{type: 'block'}],
      description: 'A shorter portrait/introduction text in English'
    },
    {
      name: 'portraitDe',
      title: 'Portrait (German)',
      type: 'array',
      of: [{type: 'block'}],
      description: 'A shorter portrait/introduction text in German'
    },
    {
      name: 'website',
      title: 'Website',
      type: 'url'
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string'
    },
    {
      name: 'birthYear',
      title: 'Birth Year',
      type: 'number'
    },
    {
      name: 'nationality',
      title: 'Nationality',
      type: 'string'
    },
    {
      name: 'specialties',
      title: 'Specialties/Techniques',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Key techniques, materials, or specialties'
    },
    {
      name: 'awards',
      title: 'Awards & Recognition',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {name: 'year', type: 'number', title: 'Year'},
          {name: 'award', type: 'string', title: 'Award/Recognition'},
          {name: 'organization', type: 'string', title: 'Organization'}
        ]
      }]
    },
    {
      name: 'exhibitions',
      title: 'Notable Exhibitions',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {name: 'year', type: 'number', title: 'Year'},
          {name: 'title', type: 'string', title: 'Exhibition Title'},
          {name: 'venue', type: 'string', title: 'Venue'},
          {name: 'type', type: 'string', title: 'Type', options: {
            list: ['Solo', 'Group', 'Museum', 'Gallery', 'Fair']
          }}
        ]
      }]
    },
    {
      name: 'category',
      title: 'Primary Category',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'The primary category this creator works in'
    },
    {
      name: 'locations',
      title: 'Associated Locations',
      type: 'array',
      of: [{
        type: 'reference',
        to: [{type: 'location'}]
      }],
      description: 'Studios, galleries, museums, or shops associated with this creator'
    },
    {
      name: 'artworks',
      title: 'Featured Artworks',
      type: 'array',
      of: [{
        type: 'reference',
        to: [{type: 'artwork'}]
      }],
      description: 'Key artworks by this creator to showcase'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96
      }
    }
  ],
  preview: {
    select: {
      title: 'name',
      nationality: 'nationality',
      birthYear: 'birthYear',
      category: 'category.title',
      media: 'image'
    },
    prepare(selection) {
      const { title, nationality, birthYear, category, media } = selection
      const subtitle = [category, nationality, birthYear].filter(Boolean).join(' • ')
      return {
        title,
        subtitle,
        media
      }
    }
  }
} 