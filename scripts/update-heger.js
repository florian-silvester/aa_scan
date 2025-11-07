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
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'emil-heger'][0]{_id}`);
  
  if (!article) {
    console.log('Article not found');
    return;
  }
  
  console.log('Updating Emil Heger article...');
  
  const update = {
    heroHeadline: {
      de: textToBlocks('Einfach stille Größe'),
      en: textToBlocks('Quite Simply Silent Magnitude')
    },
    intro: {
      de: textToBlocks('Wie lässt sich das dem Kunsthandwerk nicht immer zu Unrecht anhängende Image des zu Braven überwinden? Die Formforschungen des Keramikers aus Höhr-Grenzhausen geben eine Antwort. Die Idee des Einfachen knüpft sich in der Keramik allzu gern an Funktionelles: Dem besten Gebrauch entspreche die einfachste Form. Dass mit einfachen, gedrehten Formen aber Hochkomplexes sinnfällig und Abstraktes sinnlich werden kann, machen die Arbeiten Emil Hegers klar.'),
      en: textToBlocks('How can the artistic crafts, which are not always unjustly dismissed as too tame, contrive to shed this image? The experimental shapes created by this ceramist from Höhr-Grenzhausen provide an answer. Emil Heger\'s creations demonstrate that even highly complex, abstract ideas can be self-evidently reified in simple, wheel-thrown shapes and also appeal to our senses.')
    },
    section1Text: {
      de: textToBlocks('Fasziniert vom Phänomen des bloßen Werdens einer Form stellte er sich die Frage, ob es möglich wäre, gedrehte Keramik in statu nascendi zu präsentieren, also das Formwerden selbst ganz frisch und unmittelbar zu zeigen? Ohne dass der Keramiker „in der Folge japanisierte", war dieser Ansatz doch ein Nachhall aus Fernost. Das Belassen einer Form und der Spuren des Brandes, das Dulden, ja Bevorzugen von Ungleichmaß gehören ins Wesen japanischer Keramik – dem peniblen Perfektionismus Europas zuwider.'),
      en: textToBlocks('Fascinated by the phenomenon of a shape\'s creation, he asked himself whether it would be possible to present wheel-thrown ceramics in statu nascendi, i.e. to visualize the actual forming process. Although this question didn\'t prompt him to "Japanize" his work, this approach was nevertheless influenced by Far-Eastern ceramics. Leaving an object\'s shape and any firing marks as they are, as well as tolerating and even cherishing irregularities, is characteristic of Japanese potters – quite contrary to the perfectionism cultivated in Europe.')
    },
    section2Text: {
      de: textToBlocks('Nach Versuchen mit einer Art von action painting entwickelte Emil Heger hohe Röhren, Spindeln oder Bulben, die er in aufeinander gedrehten Abschnitten fertigte. In sachlicher Neutralität nannte er diese schlicht „Drehform". Die Objekte aus Steinzeug, unbegradigt, ungeglättet, „werdend", vermitteln den Aufwärtssog ihrer Drehspuren ebenso wie den ablaufenden Beguss aus meist matter, monochromer Engobe oder Glasur. Solcherart „Mögliche unter Möglichen" zu Gruppen und Installationen zu fügen, war dann sehr folgerichtig.'),
      en: textToBlocks('After experimenting with what can be compared to action painting, Heger developed tall tube-, spindle- and bulb-shaped objects that he crafted from individually thrown segments and simply christened "Thrown Shapes". The throwing marks on these unstraightened, unsmoothed and "evolving" stoneware objects impressively evoke the clay\'s upward motion while being thrown. The logical consequence was then to arrange these "possibilities among possibilities" into groups or as installations.')
    },
    section3Text: {
      de: textToBlocks('Machart wie Konzept behielt der Keramiker in der Folge bei. Form selbst dagegen findet sich nicht einfach mehr im Entstehungsprozess, sie wird erfunden. Emil Heger konzipiert heute seine nach dem Brand bis 180 cm hohen und bis zu 70 cm durchmessenden Spindelformen vollkommen akkurat. Er dreht kleine Modelle vorab, die er maßstäblich exakt ins Große überträgt. Die übergroßen Spindeln gewinnen in ihrem Sich-Dehnen und Sich-Wieder-Verjüngen auf seltsame Weise Anthropomorphes.'),
      en: textToBlocks('Heger continued to pursue this approach. His objects\' shapes are no longer simply a result of the forming process, but are invented instead. Nowadays, Heger precisely preconceives the shapes of his spindle-like creations, which, after firing, measure up to 180 cm in height and up to 70 cm in diameter. He first crafts small models, which he then accurately scales up. The expanding and contracting contours lend these oversized spindles a strangely anthropomorphic quality.')
    },
    section4Text: {
      de: textToBlocks('Doch eines ist ganz neu und anders: Wie nass glänzen sie in gedeckt-prächtigen Farben – noch immer fließend, monochrom, changierend – aber in Tönen, die es vorher hier nicht gab. Ein tonloser Farb-Chor. Sein chromatischer Klang als komponierte Gesellschaft im Raum, moduliert durch Stellung, Nähe und Abstand, wandelt die Einzelnen, dämpft diesen, erhöht jenen, harmoniert hier, dissoniert dort. Sie korrespondieren, kommunizieren, wie monotone Stimmen.'),
      en: textToBlocks('They feature something altogether new and different. Enhanced with subdued yet resplendent glazes that look as if they are still wet – their colors and hues are entirely new and can be described as a silent choir of colors. The chromatic melody of such a group of objects is modulated by their position, proximity and distance. Communicating in quieter or louder, harmonious or dissonant sounds, these identical objects tell us about their differences.')
    }
  };
  
  await client.patch(article._id).set(update).commit();
  console.log('✅ Emil Heger article updated!');
}

updateArticle().catch(console.error);

