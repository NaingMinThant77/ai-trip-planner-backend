/**
 * Editorial guide content for the Explore detail screen, one entry per seeded destination slug.
 *
 * `wiki` is an English Wikipedia article title; seed.ts resolves it to a Wikimedia Commons photo
 * once and stores the URL, so the app never calls Wikipedia at runtime. A title with no article
 * or no picture simply renders without a photo.
 *
 * Deliberately NO prices, opening hours or availability here (AGENTS.md rule 12): this is
 * "what it is and why go", written as suggestions. Booking entries are tips, not quotes.
 */
export type GuideItemSeed = { title: string; blurb: string; wiki?: string };

export type GuideSeed = {
  wiki: string;
  intro: string;
  places: GuideItemSeed[];
  restaurants: GuideItemSeed[];
  culture: GuideItemSeed[];
  food: GuideItemSeed[];
  stay: GuideItemSeed[];
  packing: string[];
};

export const GUIDES: Record<string, GuideSeed> = {
  kyoto: {
    wiki: 'Kyoto',
    intro:
      'Japan’s old capital packs more than a thousand temples and shrines into a city you can cross by bus. Go for the gardens and the food, stay for the quiet back streets.',
    places: [
      {
        title: 'Fushimi Inari Shrine',
        blurb:
          'Thousands of vermilion torii gates climbing a forested hill. Go early or late to beat the crowds.',
        wiki: 'Fushimi Inari-taisha',
      },
      {
        title: 'Kinkaku-ji',
        blurb: 'The Golden Pavilion, mirrored in its pond. A short visit, best on a clear day.',
        wiki: 'Kinkaku-ji',
      },
      {
        title: 'Arashiyama Bamboo Grove',
        blurb:
          'A towering bamboo path on the western edge of town, paired with the river and monkey park.',
        wiki: 'Arashiyama',
      },
      {
        title: 'Kiyomizu-dera',
        blurb: 'A hillside temple with a wooden stage and sweeping views over the city.',
        wiki: 'Kiyomizu-dera',
      },
    ],
    restaurants: [
      {
        title: 'Nishiki Market',
        blurb:
          'A narrow covered lane of pickles, tofu, skewers and sweets, known as Kyoto’s kitchen.',
        wiki: 'Nishiki Market',
      },
      {
        title: 'Pontocho Alley',
        blurb: 'A lantern-lit alley of small restaurants, many with river-view terraces in summer.',
        wiki: 'Pontochō',
      },
      {
        title: 'Gion district',
        blurb: 'Traditional teahouses and dining rooms in wooden machiya townhouses.',
        wiki: 'Gion',
      },
    ],
    culture: [
      {
        title: 'Tea ceremony',
        blurb: 'A slow, formal ritual around matcha. Many tea houses welcome beginners.',
        wiki: 'Japanese tea ceremony',
      },
      {
        title: 'Temple manners',
        blurb: 'Speak softly, remove shoes where asked, and skip photos in prayer halls.',
      },
      {
        title: 'Geiko and maiko',
        blurb:
          'Gion’s performers are working artists. Admire from a distance and never block or chase them for photos.',
        wiki: 'Geisha',
      },
    ],
    food: [
      {
        title: 'Kaiseki',
        blurb: 'A seasonal multi-course meal that is as much art as dinner.',
        wiki: 'Kaiseki',
      },
      {
        title: 'Matcha sweets',
        blurb: 'Uji matcha shows up in everything from soft serve to parfaits.',
        wiki: 'Matcha',
      },
      {
        title: 'Yudofu',
        blurb: 'Simple simmered tofu, a temple-town classic that is gentle and warming.',
        wiki: 'Yudofu',
      },
    ],
    stay: [
      {
        title: 'Book a ryokan early',
        blurb:
          'Cherry blossom (March–April) and autumn leaves (November) fill traditional inns months ahead.',
      },
      {
        title: 'Sleep near a station',
        blurb:
          'Around Kyoto Station or central Gion keeps buses and trains easy. Buses get crowded at peak times.',
      },
    ],
    packing: [
      'Comfortable slip-on shoes (many temples ask you to remove them)',
      'Light layers for changing weather',
      'Small coin purse for shrines and vending machines',
      'Compact umbrella for the June rains',
      'Tote bag, as public bins are rare',
      'eSIM or pocket Wi-Fi',
    ],
  },

  lisbon: {
    wiki: 'Lisbon',
    intro:
      'Hilly, tiled and sunlit. Ride the old trams, eat custard tarts at the counter, and take the train to the palaces of Sintra.',
    places: [
      {
        title: 'Belém Tower',
        blurb: 'A 16th-century riverside fortress, a symbol of the Age of Discovery.',
        wiki: 'Belém Tower',
      },
      {
        title: 'Alfama',
        blurb:
          'The oldest quarter: steep lanes, laundry lines, viewpoints and fado drifting from open doors.',
        wiki: 'Alfama',
      },
      {
        title: 'Jerónimos Monastery',
        blurb: 'A showpiece of Manueline stonework with a calm, carved cloister.',
        wiki: 'Jerónimos Monastery',
      },
      {
        title: 'Sintra day trip',
        blurb: 'Fairy-tale palaces in the hills, reachable by train from the city.',
        wiki: 'Sintra',
      },
    ],
    restaurants: [
      {
        title: 'Time Out Market',
        blurb: 'A big food hall where well-known local cooks run small counters under one roof.',
        wiki: 'Time Out Market',
      },
      {
        title: 'Pastéis de Belém',
        blurb:
          'The famous bakery that has been making custard tarts from a secret recipe for generations.',
        wiki: 'Pastéis de Belém',
      },
      {
        title: 'Bairro Alto',
        blurb: 'Small taverns by day, a busy bar crawl by night.',
        wiki: 'Bairro Alto',
      },
    ],
    culture: [
      {
        title: 'Fado',
        blurb: 'Portugal’s melancholy folk song, best heard in a small, quiet room.',
        wiki: 'Fado',
      },
      {
        title: 'Azulejos',
        blurb: 'Painted tiles cover churches, stations and house fronts across the city.',
        wiki: 'Azulejo',
      },
      {
        title: 'Miradouros',
        blurb:
          'Viewpoints are a social habit: grab a drink and watch the sunset over the rooftops.',
      },
    ],
    food: [
      {
        title: 'Pastel de nata',
        blurb: 'Flaky, caramelised custard tart. Dust with cinnamon and eat it warm.',
        wiki: 'Pastel de nata',
      },
      {
        title: 'Bacalhau',
        blurb: 'Salt cod, cooked in more ways than there are days in the year.',
        wiki: 'Bacalhau',
      },
      {
        title: 'Ginjinha',
        blurb: 'A sour-cherry liqueur served in tiny cups at hole-in-the-wall bars.',
        wiki: 'Ginjinha',
      },
    ],
    stay: [
      {
        title: 'Mind the hills',
        blurb: 'Alfama and Baixa are charming but steep. Check stairs and lifts before booking.',
      },
      {
        title: 'Reserve Sintra early in summer',
        blurb: 'Palace entry and trains get busy. Book timed entry ahead in the warm months.',
      },
    ],
    packing: [
      'Grippy, comfortable shoes for polished cobblestones',
      'Light layers for breezy evenings',
      'Sunscreen and sunglasses',
      'Type C/F power adapter',
      'Zipped day bag for crowded trams',
      'Refillable water bottle',
    ],
  },

  istanbul: {
    wiki: 'Istanbul',
    intro:
      'A city on two continents, where mosques, markets and ferries run side by side. Cross the Bosphorus by boat for the best city tour.',
    places: [
      {
        title: 'Hagia Sophia',
        blurb: 'A sixth-century dome that has served as church, mosque and museum.',
        wiki: 'Hagia Sophia',
      },
      {
        title: 'Sultan Ahmed (Blue) Mosque',
        blurb: 'Six minarets and thousands of blue İznik tiles inside.',
        wiki: 'Sultan Ahmed Mosque',
      },
      {
        title: 'Topkapı Palace',
        blurb: 'The Ottoman sultans’ residence, with courtyards, treasury and Bosphorus views.',
        wiki: 'Topkapı Palace',
      },
      {
        title: 'Basilica Cistern',
        blurb: 'A cool underground Byzantine reservoir held up by hundreds of columns.',
        wiki: 'Basilica Cistern',
      },
    ],
    restaurants: [
      {
        title: 'Grand Bazaar',
        blurb: 'A huge covered market, with tea houses and snack stalls inside.',
        wiki: 'Grand Bazaar, Istanbul',
      },
      {
        title: 'Karaköy',
        blurb: 'A waterfront district of third-wave cafés and modern meyhane taverns.',
        wiki: 'Karaköy',
      },
      {
        title: 'Spice Bazaar',
        blurb: 'Spices, Turkish delight, dried fruit and nearby breakfast spots.',
        wiki: 'Spice Bazaar',
      },
    ],
    culture: [
      {
        title: 'Mosque etiquette',
        blurb: 'Cover shoulders and knees, carry a scarf, and take your shoes off at the door.',
      },
      {
        title: 'Hammam',
        blurb: 'The Turkish bath ritual of steam, scrub and rest is a centuries-old tradition.',
        wiki: 'Turkish bath',
      },
      {
        title: 'Tea culture',
        blurb: 'Tea in small tulip glasses is offered everywhere. Accepting is polite.',
        wiki: 'Turkish tea',
      },
    ],
    food: [
      {
        title: 'Simit',
        blurb: 'A sesame-crusted bread ring sold from street carts at every corner.',
        wiki: 'Simit',
      },
      {
        title: 'Turkish breakfast',
        blurb: 'A spread of cheeses, olives, eggs, honey and bread shared by the table.',
        wiki: 'Turkish breakfast',
      },
      {
        title: 'Baklava',
        blurb: 'Layers of filo, nuts and syrup. Pistachio versions are the classic.',
        wiki: 'Baklava',
      },
    ],
    stay: [
      {
        title: 'Pick your base',
        blurb:
          'Sultanahmet suits first-timers who want the big sights on foot. Karaköy and Galata suit cafés and nightlife.',
      },
      {
        title: 'Get an Istanbulkart',
        blurb: 'One rechargeable card covers trams, metro, buses and ferries.',
      },
    ],
    packing: [
      'Modest clothing and a scarf for mosques',
      'Very comfortable walking shoes',
      'Layers, since it is windy by the water',
      'Type C/F power adapter',
      'Small notes for markets and tips',
      'Offline map',
    ],
  },

  'mexico-city': {
    wiki: 'Mexico City',
    intro:
      'Vast, green and layered with history. Come for the museums and murals, then eat your way from market stalls to tasting counters.',
    places: [
      {
        title: 'Zócalo',
        blurb: 'The giant main square ringed by the cathedral and National Palace.',
        wiki: 'Zócalo',
      },
      {
        title: 'Frida Kahlo Museum',
        blurb: 'The Blue House in Coyoacán, where the artist lived and worked.',
        wiki: 'Frida Kahlo Museum',
      },
      {
        title: 'Chapultepec',
        blurb: 'A huge park with a hilltop castle and several top museums.',
        wiki: 'Chapultepec',
      },
      {
        title: 'Teotihuacán',
        blurb: 'Ancient pyramids of the Sun and Moon, an easy day trip from the city.',
        wiki: 'Teotihuacan',
      },
    ],
    restaurants: [
      {
        title: 'Coyoacán Market',
        blurb: 'Tostadas, quesadillas and fresh juices in a classic neighbourhood market.',
        wiki: 'Coyoacán',
      },
      {
        title: 'Roma Norte',
        blurb: 'Tree-lined streets of modern Mexican restaurants, cafés and bakeries.',
        wiki: 'Roma, Mexico City',
      },
      {
        title: 'Street taquerías',
        blurb: 'The best tacos are often at the stand with the longest line of locals.',
      },
    ],
    culture: [
      {
        title: 'Day of the Dead',
        blurb: 'Late October to early November, with altars, marigolds and parades.',
        wiki: 'Day of the Dead',
      },
      {
        title: 'Mexican muralism',
        blurb: 'Rivera, Orozco and Siqueiros painted history on public walls.',
        wiki: 'Mexican muralism',
      },
      {
        title: 'Lucha libre',
        blurb: 'Masked wrestling with a loud, family-friendly crowd.',
        wiki: 'Lucha libre',
      },
    ],
    food: [
      {
        title: 'Tacos al pastor',
        blurb: 'Spit-roasted pork with pineapple, a Lebanese–Mexican fusion.',
        wiki: 'Al pastor',
      },
      {
        title: 'Mole',
        blurb: 'Rich, many-ingredient sauces, often with chocolate and chilli.',
        wiki: 'Mole sauce',
      },
      { title: 'Tamales', blurb: 'Steamed masa parcels, a common breakfast.', wiki: 'Tamale' },
    ],
    stay: [
      {
        title: 'Roma and Condesa',
        blurb: 'Walkable, leafy and full of restaurants. A good base for a first visit.',
      },
      {
        title: 'Book timed museum tickets',
        blurb: 'Popular museums such as the Frida Kahlo Museum sell out. Reserve ahead.',
      },
    ],
    packing: [
      'Layers, as nights are cool at altitude',
      'Light rain jacket for summer afternoon showers',
      'Sunscreen, since the sun is strong at 2,240 m',
      'Comfortable shoes',
      'Cross-body bag with a zip',
      'Take it easy on day one while you adjust to the altitude',
    ],
  },

  rome: {
    wiki: 'Rome',
    intro:
      'The city is an open-air museum. Walk between ancient ruins, baroque fountains and neighbourhood trattorias, and always take the side street.',
    places: [
      {
        title: 'Colosseum',
        blurb: 'The vast Roman amphitheatre. Combine with the Forum and Palatine Hill.',
        wiki: 'Colosseum',
      },
      {
        title: 'Pantheon',
        blurb: 'A 2,000-year-old temple with a perfect dome and a central oculus.',
        wiki: 'Pantheon, Rome',
      },
      {
        title: 'Trevi Fountain',
        blurb: 'A baroque landmark. It is busiest in the middle of the day.',
        wiki: 'Trevi Fountain',
      },
      {
        title: 'Vatican Museums',
        blurb: 'Galleries leading to the Sistine Chapel.',
        wiki: 'Vatican Museums',
      },
    ],
    restaurants: [
      {
        title: 'Trastevere',
        blurb: 'Ivy-covered lanes full of trattorias and lively evening bars.',
        wiki: 'Trastevere',
      },
      {
        title: 'Testaccio',
        blurb:
          'The old slaughterhouse district, home to traditional Roman cooking and a food market.',
        wiki: 'Testaccio',
      },
      {
        title: 'Campo de’ Fiori',
        blurb: 'A market square by morning and a social scene by night.',
        wiki: 'Campo de’ Fiori',
      },
    ],
    culture: [
      {
        title: 'Church dress code',
        blurb: 'Shoulders and knees covered in churches and the Vatican.',
      },
      {
        title: 'Aperitivo',
        blurb: 'An early-evening drink with snacks, a staple of Italian social life.',
        wiki: 'Aperitivo',
      },
      {
        title: 'Coffee at the bar',
        blurb: 'Locals drink espresso standing at the counter, which is also cheaper than a table.',
      },
    ],
    food: [
      {
        title: 'Carbonara',
        blurb: 'Eggs, pecorino, guanciale and pepper. Real versions have no cream.',
        wiki: 'Carbonara',
      },
      {
        title: 'Supplì',
        blurb: 'Fried rice balls with a molten mozzarella centre.',
        wiki: 'Supplì',
      },
      { title: 'Gelato', blurb: 'Look for natural colours and covered tubs.', wiki: 'Gelato' },
    ],
    stay: [
      {
        title: 'Pre-book the big three',
        blurb: 'The Colosseum, Vatican Museums and Borghese Gallery work best with reserved entry.',
      },
      {
        title: 'Choose character or convenience',
        blurb:
          'Monti and Trastevere are charming. Near Termini is handy for trains and airport links.',
      },
    ],
    packing: [
      'Cover-up for churches',
      'Shoes that handle cobblestones',
      'Refillable bottle, as free drinking fountains (nasoni) are everywhere',
      'Sun hat in summer',
      'Type L/F power adapter',
      'Light scarf',
    ],
  },

  marrakesh: {
    wiki: 'Marrakesh',
    intro:
      'A red city of walled gardens, riads and souks. Lose yourself in the medina, then slow down in a courtyard with mint tea.',
    places: [
      {
        title: 'Jemaa el-Fnaa',
        blurb:
          'The medina’s great square, quiet by day and full of food stalls and performers by night.',
        wiki: 'Jemaa el-Fnaa',
      },
      {
        title: 'Majorelle Garden',
        blurb: 'A cobalt-blue villa surrounded by cacti and bamboo.',
        wiki: 'Majorelle Garden',
      },
      {
        title: 'Bahia Palace',
        blurb: 'Decorated courtyards, painted ceilings and carved cedar.',
        wiki: 'Bahia Palace',
      },
      {
        title: 'Koutoubia Mosque',
        blurb: 'The 12th-century minaret that guides you around the medina.',
        wiki: 'Koutoubia',
      },
    ],
    restaurants: [
      {
        title: 'Jemaa el-Fnaa food stalls',
        blurb: 'Grilled meats, harira soup and orange juice as the sun goes down.',
      },
      {
        title: 'Medina rooftop cafés',
        blurb: 'Terraces above the souks that are good for a mint tea break.',
      },
      {
        title: 'Guéliz',
        blurb: 'The modern district with contemporary cafés and restaurants.',
        wiki: 'Guéliz',
      },
    ],
    culture: [
      {
        title: 'Souk bargaining',
        blurb:
          'Haggling is part of the fun. Smile, counter-offer, and walk away if it does not feel right.',
        wiki: 'Souk',
      },
      {
        title: 'Riad stays',
        blurb: 'Traditional houses built around a central courtyard, quiet behind plain doors.',
        wiki: 'Riad (architecture)',
      },
      {
        title: 'Respectful dress',
        blurb:
          'Lightweight clothes covering shoulders and knees are more comfortable and better received.',
      },
    ],
    food: [
      { title: 'Tagine', blurb: 'Slow-cooked stew served in a conical clay pot.', wiki: 'Tajine' },
      {
        title: 'Couscous',
        blurb: 'A Friday family dish, light and steamed with vegetables.',
        wiki: 'Couscous',
      },
      {
        title: 'Mint tea',
        blurb: 'Sweet green tea poured from height, a sign of hospitality.',
        wiki: 'Maghrebi mint tea',
      },
    ],
    stay: [
      {
        title: 'Ask for a pickup',
        blurb: 'Medina alleys are not on most maps. Ask your riad to meet you at a landmark.',
      },
      {
        title: 'Mind the heat',
        blurb: 'Summer is very hot. Spring and autumn are the most comfortable seasons.',
      },
    ],
    packing: [
      'Light, breathable clothes that cover shoulders and knees',
      'Scarf for sun and mosque visits',
      'Hat and sunscreen',
      'Sturdy sandals or flat shoes for uneven alleys',
      'Small notes for taxis and tips',
      'Offline map',
    ],
  },

  hanoi: {
    wiki: 'Hanoi',
    intro:
      'Motorbikes, French boulevards and food on every corner. The Old Quarter rewards early starts and a willingness to sit on a plastic stool.',
    places: [
      {
        title: 'Hoàn Kiếm Lake',
        blurb: 'The calm heart of the city, circled by walkers at sunrise.',
        wiki: 'Hoàn Kiếm Lake',
      },
      {
        title: 'Temple of Literature',
        blurb: 'Vietnam’s first university, with leafy courtyards and stone steles.',
        wiki: 'Temple of Literature, Hanoi',
      },
      {
        title: 'Ho Chi Minh Mausoleum',
        blurb: 'A solemn complex in Ba Đình Square with a strict dress code.',
        wiki: 'Ho Chi Minh Mausoleum',
      },
      {
        title: 'Hạ Long Bay',
        blurb: 'Limestone islands reached on a day trip or overnight cruise.',
        wiki: 'Hạ Long Bay',
      },
    ],
    restaurants: [
      {
        title: 'Old Quarter street food',
        blurb: 'Plastic stools, steaming pots, and one dish perfected per stall.',
      },
      {
        title: 'Đồng Xuân Market',
        blurb: 'A large covered market with snack stalls upstairs and down.',
        wiki: 'Đồng Xuân Market',
      },
      {
        title: 'Egg-coffee cafés',
        blurb: 'Tucked into old shophouses off the main lanes.',
        wiki: 'Egg coffee',
      },
    ],
    culture: [
      {
        title: 'Water puppetry',
        blurb: 'A northern Vietnamese art form with puppets performing on a pool.',
        wiki: 'Water puppetry',
      },
      {
        title: 'Crossing the road',
        blurb: 'Walk slowly and steadily; the motorbikes flow around you.',
      },
      {
        title: 'Coffee culture',
        blurb: 'Cà phê sữa đá, strong coffee with condensed milk over ice, is a daily ritual.',
        wiki: 'Vietnamese iced coffee',
      },
    ],
    food: [
      { title: 'Phở', blurb: 'The Hanoi version has a clear, aromatic beef broth.', wiki: 'Phở' },
      {
        title: 'Bún chả',
        blurb: 'Grilled pork with noodles and herbs, a lunchtime favourite.',
        wiki: 'Bún chả',
      },
      {
        title: 'Egg coffee',
        blurb: 'A whipped egg-yolk and coffee dessert drink invented in Hanoi.',
        wiki: 'Egg coffee',
      },
    ],
    stay: [
      {
        title: 'Choose a quiet room',
        blurb:
          'The Old Quarter is lively. Ask for a room away from the street if you are a light sleeper.',
      },
      {
        title: 'Book Hạ Long Bay with a reputable operator',
        blurb: 'Read recent reviews and confirm exactly what the itinerary includes.',
      },
    ],
    packing: [
      'Light, breathable clothing',
      'Compact rain poncho for the wet season',
      'Mosquito repellent',
      'Comfortable shoes with grip',
      'Light scarf for temples',
      'Small bills for street stalls',
    ],
  },

  reykjavik: {
    wiki: 'Reykjavík',
    intro:
      'A small, colourful city with enormous landscapes next door. Use it as a base for waterfalls, hot springs and the Golden Circle.',
    places: [
      {
        title: 'Hallgrímskirkja',
        blurb: 'A striking concrete church with a tower viewpoint over the rooftops.',
        wiki: 'Hallgrímskirkja',
      },
      {
        title: 'Golden Circle',
        blurb: 'Þingvellir, Geysir and Gullfoss, the classic day loop.',
        wiki: 'Golden Circle (Iceland)',
      },
      {
        title: 'Blue Lagoon',
        blurb: 'A milky-blue geothermal spa in a lava field near the airport.',
        wiki: 'Blue Lagoon (geothermal spa)',
      },
      {
        title: 'Harpa',
        blurb: 'The glass-faceted concert hall on the harbour.',
        wiki: 'Harpa (concert hall)',
      },
    ],
    restaurants: [
      {
        title: 'Bæjarins Beztu Pylsur',
        blurb: 'The harbourside hot dog stand that has been feeding locals for decades.',
        wiki: 'Bæjarins Beztu Pylsur',
      },
      {
        title: 'Kolaportið',
        blurb: 'A weekend flea market with a food section for dried fish and Icelandic treats.',
        wiki: 'Kolaportið',
      },
      { title: 'Old Harbour', blurb: 'Seafood restaurants close to where the catch comes in.' },
    ],
    culture: [
      {
        title: 'Swimming-pool culture',
        blurb: 'Locals soak in geothermal pools. Shower thoroughly without a swimsuit first.',
      },
      {
        title: 'Sagas',
        blurb: 'Medieval Icelandic stories are still a source of pride and place names.',
        wiki: 'Icelandic sagas',
      },
      {
        title: 'Northern lights and midnight sun',
        blurb: 'Dark winter nights for auroras, endless light in June.',
        wiki: 'Aurora',
      },
    ],
    food: [
      {
        title: 'Skyr',
        blurb: 'Thick, protein-rich dairy, eaten for breakfast or dessert.',
        wiki: 'Skyr',
      },
      { title: 'Kjötsúpa', blurb: 'A warming lamb and root vegetable soup.', wiki: 'Kjötsúpa' },
      {
        title: 'Hákarl',
        blurb: 'Fermented shark. Try a cube once as a rite of passage.',
        wiki: 'Hákarl',
      },
    ],
    stay: [
      {
        title: 'Reserve summer tours early',
        blurb: 'Popular tours and rental cars book up well ahead in June–August.',
      },
      {
        title: 'Allow for weather',
        blurb: 'Conditions change quickly. Keep a day or two flexible.',
      },
    ],
    packing: [
      'Waterproof shell and layers',
      'Swimsuit for hot springs',
      'Wool base layers',
      'Sturdy waterproof shoes',
      'Sunglasses for low winter sun',
      'Eye mask for midnight-sun nights',
    ],
  },

  queenstown: {
    wiki: 'Queenstown, New Zealand',
    intro:
      'New Zealand’s adventure capital sits on a lake ringed by mountains. Hike, ski, cruise to Milford Sound, or just watch the sunset from the shore.',
    places: [
      {
        title: 'Lake Wakatipu',
        blurb: 'The long, glacier-carved lake that anchors the town.',
        wiki: 'Lake Wakatipu',
      },
      {
        title: 'The Remarkables',
        blurb: 'A jagged range that is a ski field in winter and a hiking backdrop in summer.',
        wiki: 'The Remarkables',
      },
      {
        title: 'Milford Sound',
        blurb: 'A fiord with waterfalls and sheer cliffs, reached on a long day trip.',
        wiki: 'Milford Sound',
      },
      {
        title: 'Arrowtown',
        blurb: 'A preserved gold-rush village, lovely in autumn.',
        wiki: 'Arrowtown',
      },
    ],
    restaurants: [
      {
        title: 'Fergburger',
        blurb: 'A local institution known for big burgers and the queue that goes with them.',
        wiki: 'Fergburger',
      },
      {
        title: 'Gibbston Valley wineries',
        blurb: 'Cellar doors in the valley, known for pinot noir.',
        wiki: 'Gibbston',
      },
      { title: 'Lakefront cafés', blurb: 'Easy places for brunch with a view over the water.' },
    ],
    culture: [
      {
        title: 'Ngāi Tahu heritage',
        blurb: 'The region’s Māori iwi and place names tell a deeper story of the land.',
        wiki: 'Ngāi Tahu',
      },
      {
        title: 'Leave no trace',
        blurb: 'Carry out your rubbish and stick to marked tracks.',
        wiki: 'Leave No Trace',
      },
      {
        title: 'Huts and Great Walks',
        blurb: 'Famous walks use bookable huts run by the Department of Conservation.',
        wiki: 'Great Walks',
      },
    ],
    food: [
      {
        title: 'Central Otago pinot noir',
        blurb: 'The world’s southernmost major wine region.',
        wiki: 'Central Otago wine region',
      },
      {
        title: 'Hokey pokey ice cream',
        blurb: 'Vanilla with crunchy honeycomb, a Kiwi favourite.',
        wiki: 'Hokey pokey (ice cream)',
      },
      { title: 'Lamb', blurb: 'Local lamb is a staple on menus across the region.' },
    ],
    stay: [
      {
        title: 'Book Great Walks and Milford early',
        blurb: 'Huts and cruises can fill up months ahead of peak summer.',
      },
      {
        title: 'Sleep close to the lake',
        blurb: 'A central base keeps restaurants and pickups easy.',
      },
    ],
    packing: [
      'Layers for four seasons in a day',
      'Waterproof jacket',
      'Hiking boots',
      'Strong sunscreen, as UV is high',
      'Insect repellent for sandflies',
      'Reusable water bottle',
    ],
  },

  'cape-town': {
    wiki: 'Cape Town',
    intro:
      'Mountain, ocean and vineyards in one city. Ride the cable car, drive to the Cape, and spend a day in the winelands.',
    places: [
      {
        title: 'Table Mountain',
        blurb: 'The flat-topped landmark, reached by cable car or on foot.',
        wiki: 'Table Mountain',
      },
      {
        title: 'Robben Island',
        blurb: 'The former prison where Nelson Mandela was held, visited by ferry.',
        wiki: 'Robben Island',
      },
      {
        title: 'Cape of Good Hope',
        blurb: 'Dramatic cliffs and fynbos at the Cape Peninsula’s southwest tip.',
        wiki: 'Cape of Good Hope',
      },
      {
        title: 'V&A Waterfront',
        blurb: 'A working harbour turned shopping and dining district.',
        wiki: 'Victoria & Alfred Waterfront',
      },
    ],
    restaurants: [
      {
        title: 'Bo-Kaap',
        blurb: 'Brightly painted houses and Cape Malay home cooking.',
        wiki: 'Bo-Kaap',
      },
      {
        title: 'Stellenbosch',
        blurb: 'Winelands estates with long lunches among the vines.',
        wiki: 'Stellenbosch',
      },
      { title: 'Sea Point promenade', blurb: 'Cafés and sunset-watching along the Atlantic.' },
    ],
    culture: [
      {
        title: 'Heritage and history',
        blurb: 'Robben Island and District Six tell the story of apartheid and resistance.',
        wiki: 'District Six',
      },
      {
        title: 'Braai',
        blurb: 'South Africa’s social barbecue, more a gathering than a meal.',
        wiki: 'Braai',
      },
      {
        title: 'Cape Malay culture',
        blurb: 'A blend of cuisine, music and faith with roots in the 17th century.',
        wiki: 'Cape Malays',
      },
    ],
    food: [
      { title: 'Bobotie', blurb: 'Spiced minced meat baked with an egg topping.', wiki: 'Bobotie' },
      {
        title: 'Braai',
        blurb: 'Grilled meats and boerewors sausage over open coals.',
        wiki: 'Braai',
      },
      {
        title: 'Gatsby',
        blurb: 'A giant filled bread roll, the city’s favourite street sandwich.',
        wiki: 'Gatsby (sandwich)',
      },
    ],
    stay: [
      {
        title: 'Book the big two ahead',
        blurb:
          'Robben Island ferry tickets and Table Mountain cable car times sell quickly in season.',
      },
      {
        title: 'Use ride apps at night',
        blurb: 'Stay in well-visited areas and use taxis after dark.',
      },
    ],
    packing: [
      'Windbreaker, since Cape Town is windy',
      'Layers for changeable weather',
      'Sunscreen and hat',
      'Comfortable hiking shoes',
      'Type M/N power adapter',
      'Daypack for hikes',
    ],
  },

  vancouver: {
    wiki: 'Vancouver',
    intro:
      'A city between mountains and sea. Walk or cycle the seawall, eat well, and be on the ski slopes or in the rainforest within the hour.',
    places: [
      {
        title: 'Stanley Park',
        blurb: 'A forested peninsula with a seawall loop and totem poles.',
        wiki: 'Stanley Park',
      },
      {
        title: 'Granville Island',
        blurb: 'Studios, a public market and waterfront views.',
        wiki: 'Granville Island',
      },
      {
        title: 'Capilano Suspension Bridge',
        blurb: 'A swaying bridge over a rainforest canyon.',
        wiki: 'Capilano Suspension Bridge',
      },
      { title: 'Gastown', blurb: 'Historic cobbled streets and the steam clock.', wiki: 'Gastown' },
    ],
    restaurants: [
      {
        title: 'Granville Island Public Market',
        blurb: 'Fresh seafood, baked goods and artisan foods under one roof.',
        wiki: 'Granville Island Public Market',
      },
      {
        title: 'Chinatown',
        blurb: 'One of North America’s largest Chinatowns, with bakeries and tea houses.',
        wiki: 'Chinatown, Vancouver',
      },
      {
        title: 'Richmond dining',
        blurb: 'Excellent dim sum and regional Chinese cooking just outside the city.',
      },
    ],
    culture: [
      {
        title: 'Coast Salish and Indigenous art',
        blurb:
          'Carved poles and galleries across the city honour the First Nations whose land this is.',
        wiki: 'Coast Salish peoples',
      },
      { title: 'Outdoor lifestyle', blurb: 'Skiing, kayaking and hiking are part of daily life.' },
      {
        title: 'Multicultural food scene',
        blurb: 'Large East Asian communities shape the city’s dining.',
      },
    ],
    food: [
      {
        title: 'Pacific salmon',
        blurb: 'Grilled, smoked or in sushi, it is the regional signature.',
        wiki: 'Salmon as food',
      },
      {
        title: 'Nanaimo bars',
        blurb: 'A no-bake layered chocolate and custard square from nearby Vancouver Island.',
        wiki: 'Nanaimo bar',
      },
      {
        title: 'Japadog',
        blurb: 'Japanese-style hot dogs that started on Vancouver street corners.',
        wiki: 'Japadog',
      },
    ],
    stay: [
      {
        title: 'Stay downtown or in Coal Harbour',
        blurb: 'Easy access to the seawall, SkyTrain and ferries.',
      },
      {
        title: 'Plan for rain',
        blurb: 'October to March is wet. Choose indoor options and bring waterproofs.',
      },
    ],
    packing: [
      'Waterproof jacket',
      'Layers',
      'Comfortable walking shoes',
      'Reusable bag',
      'Camera or phone with space',
      'Swimsuit for summer beaches',
    ],
  },

  'buenos-aires': {
    wiki: 'Buenos Aires',
    intro:
      'Grand boulevards, tango halls and a steak dinner at ten. Walk the barrios, read in a bookshop, and stay up late.',
    places: [
      {
        title: 'La Boca',
        blurb: 'Colourful tin houses, the Caminito street and the football stadium.',
        wiki: 'La Boca',
      },
      {
        title: 'Recoleta Cemetery',
        blurb: 'An ornate city of mausoleums, including Eva Perón’s.',
        wiki: 'Recoleta Cemetery',
      },
      {
        title: 'Plaza de Mayo',
        blurb: 'The historic square with the Casa Rosada.',
        wiki: 'Plaza de Mayo',
      },
      {
        title: 'El Ateneo Grand Splendid',
        blurb: 'A theatre turned bookshop, one of the world’s prettiest.',
        wiki: 'El Ateneo Grand Splendid',
      },
    ],
    restaurants: [
      {
        title: 'San Telmo Market',
        blurb: 'A historic covered market with a Sunday street fair outside.',
        wiki: 'San Telmo, Buenos Aires',
      },
      {
        title: 'Palermo',
        blurb: 'The city’s largest neighbourhood for restaurants and cafés.',
        wiki: 'Palermo, Buenos Aires',
      },
      {
        title: 'Parrillas',
        blurb: 'Traditional steakhouses where grilled meat is the whole point.',
        wiki: 'Parrilla',
      },
    ],
    culture: [
      {
        title: 'Tango',
        blurb: 'Take a lesson or watch a show. Milongas are social dance nights for locals.',
        wiki: 'Tango',
      },
      { title: 'Late dining', blurb: 'Dinner often starts at 9 or 10 pm.' },
      {
        title: 'Mate',
        blurb: 'A shared herbal tea passed around among friends.',
        wiki: 'Mate (drink)',
      },
    ],
    food: [
      {
        title: 'Asado',
        blurb: 'Slow-grilled beef over embers, shared at long tables.',
        wiki: 'Asado',
      },
      {
        title: 'Empanadas',
        blurb: 'Baked or fried pastries, each region with its own filling.',
        wiki: 'Empanada',
      },
      {
        title: 'Dulce de leche',
        blurb: 'Caramelised milk spread, found in alfajores and desserts.',
        wiki: 'Dulce de leche',
      },
    ],
    stay: [
      { title: 'Palermo or Recoleta', blurb: 'Safe, walkable and full of restaurants.' },
      {
        title: 'Book tango shows ahead',
        blurb: 'Popular dinner-and-show evenings sell out on weekends.',
      },
    ],
    packing: [
      'Smart-casual outfit for dinners',
      'Comfortable walking shoes',
      'Warm jacket for June–August',
      'Type C/I power adapter',
      'Cross-body bag with a zip',
      'Small cash for markets and taxis',
    ],
  },
};
