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
  const article = await client.fetch(`*[_type == 'article' && slug.current match 'yukata-minegishi'][0]{_id}`);
  
  if (!article) {
    console.log('Article not found');
    return;
  }
  
  console.log('Updating Yukata Minegishi article...');
  
  const update = {
    heroHeadline: {
      de: textToBlocks('Ein japanischer Bauchmensch'),
      en: textToBlocks('A Japanese Gut Person')
    },
    intro: {
      de: textToBlocks('Yutaka Minegishi geht gerne auf Flohmärkte. Er kauft Dinge, weil sie eine interessante Form oder eine schöne Oberfläche haben. Aufgewachsen ist er in dem Bewusstsein, dass Dinge eine Geschichte und einen ästhetischen Wert haben. Schon sein Vater hat Antiquitäten gesammelt, der Großvater und der Onkel waren Keramiker.'),
      en: textToBlocks('Yutaka Minegishi likes to go to flea markets, buying objects because they have an interesting shape or an appealing surface texture. He grew up aware of the fact that objects have a history and an intrinsic aesthetic value. His father collected antiques, and both his grandfather and uncle were potters.')
    },
    section1Text: {
      de: textToBlocks('Yutaka Minegishi: Braune Büffelhornbrille, blauer Pullover, 45 Jahre alt, 23 davon lebt er in Deutschland. Ein eher ruhiger Mensch, der aber nicht ungern spricht. Seine Art zu Reden korrespondiert eher mit seinem Schmuck als mit der Wohnungseinrichtung: Überflüssiges hat in seinen Ringen keinen Platz, das Motto lautet „Reduktion". Schmuck wird oft aus mehreren Einzelteilen gebaut. Minegishi geht den umgekehrten Weg: Wie ein Bildhauer arbeitet er die Form aus einem einzigen Stück massiven Materials heraus. Das kann ein grauer Achat, kristallklarer Bergkristall, gelb-weißer Mammut-Zahn oder pechschwarzer Gagat sein. Seine Ringe wirken zeitlos, manche könnten auch als Antiquitäten durchgehen.'),
      en: textToBlocks('Yutaka Minegishi: brown buffalo horn glasses, blue sweater, 45 years old, 23 of them living in Germany. A rather quiet person, who nevertheless isn\'t reluctant to talk. His manner of speaking is more in line with his jewelry than with his apartment\'s décor. There\'s no room for anything superfluous on his rings; his motto is "minimalism". Jewelry is often "built" from several individual parts. Minegishi takes the opposite approach, like a sculptor, carving a shape from a single piece of solid material, such as gray agate, crystal-clear rock crystal, yellowish-white mammoth tooth or pitch-black jet. His rings radiate a timeless aura.')
    },
    section2Text: {
      de: textToBlocks('Die Art der Herstellung kann man geradezu archaisch nennen. Seine wichtigsten Werkzeuge sind Säge, Messer und Feile. 500 verschiedene Feilen hat er zur Wahl. Was nach der Bearbeitung übrig bleibt, ist eine minimalistische Form. Minegishi mag keinen Schmuck, der „zu viel spricht". Doch bei allem Minimalismus: Am Ende gibt es irgendein spielerisches Detail. Die Formen entstehen ohne jede Zielvorstellung und ganz spontan, es gibt weder eine Zeichnung, noch ein Modell. Minegishi sägt und feilt einfach drauf los, aus dem Gefühl heraus, getragen von der jeweiligen Tagesstimmung. Ein Ring, den er gestern gemacht hat, würde heute ganz anders werden.'),
      en: textToBlocks('His crafting methodology could almost be termed archaic. His most important tools are saws, knives and files, with no less than 500 different of the latter to choose from. What remains when he has finished working on a piece is a minimalist shape. Minegishi doesn\'t like jewelry "that communicates too much". Yet despite all his minimalism, there\'s always some playful detail. What\'s interesting is the fact that he crafts his shapes spontaneously, without having a preconceived idea, nor a preliminary drawing or model. Minegishi simply starts sawing and filing away, following his instincts and guided by his mood of the day.')
    },
    section3Text: {
      de: textToBlocks('Yutaka Minegishi hat sich ganz auf Ringe spezialisiert. Er empfindet sie als besonders persönlich: Man trägt sie nicht nur am Revers oder über dem T-Shirt, sondern direkt auf der Haut. Er selbst bezeichnet sich als Bauchmensch, ganz dem Gefühl folgend. Ein japanischer Bauchmensch? Ja! Irgendwie fand ich es immer blöd, als Japaner das Japanische so nach außen zu kehren, ich wollte nicht den Exoten spielen. Ausgebildet wurde Yutaka Minegishi am Hiko Mizuno College of Jewelry in Tokio. Eines Tages hörte er einen Vortrag von Professor Otto Künzli – und war beeindruckt. Er beschloss, nach Deutschland zu gehen und kam an die Münchner Kunstakademie.'),
      en: textToBlocks('Yutaka Minegishi specializes entirely in rings, which he considers particularly personal items, because a ring is not worn on a lapel or on a T-shirt, but directly on a finger. He refers to himself as a gut person, always following his gut feeling. A Japanese gut person? Yes! Clichés don\'t go down well with him. "I didn\'t want to play the exotic alien." Yutaka Minegishi qualified at the Hiko Mizuno College of Jewelry in Tokyo. One day he attended a lecture held by Professor Otto Künzli – and was impressed. He decided to go to Germany and was accepted into Künzli\'s jewelry class at Munich\'s Academy of Fine Arts.')
    },
    section4Text: {
      de: textToBlocks('Seit fast 20 Jahren arbeitet Yutaka Minegishi in einer Werkstattgemeinschaft mit Helen Britton und David Bielander. Die drei Schmuckkünstler kennen sich aus der Klasse von Künzli. Mit David spielt er auch gemeinsam in der bayerisch-japanischen Bluesband „Sasebo". Minegishi verbringt am wenigsten Zeit in der Werkstatt, manchmal arbeitet er wochenlang gar nicht, dann wieder mehrere Wochen am Stück, 14 Stunden täglich. Minegishi hat auch noch einen Job in einem Auktionshaus. Durch das feste Einkommen fühlt er sich freier. Humor und ein unkonventioneller, ja frecher Umgang mit Erwartungen, zieht sich auch durch Minegishis Schmuck. Da ist der „Schweinenasen-Ring" aus rosafarbenem Eosit. Oder der fleischfarbene „Popo-Ring". Selbst ein „Kaka-Ring" gehört ins Repertoire.'),
      en: textToBlocks('For almost 20 years now, he has been working in an atelier that he shares with Helen Britton and David Bielander with whom he became friends in Otto Künzli\'s class. Yutaka also plays with David in the Bavarian-Japanese Blues band Sasebo. Minegishi is the one who spends the least amount of time at the atelier, at times not working at all for weeks, and at others several weeks without interruption, 14 hours a day. Minegishi also has a job at an auction house. Thanks to the regular income, he feels more independent. Minegishi\'s sense of humor and his unconventional disregard for expectations are also evident in his jewelry, for example in his Pig\'s Snout ring or his Butt ring. He even crafted a Poo ring.')
    }
  };
  
  await client.patch(article._id).set(update).commit();
  console.log('✅ Yukata Minegishi article updated successfully!');
}

updateArticle().catch(console.error);

