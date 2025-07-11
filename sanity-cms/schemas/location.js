export default {
  name: 'location',
  title: 'Location',
  type: 'document',
  groups: [
    {name: 'main', title: 'Main Info'},
    {name: 'contact', title: 'Contact Details'},
    {name: 'meta', title: 'Metadata'},
  ],
  fields: [
    {
      name: 'image',
      title: 'Location Image',
      type: 'image',
      group: 'main',
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
    },
    {
      name: 'name',
      title: 'Location Name',
      type: 'object',
      group: 'main',
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
      name: 'type',
      title: 'Location Type',
      type: 'string',
      group: 'main',
      options: {
        list: [
          {title: 'Museum', value: 'museum'},
          {title: 'Shop / Gallery', value: 'shop-gallery'},
          {title: 'Studio', value: 'studio'}
        ],
        layout: 'radio'
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'country',
      title: 'Country',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required()
    },
    {
      name: 'location',
      title: 'City/Location',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required()
    },
    {
      name: 'address',
      title: 'Address',
      type: 'text',
      group: 'contact',
      rows: 3
    },
    {
      name: 'times',
      title: 'Opening Times',
      type: 'object',
      group: 'contact',
      description: 'Opening hours in both languages',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'text',
          rows: 2,
          description: 'e.g. "Tue-Sun 10 am-5 pm"'
        },
        {
          name: 'de',
          title: 'German',
          type: 'text',
          rows: 2,
          description: 'e.g. "Di-So 10-17 Uhr"'
        }
      ]
    },
    {
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'contact'
    },
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'contact',
      validation: Rule => Rule.email()
    },
    {
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'contact'
    },
    {
      name: 'description',
      title: 'Description',
      type: 'object',
      group: 'main',
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
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: {
        source: 'name.en',
        maxLength: 96
      }
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      type: 'type',
      location: 'location',
      country: 'country',
      media: 'image'
    },
    prepare(selection) {
      const { nameEn, nameDe, type, location, country, media } = selection
      
      const title = nameEn || nameDe || 'Untitled Location'
      
      // Format type for display
      const typeDisplay = {
        'museum': 'Museum',
        'shop-gallery': 'Shop/Gallery',
        'studio': 'Studio'
      }[type] || type
      
      // Create subtitle with location info
      const locationInfo = [location, country].filter(Boolean).join(', ')
      const subtitle = `${typeDisplay} - ${locationInfo}`
      
      return {
        title: title,
        subtitle: subtitle,
        media: media
      }
    }
  }
} 