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
          type: 'string'
        },
        {
          name: 'caption',
          title: 'Caption',
          type: 'string'
        }
      ]
    },
    {
      name: 'name',
      title: 'Location Name',
      type: 'string',
      group: 'main',
      validation: Rule => Rule.required()
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
      type: 'text',
      group: 'contact',
      rows: 2,
      description: 'e.g. "Tue-Sun 10 am-5 pm"'
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
      type: 'array',
      of: [{type: 'block'}],
      group: 'main'
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: {
        source: 'name',
        maxLength: 96
      }
    }
  ],
  preview: {
    select: {
      title: 'name',
      type: 'type',
      location: 'location',
      country: 'country',
      media: 'image'
    },
    prepare(selection) {
      const { title, type, location, country, media } = selection
      
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