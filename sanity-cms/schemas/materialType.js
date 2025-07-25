import {TitleCaseInput} from '../components/TitleCaseInput.jsx'

export default {
  name: 'materialType',
  title: 'Material Type',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Type Name',
      type: 'object',
      validation: Rule => Rule.required(),
      description: 'e.g., Metals, Stones & Minerals, Organic',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'string',
          validation: Rule => Rule.required(),
          components: {
            input: TitleCaseInput
          }
        },
        {
          name: 'de',
          title: 'German',
          type: 'string',
          validation: Rule => Rule.required(),
          components: {
            input: TitleCaseInput
          }
        }
      ]
    },
    {
      name: 'description',
      title: 'Description',
      type: 'object',
      description: 'Brief description of this material type',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
    },
    {
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Order for display in dropdowns (lower numbers first)',
      initialValue: 100
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name.en',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    }
  ],
  orderings: [
    {
      title: 'Sort Order',
      name: 'sortOrder',
      by: [
        {field: 'sortOrder', direction: 'asc'},
        {field: 'name.en', direction: 'asc'}
      ]
    },
    {
      title: 'Name A-Z',
      name: 'nameAsc',
      by: [
        {field: 'name.en', direction: 'asc'}
      ]
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      sortOrder: 'sortOrder'
    },
    prepare({nameEn, nameDe, sortOrder}) {
      const title = nameEn || nameDe || 'Untitled Material Type'
      const subtitle = sortOrder ? `Sort: ${sortOrder}` : 'No sort order'
      return {
        title,
        subtitle
      }
    }
  }
} 