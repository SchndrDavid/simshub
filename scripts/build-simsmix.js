'use strict';

const fs = require('node:fs');
const path = require('node:path');

const data = {
  sexes: [
    { id: 'male', ru: 'Мальчик', cs: 'Chlapec', en: 'Boy' },
    { id: 'female', ru: 'Девочка', cs: 'Dívka', en: 'Girl' }
  ],
  character_values: [
    {
      id: 'manners',
      nameRu: 'Манеры',
      nameCs: 'Vychování',
      nameEn: 'Manners',
      positive: { ru: 'Хорошие манеры', cs: 'Dobré vychování', en: 'Good Manners' },
      negative: { ru: 'Дурные манеры', cs: 'Špatné vychování', en: 'Bad Manners' },
      neutral: { ru: 'Нейтральные манеры', cs: 'Neutrální', en: 'Neutral' }
    },
    {
      id: 'responsibility',
      nameRu: 'Ответственность',
      nameCs: 'Zodpovědnost',
      nameEn: 'Responsibility',
      positive: { ru: 'Ответственность', cs: 'Zodpovědnost', en: 'Responsible' },
      negative: { ru: 'Безответственность', cs: 'Nezodpovědnost', en: 'Irresponsible' },
      neutral: { ru: 'Нейтральная ответственность', cs: 'Neutrální', en: 'Neutral' }
    },
    {
      id: 'emotional_control',
      nameRu: 'Эмоциональный контроль',
      nameCs: 'Emoční kontrola',
      nameEn: 'Emotional Control',
      positive: { ru: 'Контроль над эмоциями', cs: 'Emoční kontrola', en: 'Emotional Control' },
      negative: { ru: 'Неконтролируемые эмоции', cs: 'Nekontrolované emoce', en: 'Uncontrolled Emotions' },
      neutral: { ru: 'Нейтральный контроль', cs: 'Neutrální', en: 'Neutral' }
    },
    {
      id: 'empathy',
      nameRu: 'Сочувствие',
      nameCs: 'Empatie',
      nameEn: 'Empathy',
      positive: { ru: 'Сочувствие', cs: 'Empatie', en: 'Compassionate' },
      negative: { ru: 'Черствость', cs: 'Necitlivost', en: 'Insensitive' },
      neutral: { ru: 'Нейтральное сочувствие', cs: 'Neutrální', en: 'Neutral' }
    },
    {
      id: 'conflict_resolution',
      nameRu: 'Разрешение конфликтов',
      nameCs: 'Řešení konfliktů',
      nameEn: 'Conflict Resolution',
      positive: { ru: 'Посредник', cs: 'Usmířitel', en: 'Mediator' },
      negative: { ru: 'Любитель спорить', cs: 'Hádavý', en: 'Argumentative' },
      neutral: { ru: 'Нейтральное разрешение', cs: 'Neutrální', en: 'Neutral' }
    }
  ],
  infant_traits: [
    { ru: 'Спокойный', cs: 'Klidný', en: 'Calm', pack: 'Growing Together' },
    { ru: 'Осторожный', cs: 'Opatrný', en: 'Cautious', pack: 'Growing Together' },
    { ru: 'Чувствительный', cs: 'Citlivý', en: 'Sensitive', pack: 'Growing Together' },
    { ru: 'Неугомонный', cs: 'Neposedný', en: 'Wigglebug', pack: 'Growing Together' },
    { ru: 'Сгусток энергии', cs: 'Nezmar', en: 'Intense', pack: 'Growing Together' },
    { ru: 'Солнышко', cs: 'Sluníčko', en: 'Sunny', pack: 'Growing Together' }
  ],
  toddler_traits: [
    { ru: 'Ангелочек', cs: 'Andílek', en: 'Angelic', pack: null },
    { ru: 'Обаяшка', cs: 'Okouzlující', en: 'Charmer', pack: null },
    { ru: 'Неугомонный', cs: 'Rošťák', en: 'Silly', pack: null },
    { ru: 'Прилипала', cs: 'Mazel', en: 'Clingy', pack: null },
    { ru: 'Капризный', cs: 'Ufňukaný', en: 'Fussy', pack: null },
    { ru: 'Тихоня', cs: 'Samostatný', en: 'Independent', pack: null },
    { ru: 'Любознательный', cs: 'Zvídavý', en: 'Inquisitive', pack: null },
    { ru: 'Дикий', cs: 'Divoký', en: 'Wild', pack: null }
  ],
  child_aspirations: [
    { ru: 'Творческое дарование', cs: 'Kreativní zázrak', en: 'Artistic Prodigy', pack: null },
    { ru: 'Вундеркинд', cs: 'Dětský génius', en: 'Whiz Kid', pack: null },
    { ru: 'Непоседливый проказник', cs: 'Neřízená střela', en: 'Rambunctious Scamp', pack: null },
    { ru: 'Светский львенок', cs: 'Společenské kvítko', en: 'Social Butterfly', pack: null },
    { ru: 'Любитель пижамных вечеринок', cs: 'Král přespávaček', en: 'Slumber Party Animal', pack: 'Growing Together' },
    { ru: 'Тело и разум', cs: 'Tělo a duše', en: 'Mind and Body', pack: 'Growing Together' },
    { ru: 'Капитан игр', cs: 'Kapitán herního času', en: 'Playtime Captain', pack: 'Growing Together' },
    { ru: 'Творческий гений', cs: 'Kreativní génius', en: 'Creative Genius', pack: 'Growing Together' }
  ],
  teen_aspirations: [
    { ru: 'Жить на полную', cs: 'Žít naplno', en: 'Live Fast', pack: 'High School Years' },
    { ru: 'Стремящийся к цели', cs: 'Cílevědomost', en: 'Goal Oriented', pack: 'High School Years' },
    { ru: 'Королева драмы', cs: 'Královna dramatu', en: 'Drama Llama', pack: 'High School Years' },
    { ru: 'Кумир для всех', cs: 'Obdivovaná ikona', en: 'Admired Icon', pack: 'High School Years' }
  ],
  adult_aspirations: [
    { ru: 'Исключительный художник', cs: 'Mimořádný malíř', en: 'Painter Extraordinaire', pack: null, category: 'Творчество' },
    { ru: 'Музыкальный гений', cs: 'Hudební génius', en: 'Musical Genius', pack: null, category: 'Творчество' },
    { ru: 'Популярный автор', cs: 'Úspěšný autor', en: 'Bestselling Author', pack: null, category: 'Творчество' },
    { ru: 'Искусный мастер', cs: 'Mistr tvůrce', en: 'Master Maker', pack: 'Eco Lifestyle', category: 'Творчество' },
    { ru: 'Культурист', cs: 'Kulturista', en: 'Bodybuilder', pack: null, category: 'Спорт' },
    { ru: 'Любитель экстрима', cs: 'Milovník extrémních sportů', en: 'Extreme Sports Enthusiast', pack: 'Snowy Escape', category: 'Спорт' },
    { ru: 'Чемпион по верховой езде', cs: 'Mistr v jízdě na koni', en: 'Championship Rider', pack: 'Horse Ranch', category: 'Спорт' },
    { ru: 'Враг народа', cs: 'Veřejný nepřítel', en: 'Public Enemy', pack: null, category: 'Дурной нрав' },
    { ru: 'Главарь пакостников', cs: 'Král neplechy', en: 'Chief of Mischief', pack: null, category: 'Дурной нрав' },
    { ru: 'Подлый партнер', cs: 'Podlý spiklenec', en: 'Villainous Valentine', pack: null, category: 'Дурной нрав' },
    { ru: 'Успешная династия', cs: 'Úspěšný rod', en: 'Successful Lineage', pack: null, category: 'Семья' },
    { ru: 'Счастливая семья', cs: 'Velká šťastná rodina', en: 'Big Happy Family', pack: null, category: 'Семья' },
    { ru: 'Супер-родитель', cs: 'Dokonalý rodič', en: 'Super Parent', pack: 'Parenthood', category: 'Семья' },
    { ru: 'Лучший повар', cs: 'Šéfkuchař', en: 'Master Chef', pack: null, category: 'Еда' },
    { ru: 'Главный бармен', cs: 'Mistr mixologie', en: 'Master Mixologist', pack: null, category: 'Еда' },
    { ru: 'Знаток кухонной техники', cs: 'Odborník na spotřebiče', en: 'Appliance Wiz', pack: 'Home Chef Hustle Stuff', category: 'Еда' },
    { ru: 'Сказочное богатство', cs: 'Neuvěřitelně bohatý', en: 'Fabulously Wealthy', pack: null, category: 'Состояние' },
    { ru: 'Барон', cs: 'Vládce sídla', en: 'Mansion Baron', pack: null, category: 'Состояние' },
    { ru: 'Пятизвездочный арендодатель', cs: 'Pětihvězdičkový majitel nemovitosti', en: 'Five-Star Property Owner', pack: 'For Rent', category: 'Состояние' },
    { ru: 'Человек эпохи Возрождения', cs: 'Renesanční Simík', en: 'Renaissance Sim', pack: null, category: 'Знания' },
    { ru: 'Мозговитый чудак', cs: 'Šprt', en: 'Nerd Brain', pack: null, category: 'Знания' },
    { ru: 'Компьютерный гений', cs: 'Počítačový expert', en: 'Computer Whiz', pack: null, category: 'Знания' },
    { ru: 'Академик', cs: 'Akademik', en: 'Academic', pack: 'Discover University', category: 'Знания' },
    { ru: 'Повелитель вампиров', cs: 'Mistr upír', en: 'Master Vampire', pack: 'Vampires', category: 'Знания' },
    { ru: 'Хороший вампир', cs: 'Dobrý upír', en: 'Good Vampire', pack: 'Vampires', category: 'Знания' },
    { ru: 'Чародейство', cs: 'Čarodějnictví a magie', en: 'Spellcraft & Sorcery', pack: 'Realm of Magic', category: 'Знания' },
    { ru: 'Мастер зелий', cs: 'Výrobce lektvarů', en: 'Purveyor of Potions', pack: 'Realm of Magic', category: 'Знания' },
    { ru: 'Исследователь джунглей', cs: 'Archeologický učenec', en: 'Archaeology Scholar', pack: 'Jungle Adventure', category: 'Знания' },
    { ru: 'Историк привидений', cs: 'Duchařský historik', en: 'Ghost Historian', pack: 'Life and Death', category: 'Знания' },
    { ru: 'Серийный романтик', cs: 'Sériový romantik', en: 'Serial Romantic', pack: null, category: 'Любовь' },
    { ru: 'Родственная душа', cs: 'Spřízněná duše', en: 'Soulmate', pack: null, category: 'Любовь' },
    { ru: 'Идеальный партнер', cs: 'Vzorný partner', en: 'Paragon of Partnering', pack: 'Lovestruck', category: 'Любовь' },
    { ru: 'Независимый ботаник', cs: 'Nezávislý botanik', en: 'Freelance Botanist', pack: null, category: 'Природа' },
    { ru: 'Куратор', cs: 'Kurátor', en: 'The Curator', pack: null, category: 'Природа' },
    { ru: 'Рыбак-ас', cs: 'Rybářské eso', en: 'Angling Ace', pack: null, category: 'Природа' },
    { ru: 'Любитель свежего воздуха', cs: 'Milovník přírody', en: 'Outdoor Enthusiast', pack: 'Outdoor Retreat', category: 'Природа' },
    { ru: 'Эко-новатор', cs: 'Eko-inovátor', en: 'Eco Innovator', pack: 'Eco Lifestyle', category: 'Природа' },
    { ru: 'Сельский смотритель', cs: 'Venkovský opatrovník', en: 'Country Caretaker', pack: 'Cottage Living', category: 'Природа' },
    { ru: 'Пляжная жизнь', cs: 'Život na pláži', en: 'Beach Life', pack: 'Island Living', category: 'Природа' },
    { ru: 'Знаток нектара', cs: 'Znalec nektaru', en: 'Expert Nectar Maker', pack: 'Horse Ranch', category: 'Природа' },
    { ru: 'Душа компании', cs: 'Pařmen', en: 'Party Animal', pack: null, category: 'Популярность' },
    { ru: 'Мировой друг', cs: 'Přítel světa', en: 'Friend of the World', pack: null, category: 'Популярность' },
    { ru: 'Главарь', cs: 'Vůdce smečky', en: 'Leader of the Pack', pack: 'Get Together', category: 'Популярность' },
    { ru: 'Коренной горожанин', cs: 'Rodák z města', en: 'City Native', pack: 'City Living', category: 'Популярность' },
    { ru: 'Мировая знаменитость', cs: 'Světová celebrita', en: 'World-Famous Celebrity', pack: 'Get Famous', category: 'Популярность' },
    { ru: 'Мастер актерского мастерства', cs: 'Mistr herec', en: 'Master Actor', pack: 'Get Famous', category: 'Популярность' },
    { ru: 'Друг животных', cs: 'Přítel zvířat', en: 'Friend of the Animals', pack: 'Cats & Dogs', category: 'Популярность' },
    { ru: 'Искатель секретов', cs: 'Hledač tajemství', en: 'Seeker of Secrets', pack: 'For Rent', category: 'Популярность' }
  ],
  teen_careers: [
    { ru: 'Няня', cs: 'Hlídání dětí', en: 'Babysitter', pack: null },
    { ru: 'Бариста', cs: 'Barista', en: 'Barista', pack: null },
    { ru: 'Сотрудник фастфуда', cs: 'Rychlé občerstvení', en: 'Fast Food Employee', pack: null },
    { ru: 'Разнорабочий', cs: 'Manuální pracovník', en: 'Manual Laborer', pack: null },
    { ru: 'Продавец', cs: 'Maloobchodní prodejce', en: 'Retail Employee', pack: null },
    { ru: 'Спасатель', cs: 'Plavčík', en: 'Lifeguard', pack: 'Island Living' },
    { ru: 'Водолаз', cs: 'Potápěč', en: 'Diver', pack: 'Island Living' },
    { ru: 'Рыболов', cs: 'Rybář', en: 'Fisherman', pack: 'Island Living' },
    { ru: 'Мастер на все руки', cs: 'Řemeslník', en: 'Handyperson', pack: 'For Rent' }
  ],
  adult_careers: [
    {
      ru: 'Космонавт', cs: 'Astronaut', en: 'Astronaut', pack: null,
      branches: [
        { ru: 'Космический рейнджер', cs: 'Vesmírný strážce', en: 'Space Ranger' },
        { ru: 'Космический контрабандист', cs: 'Vesmírný pašerák', en: 'Interstellar Smuggler' }
      ]
    },
    {
      ru: 'Спортсмен', cs: 'Sportovec', en: 'Athlete', pack: null,
      branches: [
        { ru: 'Профессиональный спортсмен', cs: 'Profesionální sportovec', en: 'Professional Athlete' },
        { ru: 'Культурист', cs: 'Kulturista', en: 'Bodybuilder' }
      ]
    },
    {
      ru: 'Бизнес', cs: 'Byznys', en: 'Business', pack: null,
      branches: [
        { ru: 'Менеджмент', cs: 'Management', en: 'Management' },
        { ru: 'Инвестор', cs: 'Investor', en: 'Investor' }
      ]
    },
    {
      ru: 'Преступник', cs: 'Zločinec', en: 'Criminal', pack: null,
      branches: [
        { ru: 'Начальник', cs: 'Kápo', en: 'Boss' },
        { ru: 'Оракул', cs: 'Věštec', en: 'Oracle' }
      ]
    },
    {
      ru: 'Кулинар', cs: 'Kuchař', en: 'Culinary', pack: null,
      branches: [
        { ru: 'Шеф-повар', cs: 'Šéfkuchař', en: 'Chef' },
        { ru: 'Бармен', cs: 'Mixolog', en: 'Mixologist' }
      ]
    },
    {
      ru: 'Исполнитель', cs: 'Bavič', en: 'Entertainer', pack: null,
      branches: [
        { ru: 'Музыкант', cs: 'Hudebník', en: 'Musician' },
        { ru: 'Комик', cs: 'Komedik', en: 'Comedian' }
      ]
    },
    {
      ru: 'Художник', cs: 'Malíř', en: 'Painter', pack: null,
      branches: [
        { ru: 'Истинный мастер', cs: 'Skutečný mistr', en: 'Master of the Real' },
        { ru: 'Меценат', cs: 'Mecenáš umění', en: 'Patron of the Arts' }
      ]
    },
    {
      ru: 'Тайный агент', cs: 'Tajný agent', en: 'Secret Agent', pack: null,
      branches: [
        { ru: 'Алмазный агент', cs: 'Diamantový agent', en: 'Diamond Agent' },
        { ru: 'Двойной агент', cs: 'Padouch', en: 'Villain' }
      ]
    },
    {
      ru: 'Технический специалист', cs: 'Technický génius', en: 'Tech Guru', pack: null,
      branches: [
        { ru: 'Игрок в киберспорт', cs: 'eSport šampion', en: 'eSports Gamer' },
        { ru: 'Стартапер', cs: 'Tvůrce start-upů', en: 'Start-up Entrepreneur' }
      ]
    },
    {
      ru: 'Писатель', cs: 'Spisovatel', en: 'Writer', pack: null,
      branches: [
        { ru: 'Автор', cs: 'Spisovatel', en: 'Author' },
        { ru: 'Журналист', cs: 'Novinář', en: 'Journalist' }
      ]
    },
    {
      ru: 'Стилист', cs: 'Stylový poradce', en: 'Style Influencer', pack: null,
      branches: [
        { ru: 'Законодатель стиля', cs: 'Udavač trendů', en: 'Trend Setter' },
        { ru: 'Законодатель моды', cs: 'Módní stylista', en: 'Stylist' }
      ]
    },
    { ru: 'Детектив', cs: 'Detektiv', en: 'Detective', pack: 'Get to Work', branches: [] },
    { ru: 'Доктор', cs: 'Lékař', en: 'Doctor', pack: 'Get to Work', branches: [] },
    { ru: 'Ученый', cs: 'Vědec', en: 'Scientist', pack: 'Get to Work', branches: [] },
    {
      ru: 'Критик', cs: 'Kritik', en: 'Critic', pack: 'City Living',
      branches: [
        { ru: 'Художественный критик', cs: 'Kritik umění', en: 'Arts Critic' },
        { ru: 'Кулинарный критик', cs: 'Kritik jídla', en: 'Food Critic' }
      ]
    },
    {
      ru: 'Политик', cs: 'Politik', en: 'Politician', pack: 'City Living',
      branches: [
        { ru: 'Политик', cs: 'Politik', en: 'Politician' },
        { ru: 'Организатор благотворительности', cs: 'Organizátor charity', en: 'Charity Organizer' }
      ]
    },
    {
      ru: 'Социальные сети', cs: 'Sociální média', en: 'Social Media', pack: 'City Living',
      branches: [
        { ru: 'Интернет-знаменитость', cs: 'Internetová celebrita', en: 'Internet Personality' },
        { ru: 'Связи с общественностью', cs: 'Vztahy s veřejností', en: 'Public Relations' }
      ]
    },
    {
      ru: 'Садовод', cs: 'Zahradník', en: 'Gardener', pack: 'Seasons',
      branches: [
        { ru: 'Ботаник', cs: 'Botanik', en: 'Botanist' },
        { ru: 'Флорист', cs: 'Florista', en: 'Floral Designer' }
      ]
    },
    { ru: 'Актер', cs: 'Herec', en: 'Actor', pack: 'Get Famous', branches: [] },
    {
      ru: 'Военный служащий', cs: 'Voják', en: 'Military', pack: 'StrangerVille',
      branches: [
        { ru: 'Офицер', cs: 'Důstojník', en: 'Officer' },
        { ru: 'Спецагент', cs: 'Tajný operátor', en: 'Covert Operator' }
      ]
    },
    {
      ru: 'Эколог', cs: 'Ochranář přírody', en: 'Conservationist', pack: 'Island Living',
      branches: [
        { ru: 'Морской биолог', cs: 'Mořský biolog', en: 'Marine Biologist' },
        { ru: 'Экологический менеджер', cs: 'Environmentální manažer', en: 'Environmental Manager' }
      ]
    },
    {
      ru: 'Преподаватель', cs: 'Vzdělávání', en: 'Education', pack: 'Discover University',
      branches: [
        { ru: 'Профессор', cs: 'Profesor', en: 'Professor' },
        { ru: 'Администратор', cs: 'Administrátor', en: 'Administrator' }
      ]
    },
    {
      ru: 'Инженер', cs: 'Inženýr', en: 'Engineer', pack: 'Discover University',
      branches: [
        { ru: 'Компьютерный инженер', cs: 'Počítačový inženýr', en: 'Computer Engineer' },
        { ru: 'Инженер-механик', cs: 'Strojní inženýr', en: 'Mechanical Engineer' }
      ]
    },
    {
      ru: 'Юрист', cs: 'Právo', en: 'Law', pack: 'Discover University',
      branches: [
        { ru: 'Судья', cs: 'Soudce', en: 'Judge' },
        { ru: 'Частный адвокат', cs: 'Soukromý advokát', en: 'Private Attorney' }
      ]
    },
    {
      ru: 'Градостроитель', cs: 'Stavební inženýr', en: 'Civil Designer', pack: 'Eco Lifestyle',
      branches: [
        { ru: 'Эко-технолог', cs: 'Ekologický technik', en: 'Green Technician' },
        { ru: 'Городской планировщик', cs: 'Městský plánovač', en: 'Civic Planner' }
      ]
    },
    {
      ru: 'Служащий', cs: 'Korporátní zaměstnanec', en: 'Salaryperson', pack: 'Snowy Escape',
      branches: [
        { ru: 'Эксперт', cs: 'Odborník', en: 'Expert' },
        { ru: 'Руководитель', cs: 'Vedoucí', en: 'Supervisor' }
      ]
    },
    { ru: 'Дизайнер интерьеров', cs: 'Bytový designér', en: 'Interior Decorator', pack: 'Dream Home Decorator', branches: [] },
    { ru: 'Консультант по романтике', cs: 'Poradce pro vztahy', en: 'Romance Consultant', pack: 'Lovestruck', branches: [] },
    {
      ru: 'Патологоанатом', cs: 'Pohřební služby', en: 'Undertaker', pack: 'Life and Death',
      branches: [
        { ru: 'Морг', cs: 'Soudní lékařství', en: 'Mortician' },
        { ru: 'Организатор похорон', cs: 'Pohřební ředitel', en: 'Funeral Director' }
      ]
    },
    { ru: 'Жнец смерти', cs: 'Smrtka', en: 'Reaper', pack: 'Life and Death', branches: [] }
  ],
  traits: [
    { ru: 'Активный', cs: 'Aktivní', en: 'Active', childOk: true, pack: null },
    { ru: 'Безумный', cs: 'Trhlý', en: 'Goofball', childOk: true, pack: null },
    { ru: 'Брезгливый', cs: 'Hnidopich', en: 'Squeamish', childOk: true, pack: 'Outdoor Retreat' },
    { ru: 'Вегетарианец', cs: 'Vegetarián', en: 'Vegetarian', childOk: true, pack: 'City Living' },
    { ru: 'Вечное дитя', cs: 'Dětinský', en: 'Childish', childOk: false, pack: null },
    { ru: 'Вкусовые пристрастия', cs: 'Gurmán', en: 'Foodie', childOk: false, pack: null },
    { ru: 'Внимательный к деталям', cs: 'Detailista', en: 'Perfectionist', childOk: true, pack: null },
    { ru: 'Восторгается природой', cs: 'Milovník přírody', en: 'Loves Outdoors', childOk: true, pack: null },
    { ru: 'Гений', cs: 'Génius', en: 'Genius', childOk: true, pack: null },
    { ru: 'Глубже, чем кажется', cs: 'Zasmušilý', en: 'Gloomy', childOk: true, pack: null },
    { ru: 'Головорез', cs: 'Zlý', en: 'Evil', childOk: true, pack: null },
    { ru: 'Горячая голова', cs: 'Horká hlava', en: 'Hot-Headed', childOk: true, pack: null },
    { ru: 'Дружелюбный', cs: 'Společenský', en: 'Outgoing', childOk: true, pack: null },
    { ru: 'Задира', cs: 'Zlomyslný', en: 'Mean', childOk: true, pack: null },
    { ru: 'Заразительный энтузиазм', cs: 'Veselý', en: 'Cheerful', childOk: true, pack: null },
    { ru: 'Зеленый эстет', cs: 'Zelenáč', en: 'Green Fiend', childOk: true, pack: 'Eco Lifestyle' },
    { ru: 'Злой гений', cs: 'Podlý', en: 'Erratic', childOk: true, pack: null },
    { ru: 'Искусствовед', cs: 'Milovník umění', en: 'Art Lover', childOk: true, pack: null },
    { ru: 'Книжный червь', cs: 'Knihomol', en: 'Bookworm', childOk: true, pack: null },
    { ru: 'Клептоман', cs: 'Kleptoman', en: 'Kleptomaniac', childOk: true, pack: null },
    { ru: 'Лежебока', cs: 'Lenoch', en: 'Lazy', childOk: true, pack: null },
    { ru: 'Любитель кошек', cs: 'Milovník koček', en: 'Cat Lover', childOk: true, pack: 'Cats & Dogs' },
    { ru: 'Любитель собак', cs: 'Milovník psů', en: 'Dog Lover', childOk: true, pack: 'Cats & Dogs' },
    { ru: 'Любит животных', cs: 'Milovník zvířat', en: 'Animal Enthusiast', childOk: true, pack: 'Cottage Living' },
    { ru: 'Любитель музыки', cs: 'Milovník hudby', en: 'Music Lover', childOk: true, pack: null },
    { ru: 'Любит лошадей', cs: 'Milovník koní', en: 'Horse Lover', childOk: true, pack: 'Horse Ranch' },
    { ru: 'Любит порядок', cs: 'Pořádný', en: 'Neat', childOk: true, pack: null },
    { ru: 'Макабр', cs: 'Makabrózní', en: 'Macabre', childOk: true, pack: 'Life and Death' },
    { ru: 'Мелочный', cs: 'Malicherný', en: 'Snob', childOk: false, pack: null },
    { ru: 'Недотрога', cs: 'Nekoketní', en: 'Unflirty', childOk: false, pack: 'City Living' },
    { ru: 'Неловкий в общении', cs: 'Nespolečenský', en: 'Socially Awkward', childOk: true, pack: 'High School Years' },
    { ru: 'Непереносимость лактозы', cs: 'Alergik na laktózu', en: 'Lactose Intolerant', childOk: true, pack: 'Cottage Living' },
    { ru: 'Непостоянный', cs: 'Nestálý', en: 'Noncommittal', childOk: false, pack: null },
    { ru: 'Неуклюжий', cs: 'Nešika', en: 'Clumsy', childOk: true, pack: null },
    { ru: 'Одиночка', cs: 'Samotář', en: 'Loner', childOk: true, pack: null },
    { ru: 'Остроумный', cs: 'Vtipálek', en: 'Goofball', childOk: true, pack: null },
    { ru: 'Параноик', cs: 'Paranoik', en: 'Paranoid', childOk: true, pack: 'StrangerVille' },
    { ru: 'Порядочный', cs: 'Kavalír', en: 'Proper', childOk: true, pack: 'Snowy Escape' },
    { ru: 'Преданный', cs: 'Věrný', en: 'Loyal', childOk: true, pack: null },
    { ru: 'Привереда', cs: 'Vybíravý', en: 'Pick Eater', childOk: true, pack: null },
    { ru: 'Ранчер', cs: 'Rančer', en: 'Rancher', childOk: true, pack: 'Horse Ranch' },
    { ru: 'Ревнивый', cs: 'Žárlivý', en: 'Jealous', childOk: false, pack: null },
    { ru: 'Романтик', cs: 'Romantik', en: 'Romantic', childOk: false, pack: null },
    { ru: 'Самоуверенный', cs: 'Sebejistý', en: 'Self-Assured', childOk: true, pack: null },
    { ru: 'Свой в доску', cs: 'Brácha', en: 'Bro', childOk: false, pack: null },
    { ru: 'Семьянин', cs: 'Rodinný typ', en: 'Family-Oriented', childOk: false, pack: null },
    { ru: 'Скептик', cs: 'Skeptik', en: 'Skeptic', childOk: true, pack: 'Life and Death' },
    { ru: 'Танцмашина', cs: 'Taneční mašina', en: 'Dance Machine', childOk: false, pack: 'Get Together' },
    { ru: 'Творец', cs: 'Kreativní', en: 'Creative', childOk: true, pack: null },
    { ru: 'Угрюмый', cs: 'Chmurný', en: 'Gloomy', childOk: true, pack: null },
    { ru: 'Холерик', cs: 'Vznětlivý', en: 'Hot-Headed', childOk: true, pack: null },
    { ru: 'Чудаковатый', cs: 'Bláznivý', en: 'Erratic', childOk: true, pack: null },
    { ru: 'Шутник', cs: 'Hravý', en: 'Silly', childOk: true, pack: null },
    { ru: 'Щедрый', cs: 'Velkorysý', en: 'Generous', childOk: true, pack: 'For Rent' },
    { ru: 'Любопытный нос', cs: 'Vlezlý', en: 'Nosy', childOk: true, pack: 'For Rent' },
    { ru: 'Дитя островов', cs: 'Dítě ostrovů', en: 'Child of the Islands', childOk: true, pack: 'Island Living' },
    { ru: 'Дитя океана', cs: 'Dítě oceánu', en: 'Child of the Ocean', childOk: true, pack: 'Island Living' }
  ]
};

const targetPath = path.join(__dirname, '..', 'public', 'data', 'simsmix.json');
fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully wrote public/data/simsmix.json!');