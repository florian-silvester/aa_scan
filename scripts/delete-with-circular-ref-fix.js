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

const profilesToKeep = [
  "Ute Kathrin Beck", "Thomas Bohle", "Patrizia Bonati", "Bosna Quilt Werkstatt",
  "Dorothea Brill", "Beate Brinkmann", "burggrafburggraf", "Hans Coper",
  "Sarah Cossham", "Carl Dau", "Martina Dempf", "Georg Dobler",
  "Pippin Drysdale", "Martina Ege", "Beate Eismann", "Susanne Elstner",
  "Emquies-Holstein", "Sophia Epp", "Renate Erlacher", "Pura Ferreiro",
  "Fine Light", "Anne Fischer", "Formfeld", "Bettina Geistlich",
  "Corinna Heller", "Batho Gündra", "Bernard Heesen", "Emil Heger",
  "Sebastian Hepp", "Leen Heyne", "Mirjam Hiller", "Tomáš Hlavička",
  "Claudia Hoppe", "Angela Hübel", "Kap-Sun Hwang", "Koichi Io",
  "JaKyung Shin", "Angelika Jansen", "Isezaki Jun", "Anne Ute Kaden",
  "Si-Sook Kang", "Ulla & Martin Kaufmann", "Deok Ho Kim", "Dong-Hyun Kim",
  "Sung Chul Kim", "Robert Korsikowski", "Susanna Kuschek", "Dominique Labordery",
  "Lut Laleman", "Kristiina Lassus", "Annette Lechler", "In Hwa Lee",
  "Jeong Won Lee", "Minsoo Lee", "Ria Lins", "Sabine Lintzen",
  "Morten Lobner Espersen", "Christof Lungwitz", "Lyk Carpet", "Iris Merkle",
  "Gigi Mariani", "Massimo Micheluzzi", "Claudia Milić", "Ritsue Mishima",
  "Felicia Mülbaier", "Julia Münzing (Schmuque)", "Johannes Nagel", "Aino Nebel",
  "neyuQ ceramics / Quyen Mac", "Niessing", "Kazuko Nishibayashi", "Heide Nonnenmacher",
  "Johanna Otto", "Kay Eppi Nölke", "Joo Hyung Park", "Noon Passama",
  "Gitta Pielcke", "Thomas Pildner", "Ulrike Poelk", "Martin Potsch",
  "Stefanie Prießnitz", "Ulrike Ramin", "Cornelius Réer", "Lotte Reimers",
  "Lucie Rie", "Jochen Rüth", "Elke Sada", "Kathrin Sättele",
  "Nikolay Sardamov", "Nils Schmalenbach", "Claudia Schoemig", "Oliver Schmidt",
  "Johanna Schweizer", "Ulrike Scriba", "Sian Design", "Siebörger Handweberei (Anja Ritter)",
  "Bibi Smit", "Laurenz Stockner", "Eva Strepp", "Dagmar Stühler",
  "Elisa Stützle-Siegsmund", "Jutta Ulland", "Tora Urup", "Hirsch – Woodenheart",
  "Gabi Veit", "Monika Vesely", "Peter Vogel", "Asta Volkensfeld",
  "Edmund de Waal", "Christine Wagner", "Nicole Walger", "Dorothee Wenz",
  "Babette Wiezorek", "Tapio Wirkkala"
];

function normalizeName(name) {
  return name.toLowerCase().trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss').replace(/š/g, 's')
    .replace(/[,\-–—()\/\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function deleteWithCircularRefFix() {
  try {
    console.log('Fetching creators...\n');
    
    const allCreators = await sanityClient.fetch(`
      *[_type == "creator"] {
        _id,
        name,
        "artworkIds": *[_type == "artwork" && references(^._id)]._id
      }
    `);

    const keepMap = new Map();
    profilesToKeep.forEach(name => keepMap.set(normalizeName(name), name));

    const creatorsToDelete = allCreators.filter(c => !keepMap.has(normalizeName(c.name)));

    console.log(`Creators to delete: ${creatorsToDelete.length}`);
    let totalArtworks = creatorsToDelete.reduce((sum, c) => sum + c.artworkIds.length, 0);
    console.log(`Artworks to delete: ${totalArtworks}\n`);

    console.log('STEP 1: Clearing artworks array from creators...\n');
    
    let clearedRefs = 0;
    for (const creator of creatorsToDelete) {
      try {
        // Clear the artworks array to break circular reference
        await sanityClient
          .patch(creator._id)
          .set({ artworks: [] })
          .commit();
        clearedRefs++;
        console.log(`  ✓ Cleared references from: ${creator.name}`);
      } catch (error) {
        console.log(`  ⚠️  Failed to clear ${creator.name}: ${error.message.substring(0, 80)}`);
      }
    }

    console.log(`\nCleared ${clearedRefs}/${creatorsToDelete.length} creator reference arrays\n`);
    console.log('Waiting 2 seconds for Sanity to process...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('STEP 2: Deleting artworks...\n');

    let deletedArtworks = 0;
    for (const creator of creatorsToDelete) {
      for (const artworkId of creator.artworkIds) {
        try {
          await sanityClient.delete(artworkId);
          deletedArtworks++;
        } catch (err) {
          console.log(`  ⚠️  Artwork ${artworkId} failed: ${err.message.substring(0, 80)}`);
        }
      }
      if (creator.artworkIds.length > 0) {
        console.log(`  ✓ Deleted ${creator.artworkIds.length} artworks from: ${creator.name}`);
      }
    }

    console.log(`\nDeleted ${deletedArtworks}/${totalArtworks} artworks\n`);
    console.log('Waiting 2 seconds for Sanity to process...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('STEP 3: Deleting creators...\n');

    let deletedCreators = 0;
    for (const creator of creatorsToDelete) {
      try {
        await sanityClient.delete(creator._id);
        deletedCreators++;
        console.log(`  ✓ Deleted: ${creator.name}`);
      } catch (error) {
        console.error(`  ✗ Failed: ${creator.name} - ${error.message.substring(0, 100)}`);
      }
    }

    console.log('\n=== FINAL RESULTS ===');
    console.log(`✅ Cleared references: ${clearedRefs}/${creatorsToDelete.length}`);
    console.log(`✅ Deleted artworks: ${deletedArtworks}/${totalArtworks}`);
    console.log(`✅ Deleted creators: ${deletedCreators}/${creatorsToDelete.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteWithCircularRefFix();

