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
  const article = await client.fetch(`*[_type == 'article' && slug.current match '*mueller*'][0]{_id, name}`);
  
  if (!article) {
    console.log('Article not found');
    return;
  }
  
  console.log(`Updating ${article.name?.en || 'Müller'} article...`);
  
  const update = {
    heroHeadline: {
      de: textToBlocks('Gelungene Vereinigung'),
      en: textToBlocks('Successful Union')
    },
    intro: {
      de: textToBlocks('Sabine Müller macht Schmuck. Ihr Mann Felix wurde mit originellen Metallobjekten bekannt. Das Ende ihres Studiums in Halle an der Saale und die gemeinsamen Ateliergründung in Schielo fiel mit dem Fall der Mauer und der Wiedervereinigung Deutschlands zusammen. 1989 öffnete sich nach der friedlichen Revolution im Osten die Mauer zwischen beiden Teilen Deutschlands.'),
      en: textToBlocks('Sabine Müller makes jewelry. Her husband Felix earned fame with imaginative metal objects. The end of their studies in Halle an der Saale and the co-founding of their atelier in Schielo coincided with the fall of the Berlin Wall and the reunification of Germany. After the peaceable revolution in Eastern Europe, the wall that had divided Germany opened in 1989.')
    },
    section1Text: {
      de: textToBlocks('Sabine Müller, geboren 1963 in einem Dorf im Harz, hat als Kind gerne gespielt und aus Holz, Pappe und Blech Objekte gebaut. Die Lust am Schöpferischen hatte eine Goldschmiedeausbildung zur Folge. 1984 begann Sabine Müller in der Schmuckklasse an der Kunsthochschule Burg Giebichenstein in Halle zu studieren. An der „Burg" hatte sie das Glück, von zwei namhaften Professorinnen betreut zu werden. „Renate Heintze und Dorothea Prühl haben auf eigene, unnachahmliche Weise an ihren Stücken gearbeitet", sagt Sabine Müller. Dorothea Prühl zählt zu den wichtigsten SchmuckkünstlerInnen der Gegenwart. Direkt nach dem Studium entschied sie sich, Kollektionen zu entwickeln und seriell zu arbeiten.'),
      en: textToBlocks('Sabine Müller, who was born in a village in the Harz Mountains in 1963, played as a child and constructed objects from wood, cardboard and sheet metal. Her pleasure with creative pursuits prompted her to begin learning the goldsmith\'s craft. Sabine Müller began studying in the jewelry class at Burg Giebichenstein University of Art and Design in Halle in 1984. At the "Burg," she was lucky to have two renowned professors as her mentors: Renate Heintze and Dorothea Prühl. Dorothea Prühl ranks among the most important contemporary jewelry artists. After graduation, Sabine Müller decided to develop collections and to work serially.')
    },
    section2Text: {
      de: textToBlocks('Ihre Schmuckkollektion „boxes" erscheint konstruktivistisch, architektonisch und kubistisch, wogegen die „Becherlinge" einer verträumten Märchenwelt entsprungen sein könnten. Beide Serien behandeln das Wachstum. Die „Becherlinge" verkörpern organische Materie, Fruchtbarkeit, Vielfalt und Lust. Das Feminine der Becherlinge wird durch unterschiedliche Farben verstärkt. Manche Schmuckstücke sind kräftig orangerot, manche zart graublau. „Jedes sucht seine Trägerin", sagt Sabine Müller. Die „boxes" behandeln das Wachstum der Kristalle. In ihrer neuen Serie „snowy" werden Element beider Serien kombiniert: die geradlinige Architektur der boxes und die körnige Oberfläche der Schneebecherlinge.'),
      en: textToBlocks('Her "boxes" jewelry collection looks constructivist, architectonic and cubist, while her "Becherlinge" ("Little Cups") seem to have come from an enchanted fairytale world. Both series explore the theme of growth. The "Becherlinge" embody organic material, fertility, diversity and desire. Various colors accentuate the feminine quality of the "Becherlinge." Some pieces are vibrant orangey red, others delicately grayish blue. "Each seeks its wearer," Sabine Müller says. The "boxes" are inspired by the growth of crystals. Müller\'s new "snowy" series combines elements from both: the straight-lined architecture from "boxes" and the grainy surface texture of the "Schneebecherlinge."')
    },
    section3Text: {
      de: textToBlocks('Im Gegensatz zu seiner Frau hat Felix Müller keine Lehre gemacht, sondern direkt nach dem Abitur 1985 sein Studium im Bereich Metall/Email an der Burg Giebichenstein begonnen. Schon während der Schulzeit war er sehr an Musik interessiert. Das habe zu interessanten Verknüpfungen geführt, etwa zum Bau eines Klangobjektes beim Diplom. Seit 1990 baut Felix Müller nun in Schielo Metallobjekte. Seine Leuchten und Kaffeemaschinen sehen aus als seien sie für historische Science Fiction Filme entworfen. Begriffe wie Retro-Futurismus oder Steam Punk würden immer wieder im Zusammenhang mit seinen Arbeiten fallen. „Für mich ist es wichtig, den Entstehungsprozess selbst in der Hand zu haben – gestalterisch und handwerklich."'),
      en: textToBlocks('Unlike his wife, Felix Müller never apprenticed, but began studying metals and enamel at Burg Giebichenstein immediately after graduation from high school in 1985. He was already interested in music during his school years. This led to interesting connections: for example, it prompted him to build a sound-making object as his diploma project. Felix Müller has made his metal objects in Schielo since 1990. His lamps and coffee machines look like props from vintage sci-fi movies. Ideas such as "retro futurism" or "steam punk" have often been mentioned in describing his work. "For me, it\'s important to have control over the creative process – both as a designer and as a craftsman."')
    },
    section4Text: {
      de: textToBlocks('Seit 1990 lebt und arbeitet Sabine Müller mit ihrem Mann Felix in Schielo bei Harzgerode in Sachsen-Anhalt. Sie ist mit ihrem Schmuck längst in Galerien und Geschäften in ganz Westeuropa und sogar in den USA vertreten. Die ehemalige Hallenser Schmuckstudentin trägt einen nicht unwesentlichen Teil zur Existenz ihrer fünfköpfigen Familie bei. Nach ihrer Ausbildung im Sozialismus musste sich das Paar sofort in der Markwirtschaft behaupten. „Wir beide sind ja sehr vielfältig ausgebildet und haben inzwischen gut ausgestattete Werkstätten." Auch ein eigenes Geschäft war immer mal wieder im Gespräch, aber „da sei die abgelegene Position auf dem Land doch ganz gut", sagt Sabine Müller. Bei Felix Müller präsentiert er die frei entstandenen Objekte, die dann Kunden inspirieren, baugebundene Arbeiten in Auftrag zu geben.'),
      en: textToBlocks('She and her husband Felix have lived and worked in Schielo, near Harzgerode in Sachsen-Anhalt, since 1990. Her jewelry long ago found its way into galleries and stores throughout Western Europe and even in the USA. This erstwhile student of jewelry in Halle substantially contributes toward supporting her family of five. After studying under a socialist regime, the couple immediately had to survive in a free-market economy. "We\'re both diversely trained and we have well-equipped workshops." The Müllers frequently talked about founding their own store, but their remote location in the countryside is favorable, Sabine Müller says. Felix Müller shows freely created objects at trade fairs and exhibitions, where they inspire customers to commission him to make objects associated with architecture.')
    }
  };
  
  await client.patch(article._id).set(update).commit();
  console.log('✅ Felix & Sabine Müller article updated!');
}

updateArticle().catch(console.error);

