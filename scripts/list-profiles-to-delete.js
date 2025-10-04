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
    .replace(/[,\-–—()\/\s]+/g, ' ') // Normalize all punctuation/spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
}

async function listProfilesToDelete() {
  try {
    console.log('Fetching all creators from Sanity...\n');
    
    // Fetch all creators
    const allCreators = await sanityClient.fetch(`
      *[_type == "creator"] {
        _id,
        name,
        "artworkCount": count(*[_type == "artwork" && references(^._id)])
      } | order(name asc)
    `);

    console.log(`Total creators in database: ${allCreators.length}`);
    console.log(`Creators to keep: ${profilesToKeep.length}\n`);

    // Create normalized keep set
    const keepMap = new Map();
    profilesToKeep.forEach(name => {
      keepMap.set(normalizeName(name), name);
    });

    // Find creators to delete
    const creatorsToDelete = allCreators.filter(creator => {
      return !keepMap.has(normalizeName(creator.name));
    });

    console.log(`\n=== CREATORS TO DELETE: ${creatorsToDelete.length} ===\n`);

    let totalArtworks = 0;
    creatorsToDelete.forEach((creator, index) => {
      console.log(`${index + 1}. ${creator.name} (${creator.artworkCount} artworks)`);
      totalArtworks += creator.artworkCount;
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Creators to delete: ${creatorsToDelete.length}`);
    console.log(`Total artworks to delete: ${totalArtworks}`);
    console.log(`Creators to keep: ${allCreators.length - creatorsToDelete.length}`);

    // Check if any names from keep list are not found (using normalized matching)
    const normalizedDbCreators = new Map();
    allCreators.forEach(c => {
      normalizedDbCreators.set(normalizeName(c.name), c.name);
    });
    
    const notFoundInDb = profilesToKeep.filter(name => !normalizedDbCreators.has(normalizeName(name)));
    
    if (notFoundInDb.length > 0) {
      console.log(`\n=== WARNING: Names in keep list not found in database (even with normalization) ===`);
      notFoundInDb.forEach(name => console.log(`- ${name}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listProfilesToDelete();

