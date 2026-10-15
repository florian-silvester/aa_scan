// News: short, dated reports for the front page of the website: exhibitions,
// fairs, competitions, studio visits; not the magazine's own announcements.
// Not an archive: the newest shows first,
// and a report with an end date leaves the front page once that date has
// passed. Text and images are kept apart: each section has its own text and
// its own images, and the site sets them side by side.

export const NEWS_CATEGORIES = [
  {title: 'Exhibition', value: 'exhibition'},
  {title: 'Fair', value: 'fair'},
  {title: 'Competition / Award', value: 'competition'},
  {title: 'Studio visit', value: 'studio-visit'},
  {title: 'Workshop', value: 'workshop'},
  {title: 'Other', value: 'other'},
]

const bilingualString = (name, title, description) => ({
  name,
  title,
  type: 'object',
  description,
  fields: [
    {name: 'en', title: 'English', type: 'string'},
    {name: 'de', title: 'German', type: 'string'},
  ],
})

const block = {
  type: 'block',
  styles: [{title: 'Normal', value: 'normal'}],
  lists: [],
  marks: {
    decorators: [
      {title: 'Strong', value: 'strong'},
      {title: 'Emphasis', value: 'em'},
    ],
    annotations: [
      {
        name: 'link',
        type: 'object',
        title: 'Link',
        fields: [{name: 'href', type: 'url', title: 'URL'}],
      },
    ],
  },
}

const bilingualText = (name, title, description) => ({
  name,
  title,
  type: 'object',
  description,
  fields: [
    {name: 'en', title: 'English', type: 'array', of: [block]},
    {name: 'de', title: 'German', type: 'array', of: [block]},
  ],
})

/* An image with its caption and photographer. Captions follow the site's
   rule: commas between the parts, "Title, year, material, size". */
const captionedImage = {
  type: 'image',
  options: {hotspot: true},
  fields: [
    {
      name: 'caption',
      title: 'Caption',
      type: 'object',
      description: 'e.g. "Johanna Schweizer, Untitled, 1998, 38 × 39.5 cm". Commas between the parts.',
      fields: [
        {name: 'en', title: 'English', type: 'text', rows: 2},
        {name: 'de', title: 'German', type: 'text', rows: 2},
      ],
    },
    {
      name: 'credit',
      title: 'Photo credit',
      type: 'string',
      description: 'The photographer only, e.g. "def image, Berlin". The site writes "Photo:" before it.',
    },
  ],
}

export default {
  name: 'news',
  title: 'News',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'event', title: 'Dates & venue'},
    {name: 'connections', title: 'Connections'},
  ],
  fields: [
    {
      ...bilingualString(
        'title',
        'Title',
        'Short: who or what, and where. e.g. "Veronika Fabian im Goldschmiedehaus Hanau", "29th Berlin Zeughaus Fair". No dates and no sentence: the dates and the venue come from "Dates & venue" and show in small type under the title.',
      ),
      group: 'content',
      validation: (Rule) => [
        Rule.custom((value) => (value?.en || value?.de ? true : 'A title in at least one language')),
        Rule.custom((value) =>
          [value?.en, value?.de].some((t) => t && t.length > 60) ? 'Keep the title short, under 60 characters' : true,
        ).warning(),
      ],
    },
    {
      ...bilingualString(
        'shortTitle',
        'Short title',
        'For lists, rows and the front page, where the dates and place already sit under it: just who or what, e.g. "Veronika Fabian", "Clay II", "Nuremberg Studio Days". Without it they show the title.',
      ),
      group: 'content',
      validation: (Rule) =>
        Rule.custom((value) =>
          [value?.en, value?.de].some((t) => t && t.length > 30) ? 'Keep the short title under 30 characters' : true,
        ).warning(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: (doc) => doc.title?.en || doc.title?.de || '', maxLength: 96},
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'date',
      title: 'Date',
      type: 'datetime',
      group: 'content',
      description: 'Shown on the report; the newest report comes first.',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      options: {list: NEWS_CATEGORIES, layout: 'radio', direction: 'horizontal'},
      initialValue: 'exhibition',
    },
    {
      ...captionedImage,
      name: 'leadImage',
      title: 'Lead image',
      group: 'content',
      description: 'The first image of the report, also its image on the front page.',
    },
    {
      ...bilingualText('intro', 'Introduction', 'The opening paragraph, set large under the lead image.'),
      group: 'content',
    },
    {
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'content',
      description:
        'The report in parts, e.g. one per artist. Each part has its own text and its own images; the site sets the images beside the text, never between paragraphs.',
      of: [
        {
          name: 'newsSection',
          title: 'Section',
          type: 'object',
          fields: [
            bilingualString('heading', 'Heading', 'Optional, e.g. the artist\'s name.'),
            bilingualText('body', 'Text'),
            {name: 'images', title: 'Images', type: 'array', of: [captionedImage], options: {layout: 'grid'}},
          ],
          preview: {
            select: {heading: 'heading.en', headingDe: 'heading.de', media: 'images.0'},
            prepare: ({heading, headingDe, media}) => ({title: heading || headingDe || 'Section', media}),
          },
        },
      ],
    },

    // DATES & VENUE
    {
      name: 'venue',
      title: 'Venue',
      type: 'reference',
      group: 'event',
      to: [{type: 'location'}],
      weak: true,
      description: 'The gallery, museum or fair ground, if it is in Locations.',
    },
    {
      name: 'venueName',
      title: 'Venue name',
      type: 'string',
      group: 'event',
      description: 'When the venue is not in Locations, e.g. "Kühlhaus Berlin".',
    },
    {
      name: 'city',
      title: 'City',
      type: 'reference',
      group: 'event',
      to: [{type: 'city'}],
      weak: true,
    },
    {name: 'startDate', title: 'Opens', type: 'date', group: 'event'},
    {
      name: 'endDate',
      title: 'Closes',
      type: 'date',
      group: 'event',
      description: 'After this day the report leaves the front page. It stays online.',
    },
    {name: 'website', title: 'Website', type: 'url', group: 'event'},

    // CONNECTIONS
    {
      name: 'creators',
      title: 'Creators',
      type: 'array',
      group: 'connections',
      description: 'Creators in the report who have a profile; the report links to them.',
      of: [{type: 'reference', to: [{type: 'creator'}], weak: true}],
    },
    {
      name: 'links',
      title: 'Links for names',
      type: 'array',
      group: 'connections',
      description:
        'A list of names in the text ("…works by: Sharareh Aghaei (DE), Miriam Arentz (DE) and …") becomes a list on the site by itself, and every name with a profile links to it. For the others, add their website or Instagram here, the name written as in the text.',
      of: [
        {
          name: 'nameLink',
          title: 'Link',
          type: 'object',
          fields: [
            {name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required()},
            {name: 'url', title: 'Website or Instagram', type: 'url', validation: (Rule) => Rule.required()},
          ],
          preview: {select: {title: 'name', subtitle: 'url'}},
        },
      ],
    },
  ],
  orderings: [{title: 'Newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title.en', titleDe: 'title.de', date: 'date', venue: 'venue.name.en', venueName: 'venueName', media: 'leadImage'},
    prepare: ({title, titleDe, date, venue, venueName, media}) => ({
      title: title || titleDe || 'Untitled',
      subtitle: [date?.slice(0, 10), venue || venueName].filter(Boolean).join(', '),
      media,
    }),
  },
}
