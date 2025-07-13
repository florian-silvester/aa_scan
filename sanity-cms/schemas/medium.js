import {TitleCaseInput} from '../components/TitleCaseInput'

export default {
  name: 'medium',
  title: 'Medium',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Medium Name',
      type: 'object',
      validation: Rule => Rule.required(),
      description: 'e.g., Vase, Chair, Ring, Brooch, Necklace, Bracelet',
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
      description: 'Brief description of this medium type',
      fields: [
        {name: 'en', title: 'English', type: 'text'},
        {name: 'de', title: 'German', type: 'text'}
      ]
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
    },
    {
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Used for ordering in dropdowns (lower numbers appear first)',
      initialValue: 100
    },
    {
      name: 'usageCount',
      title: 'Usage Count',
      type: 'number',
      description: 'Number of artworks using this medium (from analysis)',
      readOnly: true
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de'
    },
    prepare({nameEn, nameDe}) {
      const title = nameEn || nameDe || 'Untitled Medium'
      return {
        title,
        subtitle: `Medium: ${title}`
      }
    }
  }
} 