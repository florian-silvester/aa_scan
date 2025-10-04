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

async function deleteWithCleanup() {
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

    console.log('Starting deletion with reference cleanup...\n');

    let deletedArtworks = 0;
    let deletedCreators = 0;

    for (const creator of creatorsToDelete) {
      try {
        console.log(`Processing: ${creator.name} (${creator.artworkIds.length} artworks)`);
        
        // Step 1: Delete artworks using strong delete (removes all references)
        for (const artworkId of creator.artworkIds) {
          try {
            await sanityClient.delete(artworkId);
            deletedArtworks++;
          } catch (err) {
            // If regular delete fails, try to get more info
            console.log(`  ⚠️  Artwork ${artworkId} deletion issue: ${err.message.substring(0, 100)}`);
          }
        }

        // Step 2: Small delay to let references clear
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 3: Delete creator
        await sanityClient.delete(creator._id);
        deletedCreators++;
        console.log(`  ✓ Deleted creator\n`);

      } catch (error) {
        console.error(`  ✗ Failed to delete creator: ${error.message.substring(0, 150)}\n`);
      }
    }

    console.log('\n=== FINAL RESULTS ===');
    console.log(`✅ Deleted ${deletedCreators}/${creatorsToDelete.length} creators`);
    console.log(`✅ Deleted ${deletedArtworks}/${totalArtworks} artworks`);

    if (deletedCreators < creatorsToDelete.length) {
      console.log(`\n⚠️  ${creatorsToDelete.length - deletedCreators} creators could not be deleted`);
      console.log('This may be due to references from kept artworks or other documents.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteWithCleanup();

