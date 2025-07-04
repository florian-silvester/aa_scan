import {createClient} from '@sanity/client'

// Sanity client configuration
export const sanityClient = createClient({
  projectId: 'b8bczekj', // Your project ID
  dataset: 'production',
  useCdn: false, // Set to false for real-time updates
  apiVersion: '2023-12-01', // Use current date
  token: process.env.SANITY_API_TOKEN || '', // Set this in your .env file
})

// Helper functions for your Word processor
export const sanityHelpers = {
  // Create an article
  async createArticle(articleData) {
    return await sanityClient.create({
      _type: 'article',
      ...articleData
    })
  },

  // Create an artwork
  async createArtwork(artworkData) {
    return await sanityClient.create({
      _type: 'artwork',
      ...artworkData
    })
  },

  // Update an article
  async updateArticle(id, articleData) {
    return await sanityClient
      .patch(id)
      .set(articleData)
      .commit()
  },

  // Update an artwork
  async updateArtwork(id, artworkData) {
    return await sanityClient
      .patch(id)
      .set(artworkData)
      .commit()
  },

  // Find article by title
  async findArticleByTitle(titleEn) {
    return await sanityClient.fetch(
      `*[_type == "article" && titleEn == $title][0]`,
      { title: titleEn }
    )
  },

  // Find artwork by Image ID
  async findArtworkByImageId(imageId) {
    return await sanityClient.fetch(
      `*[_type == "artwork" && imageId == $imageId][0]`,
      { imageId }
    )
  },

  // Get all articles with their artworks
  async getAllArticlesWithArtworks() {
    return await sanityClient.fetch(`
      *[_type == "article"] {
        _id,
        titleEn,
        titleDe,
        author,
        date,
        introductionEn,
        introductionDe,
        "artworks": images[]-> {
          _id,
          imageId,
          workTitle,
          maker,
          categoryEn,
          categoryDe
        }
      }
    `)
  },

  // Batch create artworks with references to article
  async batchCreateArtworks(artworksData, articleId) {
    const artworks = await Promise.all(
      artworksData.map(async (artwork) => {
        const created = await this.createArtwork(artwork)
        return created._id
      })
    )

    // Update article with artwork references
    if (articleId && artworks.length > 0) {
      await this.updateArticle(articleId, {
        images: artworks.map(id => ({ _type: 'reference', _ref: id }))
      })
    }

    return artworks
  }
}

export default sanityClient 