export default {
  name: 'imageMarker',
  title: 'Image Group',
  type: 'object',
  fields: [
    {
      name: 'reference',
      title: 'Image Group Reference',
      type: 'string',
      options: {
        list: [
          {title: 'Images 1', value: 'images1'},
          {title: 'Images 2', value: 'images2'},
          {title: 'Images 3', value: 'images3'},
          {title: 'Images 4', value: 'images4'}
        ]
      },
      validation: Rule => Rule.required()
    }
  ],
  preview: {
    select: {
      reference: 'reference'
    },
    prepare({reference}) {
      const groupNum = reference?.match(/images(\d+)/)?.[1]
      return {
        title: groupNum ? `📷 Image Group ${groupNum}` : '📷 Image Group',
        subtitle: 'Images appear here'
      }
    }
  }
}

