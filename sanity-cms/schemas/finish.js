import {TitleCaseInput} from '../components/TitleCaseInput'

export default {
  name: 'finish',
  title: 'Finish',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Finish Name',
      type: 'object',
      validation: Rule => Rule.required(),
      description: 'e.g., Polished, Matte, Brushed, Patinated',
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
      description: 'Brief description of this finish type',
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
      description: 'Number of artworks using this finish (from analysis)',
      readOnly: true
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de'
    },
    prepare({nameEn, nameDe}) {
      const title = nameEn || nameDe || 'Untitled Finish'
      return {
        title,
        subtitle: `Finish: ${title}`
      }
    }
  }
} 