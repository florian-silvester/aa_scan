import {TitleCaseInput} from '../components/TitleCaseInput.jsx'

export default {
  name: 'material',
  title: 'Material',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Material Name',
      type: 'object',
      validation: Rule => Rule.required(),
      description: 'e.g., Gold, Silver, Bronze, Ceramic, Wood',
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
      name: 'materialType',
      title: 'Material Type',
      type: 'reference',
      to: [{type: 'materialType'}],
      description: 'Select a material type. Use the "+" button to create new material types if needed.'
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
      description: 'Number of artworks using this material (from analysis)',
      readOnly: true
    }
  ],
  preview: {
    select: {
      nameEn: 'name.en',
      nameDe: 'name.de',
      materialTypeEn: 'materialType.name.en',
      materialTypeDe: 'materialType.name.de'
    },
    prepare({nameEn, nameDe, materialTypeEn, materialTypeDe}) {
      const title = nameEn || nameDe || 'Untitled Material'
      const typeName = materialTypeEn || materialTypeDe
      const subtitle = typeName ? `Type: ${typeName}` : 'No type assigned'
      return {
        title,
        subtitle
      }
    }
  }
} 