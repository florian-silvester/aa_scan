import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config();

const sanityClient = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-12-01',
  token: process.env.SANITY_API_TOKEN,
});

async function analyzeReferences() {
  try {
    // Get one of the failed creators
    const creator = await sanityClient.fetch(`
      *[_type == "creator" && name == "Barbara Nanning"][0] {
        _id,
        name,
        "referencedBy": *[references(^._id)] {
          _type,
          _id,
          name,
          title
        }
      }
    `);

    console.log('Creator:', creator.name);
    console.log('Referenced by:');
    creator.referencedBy.forEach(ref => {
      console.log(`  - ${ref._type}: ${ref.name || ref.title || ref._id}`);
    });

    // Check one of the artworks
    const artwork = await sanityClient.fetch(`
      *[_type == "artwork" && creator._ref == "${creator._id}"][0] {
        _id,
        title,
        "referencedBy": *[references(^._id)] {
          _type,
          _id,
          name,
          title
        }
      }
    `);

    console.log('\nArtwork:', artwork.title);
    console.log('Referenced by:');
    artwork.referencedBy.forEach(ref => {
      console.log(`  - ${ref._type}: ${ref.name || ref.title || ref._id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeReferences();

