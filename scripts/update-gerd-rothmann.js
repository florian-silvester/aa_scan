const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const client = createClient({
  projectId: 'b8bczekj',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-01-01',
  token: process.env.SANITY_API_TOKEN
});

function generateKey() {
  return crypto.randomBytes(8).toString('hex');
}

function textToBlocks(text) {
  return [{
    _key: generateKey(),
    _type: 'block',
    children: [{_key: generateKey(), _type: 'span', text: text}],
    markDefs: [],
    style: 'normal'
  }];
}

async function updateArticle() {
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'gerd-rothman'][0]{_id}`);
  
  if (!article) {
    console.log('Article not found');
    return;
  }
  
  console.log('Updating sections 2, 3, 4...');
  
  const update = {
    section2Text: {
      de: textToBlocks('Art Aurea: Die 1970er und 1980er Jahre waren durch eine Aufbruchstimmung geprägt, Schmuck auch als künstlerisches Medium zu nutzen. Wie haben Sie diese Zeit erlebt?\n\nGerd Rothmann: In den 1970er Jahren war die Akademie der bildenden Künste in München mein inspirierendes Umfeld. Der von der Akademie ausstrahlende Geist prägte meine Sichtweise. Ich musste mir die Frage stellen, was ich als Goldschmied entwickeln kann, das meinen ästhetischen Ansprüchen Stand hält. Daraus resultierte eine Kampfansage gegen die bürgerliche Schmuckästhetik. Ähnlich dachte auch Otto Künzli. Gemeinsam entwickelten wir unsere körperbezogenen Arbeiten. Der konstruktive Austausch führte 1982 zur gemeinsamen Ausstellung „Körperkultur".\n\nArt Aurea: Ist der zeitgenössische Schmuck als vitaler Bereich anspruchsvoller Gegenwartskunst etabliert?\n\nGerd Rothmann: Die Galerien und Handwerksmesse bestimmen den Markt. Der Kreis der Sammler wird größer. Ich denke aber, dass Schmuck immer angewandte Kunst ist. Ein wirklich interessantes Schmuckstück findet seinen eigenen Markt. Große Kunstmessen haben eine strenge Teilung zwischen bildender Kunst und Design. Im Bereich Design sind die Schmuckgalerien seriös etabliert.'),
      en: textToBlocks('Art Aurea: The 1970s and 1980s were distinguished by a mood of upheaval. How did you experience this epoch?\n\nGerd Rothmann: The Academy of Visual Arts in Munich was my inspiring environment in the 1970s. The spirit radiating from the Academy shaped my viewpoint and attitude toward art. I had to ask myself: What can I develop from my craft as a goldsmith that can satisfy my aesthetic standards? This led to a declaration of war against the bourgeois jewelry aesthetic. Otto Künzli thought similarly. Together we developed our body-related artworks. Our constructive sharing led to the exhibition "Body Culture" in 1982.\n\nArt Aurea: Has contemporary jewelry established itself as a vital discipline of sophisticated contemporary art?\n\nGerd Rothmann: The galleries and the annual crafts fair determine the jewelry market. The circle of collectors continues to grow. But I believe that jewelry is always an applied art. A genuinely interesting piece of jewelry will always find its market. Major art fairs are strictly subdivided between visual arts and design. The jewelry galleries are firmly established in the design field.')
    },
    section3Text: {
      de: textToBlocks('Art Aurea: In diesem Jahr bestücken Sie eine Einzelausstellung in der Galerie Handwerk. Was ist das Besondere daran?\n\nGerd Rothmann: Das Interessante ist, dass mein umfangreiches Archivmaterial – von den Anfängen bis zur Gegenwart – als Werkübersicht gezeigt wird. Die Zusammenarbeit mit der Galerie war sehr konstruktiv. Ich konnte die Räume persönlich gestalten. Es werden viele Zweitanfertigungen zu sehen sein. Die Originale sind im engen Austausch mit dem Auftraggeber entstanden.\n\nArt Aurea: Die Körperabformungen sind eine Art Markenzeichen von Ihnen geworden. Was fasziniert Sie bis heute?\n\nGerd Rothmann: Über Schmuck im ursprünglichen Sinn nachzudenken und eine künstlerische Auseinandersetzung zu führen, war immer meine Motivation. Die Suche nach einem unmittelbaren, sinnlichen Zugang, nach einer Art Poesie, ist mein Thema.'),
      en: textToBlocks('Art Aurea: You are staging a one-man show at Galerie Handwerk this year. What is special about this show?\n\nGerd Rothmann: An interesting aspect is that my comprehensive archival materials—from the earliest beginnings to the present day—are displayed as an overview of my oeuvre. Collaboration with the gallery was very constructive. I was free to personally design each of the rooms. Many duplicates will be displayed. Each original was created in close connection with the individual who commissioned it.\n\nArt Aurea: The casts of body parts have become a kind of trademark for you. What continues to fascinate you today?\n\nGerd Rothmann: My motivations have always been to think deeply about jewelry in its original sense. My theme is the search for an immediate sensual access, for a kind of poetry.')
    },
    section4Text: {
      de: textToBlocks('Art Aurea: In den 1970er Jahren haben Sie auch mit Acryl experimentiert. Warum sind Sie zum Gold zurückgekommen?\n\nGerd Rothmann: Gold ist doch in jeder Hinsicht das Beste vom Besten, es ist die absolute Krönung! In den 1980er Jahren entdeckte ich auf einem Zinnsymposium die spezifische Qualität von Zinn: seine faszinierende grausilbrige Farbe und die einfache Gusstechnik. Der direkte Umgang mit diesem Metall war ein Schlüsselerlebnis. Man kann alles Mögliche abformen und sofort gießen, man hat relativ schnell Ergebnisse. Nach dem kostbaren Gold habe ich mit Zinn ein zweites Material für mich entdeckt.\n\nGerd Rothmann, geboren 1941 in Frankfurt am Main, lebt und arbeitet seit 1967 in München. 1990 erhielt er den Ersten Preis der Dannen-Stiftung München, 2008 den Bayerischen Staatspreis.'),
      en: textToBlocks('Art Aurea: You also experimented with acrylic in the 1970s. Why have you returned to gold?\n\nGerd Rothmann: In every respect, gold is simply the best of the best. It is the absolute crowning! I discovered the specific quality of tin at a tin symposium in the 1980s. The metal has a fascinating grayish-silver color and its low melting point makes it uncommonly easy to cast. Working directly with this metal was a key experience. One can make casts of every conceivable object and see the results relatively soon. After precious gold, I discovered tin as a second material for me.\n\nGerd Rothmann was born in 1941 in Frankfurt am Main and lives and works in Munich since 1967. In 1990 he received the First Prize from the Dannen Foundation Munich, in 2008 the Bavarian State Prize.')
    }
  };
  
  await client.patch(article._id).set(update).commit();
  console.log('✅ All sections updated successfully!');
  console.log('Article "Gerd Rothmann" is now complete with full bilingual interview content.');
}

updateArticle().catch(console.error);

