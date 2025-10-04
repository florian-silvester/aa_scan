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

// List of profiles to KEEP
const profilesToKeep = [
  "Ute Kathrin Beck",
  "Thomas Bohle",
  "Patrizia Bonati",
  "Bosna Quilt Werkstatt",
  "Dorothea Brill",
  "Beate Brinkmann",
  "burggrafburggraf",
  "Hans Coper",
  "Sarah Cossham",
  "Carl Dau",
  "Martina Dempf",
  "Georg Dobler",
  "Pippin Drysdale",
  "Martina Ege",
  "Beate Eismann",
  "Susanne Elstner",
  "Emquies-Holstein",
  "Sophia Epp",
  "Renate Erlacher",
  "Pura Ferreiro",
  "Fine Light",
  "Anne Fischer",
  "Formfeld",
  "Bettina Geistlich",
  "Corinna Heller",
  "Batho Gündra",
  "Bernard Heesen",
  "Emil Heger",
  "Sebastian Hepp",
  "Leen Heyne",
  "Mirjam Hiller",
  "Tomáš Hlavička",
  "Claudia Hoppe",
  "Angela Hübel",
  "Kap-Sun Hwang",
  "Koichi Io",
  "JaKyung Shin",
  "Angelika Jansen",
  "Isezaki Jun",
  "Anne Ute Kaden",
  "Si-Sook Kang",
  "Ulla & Martin Kaufmann",
  "Deok Ho Kim",
  "Dong-Hyun Kim",
  "Sung Chul Kim",
  "Robert Korsikowski",
  "Susanna Kuschek",
  "Dominique Labordery",
  "Lut Laleman",
  "Kristiina Lassus",
  "Annette Lechler",
  "In Hwa Lee",
  "Jeong Won Lee",
  "Minsoo Lee",
  "Ria Lins",
  "Sabine Lintzen",
  "Morten Lobner Espersen",
  "Christof Lungwitz",
  "Lyk Carpet",
  "Iris Merkle",
  "Gigi Mariani",
  "Massimo Micheluzzi",
  "Claudia Milić",
  "Ritsue Mishima",
  "Felicia Mülbaier",
  "Julia Münzing (Schmuque)",
  "Johannes Nagel",
  "Aino Nebel",
  "neyuQ ceramics / Quyen Mac",
  "Niessing",
  "Kazuko Nishibayashi",
  "Heide Nonnenmacher",
  "Johanna Otto",
  "Kay Eppi Nölke",
  "Joo Hyung Park",
  "Noon Passama",
  "Gitta Pielcke",
  "Thomas Pildner",
  "Ulrike Poelk",
  "Martin Potsch",
  "Stefanie Prießnitz",
  "Ulrike Ramin",
  "Cornelius Réer",
  "Lotte Reimers",
  "Lucie Rie",
  "Jochen Rüth",
  "Elke Sada",
  "Kathrin Sättele",
  "Nikolay Sardamov",
  "Nils Schmalenbach",
  "Claudia Schoemig",
  "Oliver Schmidt",
  "Johanna Schweizer",
  "Ulrike Scriba",
  "Sian Design",
  "Siebörger Handweberei (Anja Ritter)",
  "Bibi Smit",
  "Laurenz Stockner",
  "Eva Strepp",
  "Dagmar Stühler",
  "Elisa Stützle-Siegsmund",
  "Jutta Ulland",
  "Tora Urup",
  "Hirsch – Woodenheart",
  "Gabi Veit",
  "Monika Vesely",
  "Peter Vogel",
  "Asta Volkensfeld",
  "Edmund de Waal",
  "Christine Wagner",
  "Nicole Walger",
  "Dorothee Wenz",
  "Babette Wiezorek",
  "Tapio Wirkkala"
];

// Normalize name: convert umlauts to their alternate spellings, ignore punctuation
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/š/g, 's')
    .replace(/[,\-–—()\/\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function deleteCreatorsAndArtworks() {
  try {
    console.log('Fetching all creators from Sanity...\n');
    
    const allCreators = await sanityClient.fetch(`
      *[_type == "creator"] {
        _id,
        name,
        "artworks": *[_type == "artwork" && references(^._id)]._id
      } | order(name asc)
    `);

    const keepMap = new Map();
    profilesToKeep.forEach(name => {
      keepMap.set(normalizeName(name), name);
    });

    const creatorsToDelete = allCreators.filter(creator => {
      return !keepMap.has(normalizeName(creator.name));
    });

    console.log(`Total creators: ${allCreators.length}`);
    console.log(`Creators to KEEP: ${allCreators.length - creatorsToDelete.length}`);
    console.log(`Creators to DELETE: ${creatorsToDelete.length}`);
    
    let totalArtworksToDelete = 0;
    creatorsToDelete.forEach(creator => {
      totalArtworksToDelete += creator.artworks.length;
    });
    
    console.log(`Total artworks to DELETE: ${totalArtworksToDelete}\n`);

    console.log('\n🗑️  Starting deletion process...\n');

    let deletedArtworks = 0;
    let deletedCreators = 0;

    // Delete in batches to avoid overwhelming the API
    const batchSize = 10;
    
    for (let i = 0; i < creatorsToDelete.length; i += batchSize) {
      const batch = creatorsToDelete.slice(i, i + batchSize);
      
      for (const creator of batch) {
        try {
          // Delete all artworks for this creator
          if (creator.artworks.length > 0) {
            console.log(`Deleting ${creator.artworks.length} artworks for: ${creator.name}`);
            
            for (const artworkId of creator.artworks) {
              await sanityClient.delete(artworkId);
              deletedArtworks++;
            }
          }

          // Delete the creator
          console.log(`Deleting creator: ${creator.name}`);
          await sanityClient.delete(creator._id);
          deletedCreators++;

        } catch (error) {
          console.error(`❌ Error deleting ${creator.name}:`, error.message);
        }
      }

      console.log(`\nProgress: ${Math.min(i + batchSize, creatorsToDelete.length)}/${creatorsToDelete.length} creators processed\n`);
    }

    console.log('\n✅ DELETION COMPLETE!');
    console.log(`Deleted ${deletedCreators} creators`);
    console.log(`Deleted ${deletedArtworks} artworks`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteCreatorsAndArtworks();

