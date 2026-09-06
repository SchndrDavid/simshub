'use strict';

const fs = require('node:fs');
const path = require('node:path');

const supersim = {
  sections: [
    {
      id: 'aspirations',
      label: 'Aspirace',
      groupBy: 'category',
      incomplete: false,
      note: 'Kompletní přehled aspirací základní hry i rozšíření.',
      items: [
        // Kreativita
        { name: 'Mimořádný malíř', en: 'Painter Extraordinaire', category: 'Kreativita', pack: null, levels: 1, age: null },
        { name: 'Hudební génius', en: 'Musical Genius', category: 'Kreativita', pack: null, levels: 1, age: null },
        { name: 'Úspěšný autor', en: 'Bestselling Author', category: 'Kreativita', pack: null, levels: 1, age: null },
        { name: 'Mistr tvůrce', en: 'Master Maker', category: 'Kreativita', pack: 'Eco Lifestyle', levels: 1, age: null },
        // Atletika
        { name: 'Kulturista', en: 'Bodybuilder', category: 'Atletika', pack: null, levels: 1, age: null },
        { name: 'Milovník extrémních sportů', en: 'Extreme Sports Enthusiast', category: 'Atletika', pack: 'Snowy Escape', levels: 1, age: null },
        { name: 'Mistr v jízdě na koni', en: 'Championship Rider', category: 'Atletika', pack: 'Horse Ranch', levels: 1, age: null },
        // Nepravost
        { name: 'Veřejný nepřítel', en: 'Public Enemy', category: 'Nepravost', pack: null, levels: 1, age: null },
        { name: 'Král neplechy', en: 'Chief of Mischief', category: 'Nepravost', pack: null, levels: 1, age: null },
        { name: 'Podlý spiklenec', en: 'Villainous Valentine', category: 'Nepravost', pack: null, levels: 1, age: null },
        // Rodina
        { name: 'Úspěšný rod', en: 'Successful Lineage', category: 'Rodina', pack: null, levels: 1, age: null },
        { name: 'Velká šťastná rodina', en: 'Big Happy Family', category: 'Rodina', pack: null, levels: 1, age: null },
        { name: 'Dokonalý rodič', en: 'Super Parent', category: 'Rodina', pack: 'Parenthood', levels: 1, age: null },
        // Jídlo
        { name: 'Šéfkuchař', en: 'Master Chef', category: 'Jídlo', pack: null, levels: 1, age: null },
        { name: 'Mistr mixologie', en: 'Master Mixologist', category: 'Jídlo', pack: null, levels: 1, age: null },
        { name: 'Odborník na spotřebiče', en: 'Appliance Wiz', category: 'Jídlo', pack: 'Home Chef Hustle Stuff', levels: 1, age: null },
        // Bohatství
        { name: 'Neuvěřitelně bohatý', en: 'Fabulously Wealthy', category: 'Bohatství', pack: null, levels: 1, age: null },
        { name: 'Vládce sídla', en: 'Mansion Baron', category: 'Bohatství', pack: null, levels: 1, age: null },
        { name: 'Pětihvězdičkový majitel nemovitosti', en: 'Five-Star Property Owner', category: 'Bohatství', pack: 'For Rent', levels: 1, age: null },
        // Vědomosti
        { name: 'Renesanční Simík', en: 'Renaissance Sim', category: 'Vědomosti', pack: null, levels: 1, age: null },
        { name: 'Šprt', en: 'Nerd Brain', category: 'Vědomosti', pack: null, levels: 1, age: null },
        { name: 'Počítačový expert', en: 'Computer Whiz', category: 'Vědomosti', pack: null, levels: 1, age: null },
        { name: 'Akademik', en: 'Academic', category: 'Vědomosti', pack: 'Discover University', levels: 1, age: null },
        { name: 'Mistr upír', en: 'Master Vampire', category: 'Vědomosti', pack: 'Vampires', levels: 1, age: null },
        { name: 'Dobrý upír', en: 'Good Vampire', category: 'Vědomosti', pack: 'Vampires', levels: 1, age: null },
        { name: 'Čarodějnictví a magie', en: 'Spellcraft & Sorcery', category: 'Vědomosti', pack: 'Realm of Magic', levels: 1, age: null },
        { name: 'Výrobce lektvarů', en: 'Purveyor of Potions', category: 'Vědomosti', pack: 'Realm of Magic', levels: 1, age: null },
        { name: 'Archeologický učenec', en: 'Archaeology Scholar', category: 'Vědomosti', pack: 'Jungle Adventure', levels: 1, age: null },
        { name: 'Duchařský historik', en: 'Ghost Historian', category: 'Vědomosti', pack: 'Life and Death', levels: 1, age: null },
        // Láska
        { name: 'Sériový romantik', en: 'Serial Romantic', category: 'Láska', pack: null, levels: 1, age: null },
        { name: 'Spřízněná duše', en: 'Soulmate', category: 'Láska', pack: null, levels: 1, age: null },
        { name: 'Vzorný partner', en: 'Paragon of Partnering', category: 'Láska', pack: 'Lovestruck', levels: 1, age: null },
        // Příroda
        { name: 'Nezávislý botanik', en: 'Freelance Botanist', category: 'Příroda', pack: null, levels: 1, age: null },
        { name: 'Kurátor', en: 'The Curator', category: 'Příroda', pack: null, levels: 1, age: null },
        { name: 'Rybářské eso', en: 'Angling Ace', category: 'Příroda', pack: null, levels: 1, age: null },
        { name: 'Milovník přírody', en: 'Outdoor Enthusiast', category: 'Příroda', pack: 'Outdoor Retreat', levels: 1, age: null },
        { name: 'Eko-inovátor', en: 'Eco Innovator', category: 'Příroda', pack: 'Eco Lifestyle', levels: 1, age: null },
        { name: 'Venkovský opatrovník', en: 'Country Caretaker', category: 'Příroda', pack: 'Cottage Living', levels: 1, age: null },
        { name: 'Život na pláži', en: 'Beach Life', category: 'Příroda', pack: 'Island Living', levels: 1, age: null },
        { name: 'Průzkumník džungle', en: 'Jungle Explorer', category: 'Příroda', pack: 'Jungle Adventure', levels: 1, age: null },
        { name: 'Znalec nektaru', en: 'Expert Nectar Maker', category: 'Příroda', pack: 'Horse Ranch', levels: 1, age: null },
        // Popularita
        { name: 'Hvězda vtipů', en: 'Joke Star', category: 'Popularita', pack: null, levels: 1, age: null },
        { name: 'Pařmen', en: 'Party Animal', category: 'Popularita', pack: null, levels: 1, age: null },
        { name: 'Přítel světa', en: 'Friend of the World', category: 'Popularita', pack: null, levels: 1, age: null },
        { name: 'Vůdce smečky', en: 'Leader of the Pack', category: 'Popularita', pack: 'Get Together', levels: 1, age: null },
        { name: 'Rodák z města', en: 'City Native', category: 'Popularita', pack: 'City Living', levels: 1, age: null },
        { name: 'Světová celebrita', en: 'World-Famous Celebrity', category: 'Popularita', pack: 'Get Famous', levels: 1, age: null },
        { name: 'Mistr herec', en: 'Master Actor', category: 'Popularita', pack: 'Get Famous', levels: 1, age: null },
        { name: 'Přítel zvířat', en: 'Friend of the Animals', category: 'Popularita', pack: 'Cats & Dogs', levels: 1, age: null },
        { name: 'Hledač tajemství', en: 'Seeker of Secrets', category: 'Popularita', pack: 'For Rent', levels: 1, age: null },
        // Umístění a kultura
        { name: 'Záhada v StrangerVille', en: 'Strangerville Mystery', category: 'Umístění a kultura', pack: 'StrangerVille', levels: 1, age: null },
        { name: 'Turista z hory Komorebi', en: 'Mt. Komorebi Sightseer', category: 'Umístění a kultura', pack: 'Snowy Escape', levels: 1, age: null },
        { name: 'Zenový guru', en: 'Zen Guru', category: 'Umístění a kultura', pack: 'Spa Day', levels: 1, age: null },
        // Vlkodlaci
        { name: 'Hledač léku', en: 'Cure Seeker', category: 'Vlkodlaci', pack: 'Werewolves', levels: 1, age: null },
        { name: 'Posel Společenství', en: 'Emissary of the Collective', category: 'Vlkodlaci', pack: 'Werewolves', levels: 1, age: null },
        { name: 'Odpadlík z Divokých tesáků', en: 'Wildfang Renegade', category: 'Vlkodlaci', pack: 'Werewolves', levels: 1, age: null },
        { name: 'Osamělý vlk', en: 'Lone Wolf', category: 'Vlkodlaci', pack: 'Werewolves', levels: 1, age: null },
        // Teenagerské
        { name: 'Žít naplno', en: 'Live Fast', category: 'Teenagerské', pack: 'High School Years', levels: 1, age: 'teen' },
        { name: 'Cílevědomost', en: 'Goal Oriented', category: 'Teenagerské', pack: 'High School Years', levels: 1, age: 'teen' },
        { name: 'Královna dramatu', en: 'Drama Llama', category: 'Teenagerské', pack: 'High School Years', levels: 1, age: 'teen' },
        { name: 'Obdivovaná ikona', en: 'Admired Icon', category: 'Teenagerské', pack: 'High School Years', levels: 1, age: 'teen' },
        // Dětské
        { name: 'Kreativní zázrak', en: 'Artistic Prodigy', category: 'Dětské', pack: null, levels: 1, age: 'child' },
        { name: 'Neřízená střela', en: 'Rambunctious Scamp', category: 'Dětské', pack: null, levels: 1, age: 'child' },
        { name: 'Společenské kvítko', en: 'Social Butterfly', category: 'Dětské', pack: null, levels: 1, age: 'child' },
        { name: 'Dětský génius', en: 'Whiz Kid', category: 'Dětské', pack: null, levels: 1, age: 'child' },
        { name: 'Král přespávaček', en: 'Slumber Party Animal', category: 'Dětské', pack: 'Growing Together', levels: 1, age: 'child' },
        { name: 'Tělo a duše', en: 'Mind and Body', category: 'Dětské', pack: 'Growing Together', levels: 1, age: 'child' },
        { name: 'Kapitán herního času', en: 'Playtime Captain', category: 'Dětské', pack: 'Growing Together', levels: 1, age: 'child' },
        { name: 'Kreativní génius', en: 'Creative Genius', category: 'Dětské', pack: 'Growing Together', levels: 1, age: 'child' }
      ]
    },
    {
      id: 'reward_traits',
      label: 'Odměnové vlastnosti',
      groupBy: null,
      incomplete: false,
      note: 'Vlastnosti z obchodu odměn za body spokojenosti a odměny za dětství.',
      items: [
        { name: 'Šťastné batole', en: 'Happy Toddler', pack: null, levels: 1, cost: 0, age: 'child' },
        { name: 'Prvotřídní batole', en: 'Top-Notch Toddler', pack: null, levels: 1, cost: 0, age: 'child' },
        { name: 'Antiseptický', en: 'Antiseptic', pack: null, levels: 1, cost: 3000 },
        { name: 'Okouzlující', en: 'Beguiling', pack: null, levels: 1, cost: 2500 },
        { name: 'Bezstarostný', en: 'Carefree', pack: null, levels: 1, cost: 3000 },
        { name: 'Styky', en: 'Connections', pack: null, levels: 1, cost: 3000 },
        { name: 'Tvůrčí vizionář', en: 'Creative Visionary', pack: null, levels: 1, cost: 2000 },
        { name: 'Podnikavý', en: 'Entrepreneurial', pack: null, levels: 1, cost: 4000 },
        { name: 'Plodný', en: 'Fertile', pack: null, levels: 1, cost: 3000 },
        { name: 'Věčně svěží', en: 'Forever Fresh', pack: null, levels: 1, cost: 8000 },
        { name: 'Věčně sytý', en: 'Forever Full', pack: null, levels: 1, cost: 10000 },
        { name: 'Služby zdarma', en: 'Free Services', pack: null, levels: 1, cost: 4000 },
        { name: 'Skromný', en: 'Frugal', pack: null, levels: 1, cost: 2000 },
        { name: 'Skvělý líbač', en: 'Great Kisser', pack: null, levels: 1, cost: 3000 },
        { name: 'Sportovní nadšenec', en: 'Gym Rat', pack: null, levels: 1, cost: 500 },
        { name: 'Téměř bez hladu', en: 'Hardly Hungry', pack: null, levels: 1, cost: 4000 },
        { name: 'Nezávislý', en: 'Independent', pack: null, levels: 1, cost: 4000 },
        { name: 'Dlouhověký', en: 'Long Lived', pack: null, levels: 1, cost: 0 },
        { name: 'Prodejný', en: 'Marketable', pack: null, levels: 1, cost: 1500 },
        { name: 'Mentor', en: 'Mentor', pack: null, levels: 1, cost: 1000 },
        { name: 'Ranní ptáče', en: 'Morning Sim', pack: null, levels: 1, cost: 1000 },
        { name: 'Neúnavný', en: 'Never Weary', pack: null, levels: 1, cost: 10000 },
        { name: 'Noční sova', en: 'Night Owl', pack: null, levels: 1, cost: 1000 },
        { name: 'Pozorovatel', en: 'Observant', pack: null, levels: 1, cost: 500 },
        { name: 'Učenec', en: 'Savant', pack: null, levels: 1, cost: 4000 },
        { name: 'Zřídka spící', en: 'Seldom Sleepy', pack: null, levels: 1, cost: 4000 },
        { name: 'Nestoudný', en: 'Shameless', pack: null, levels: 1, cost: 4000 },
        { name: 'Rychlý uklízeč', en: 'Speed Cleaner', pack: null, levels: 1, cost: 500 },
        { name: 'Rychlý čtenář', en: 'Speed Reader', pack: null, levels: 1, cost: 1000 },
        { name: 'Ocelový močový měchýř', en: 'Steel Bladder', pack: null, levels: 1, cost: 7000 },
        { name: 'Super zahradník', en: 'Super Green Thumb', pack: null, levels: 1, cost: 4000 },
        { name: 'Webmaster', en: 'Webmaster', pack: null, levels: 1, cost: 0 }
      ]
    },
    {
      id: 'skills',
      label: 'Dovednosti',
      groupBy: 'category',
      incomplete: false,
      note: 'Kompletní přehled dovedností pro batolata, děti i dospělé.',
      items: [
        // Dospělé dovednosti
        { name: 'Charisma', en: 'Charisma', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Komedie', en: 'Comedy', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Vaření', en: 'Cooking', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Rybaření', en: 'Fishing', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Fitness', en: 'Fitness', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Zahradničení', en: 'Gardening', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Gurmánské vaření', en: 'Gourmet Cooking', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Kytara', en: 'Guitar', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Zručnost', en: 'Handiness', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Logika', en: 'Logic', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Neplecha', en: 'Mischief', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Mixologie', en: 'Mixology', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Malování', en: 'Painting', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Fotografování', en: 'Photography', category: 'Dospělé dovednosti', pack: null, levels: 5 },
        { name: 'Klavír', en: 'Piano', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Programování', en: 'Programming', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Raketová věda', en: 'Rocket Science', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Hraní videoher', en: 'Video Gaming', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Housle', en: 'Violin', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Psaní', en: 'Writing', category: 'Dospělé dovednosti', pack: null, levels: 10 },
        { name: 'Pečení', en: 'Baking', category: 'Dospělé dovednosti', pack: 'Get to Work', levels: 10 },
        { name: 'Bylinkářství', en: 'Herbalism', category: 'Dospělé dovednosti', pack: 'Outdoor Retreat', levels: 10 },
        { name: 'Wellness', en: 'Wellness', category: 'Dospělé dovednosti', pack: 'Spa Day', levels: 10 },
        { name: 'Varhany', en: 'Pipe Organ', category: 'Dospělé dovednosti', pack: 'Vampires', levels: 10 },
        { name: 'Upíří tradice', en: 'Vampire Lore', category: 'Dospělé dovednosti', pack: 'Vampires', levels: 15 },
        { name: 'Výchova', en: 'Parenting', category: 'Dospělé dovednosti', pack: 'Parenthood', levels: 10 },
        { name: 'Archeologie', en: 'Archaeology', category: 'Dospělé dovednosti', pack: 'Jungle Adventure', levels: 10 },
        { name: 'Selvadoradská kultura', en: 'Selvadoradian Culture', category: 'Dospělé dovednosti', pack: 'Jungle Adventure', levels: 5 },
        { name: 'DJ mixování', en: 'DJ Mixing', category: 'Dospělé dovednosti', pack: 'Get Together', levels: 10 },
        { name: 'Tanec', en: 'Dancing', category: 'Dospělé dovednosti', pack: 'Get Together', levels: 5 },
        { name: 'Zpěv', en: 'Singing', category: 'Dospělé dovednosti', pack: 'City Living', levels: 10 },
        { name: 'Veterinář', en: 'Veterinarian', category: 'Dospělé dovednosti', pack: 'Cats & Dogs', levels: 10 },
        { name: 'Výcvik mazlíčků', en: 'Pet Training', category: 'Dospělé dovednosti', pack: 'Cats & Dogs', levels: 5 },
        { name: 'Vázání květin', en: 'Flower Arranging', category: 'Dospělé dovednosti', pack: 'Seasons', levels: 10 },
        { name: 'Herectví', en: 'Acting', category: 'Dospělé dovednosti', pack: 'Get Famous', levels: 10 },
        { name: 'Tvorba médií', en: 'Media Production', category: 'Dospělé dovednosti', pack: 'Get Famous', levels: 5 },
        { name: 'Výroba předmětů', en: 'Fabrication', category: 'Dospělé dovednosti', pack: 'Eco Lifestyle', levels: 10 },
        { name: 'Výroba šumivých nápojů', en: 'Juice Fizzing', category: 'Dospělé dovednosti', pack: 'Eco Lifestyle', levels: 5 },
        { name: 'Robotika', en: 'Robotics', category: 'Dospělé dovednosti', pack: 'Discover University', levels: 10 },
        { name: 'Výzkum a debata', en: 'Research & Debate', category: 'Dospělé dovednosti', pack: 'Discover University', levels: 10 },
        { name: 'Horolezectví', en: 'Rock Climbing', category: 'Dospělé dovednosti', pack: 'Snowy Escape', levels: 10 },
        { name: 'Lyžování', en: 'Skiing', category: 'Dospělé dovednosti', pack: 'Snowy Escape', levels: 10 },
        { name: 'Snowboarding', en: 'Snowboarding', category: 'Dospělé dovednosti', pack: 'Snowy Escape', levels: 10 },
        { name: 'Křížkový steh', en: 'Cross-Stitch', category: 'Dospělé dovednosti', pack: 'Cottage Living', levels: 5 },
        { name: 'Pletení', en: 'Knitting', category: 'Dospělé dovednosti', pack: 'Nifty Knitting Stuff', levels: 10 },
        { name: 'Gemologie', en: 'Gemology', category: 'Dospělé dovednosti', pack: 'Crystal Creations Stuff', levels: 10 },
        { name: 'Médium', en: 'Medium', category: 'Dospělé dovednosti', pack: 'Paranormal Stuff', levels: 5 },
        { name: 'Bowling', en: 'Bowling', category: 'Dospělé dovednosti', pack: 'Bowling Night Stuff', levels: 5 },
        { name: 'Jízda na koni', en: 'Riding', category: 'Dospělé dovednosti', pack: 'Horse Ranch', levels: 10 },
        { name: 'Výroba nektaru', en: 'Nectar Making', category: 'Dospělé dovednosti', pack: 'Horse Ranch', levels: 10 },
        { name: 'Tanatologie', en: 'Thanatology', category: 'Dospělé dovednosti', pack: 'Life and Death', levels: 10 },
        { name: 'Romantika', en: 'Romance', category: 'Dospělé dovednosti', pack: 'Lovestruck', levels: 10 },
        { name: 'Podnikatel', en: 'Entrepreneur', category: 'Dospělé dovednosti', pack: 'High School Years', levels: 5 },
        // Dětské dovednosti
        { name: 'Motorika', en: 'Motor', category: 'Dětské dovednosti', pack: null, levels: 10, age: 'child' },
        { name: 'Společenské schopnosti', en: 'Social', category: 'Dětské dovednosti', pack: null, levels: 10, age: 'child' },
        { name: 'Kreativita', en: 'Creativity', category: 'Dětské dovednosti', pack: null, levels: 10, age: 'child' },
        { name: 'Duševní schopnosti', en: 'Mental', category: 'Dětské dovednosti', pack: null, levels: 10, age: 'child' },
        // Batolecí dovednosti
        { name: 'Komunikace', en: 'Communication', category: 'Batolecí dovednosti', pack: null, levels: 5, age: 'toddler' },
        { name: 'Představivost', en: 'Imagination', category: 'Batolecí dovednosti', pack: null, levels: 5, age: 'toddler' },
        { name: 'Pohyb', en: 'Movement', category: 'Batolecí dovednosti', pack: null, levels: 5, age: 'toddler' },
        { name: 'Nočník', en: 'Potty', category: 'Batolecí dovednosti', pack: null, levels: 3, age: 'toddler' },
        { name: 'Myšlení', en: 'Thinking', category: 'Batolecí dovednosti', pack: null, levels: 5, age: 'toddler' }
      ]
    },
    {
      id: 'careers',
      label: 'Kariéry',
      groupBy: 'category',
      incomplete: false,
      note: 'Dospělé kariéry a brigády pro teenagery.',
      items: [
        // Dospělé kariéry
        { name: 'Astronaut', en: 'Astronaut', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Sportovec', en: 'Athlete', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Byznys', en: 'Business', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Zločinec', en: 'Criminal', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Kuchař', en: 'Culinary', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Bavič', en: 'Entertainer', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Malíř', en: 'Painter', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Tajný agent', en: 'Secret Agent', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Technický génius', en: 'Tech Guru', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Spisovatel', en: 'Writer', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Stylový poradce', en: 'Style Influencer', category: 'Dospělé kariéry', pack: null, levels: 10, age: 'adult' },
        { name: 'Detektiv', en: 'Detective', category: 'Dospělé kariéry', pack: 'Get to Work', levels: 10, age: 'adult' },
        { name: 'Lékař', en: 'Doctor', category: 'Dospělé kariéry', pack: 'Get to Work', levels: 10, age: 'adult' },
        { name: 'Vědec', en: 'Scientist', category: 'Dospělé kariéry', pack: 'Get to Work', levels: 10, age: 'adult' },
        { name: 'Kritik', en: 'Critic', category: 'Dospělé kariéry', pack: 'City Living', levels: 10, age: 'adult' },
        { name: 'Politik', en: 'Politician', category: 'Dospělé kariéry', pack: 'City Living', levels: 10, age: 'adult' },
        { name: 'Sociální média', en: 'Social Media', category: 'Dospělé kariéry', pack: 'City Living', levels: 10, age: 'adult' },
        { name: 'Zahradník', en: 'Gardener', category: 'Dospělé kariéry', pack: 'Seasons', levels: 10, age: 'adult' },
        { name: 'Herec', en: 'Actor', category: 'Dospělé kariéry', pack: 'Get Famous', levels: 10, age: 'adult' },
        { name: 'Voják', en: 'Military', category: 'Dospělé kariéry', pack: 'StrangerVille', levels: 10, age: 'adult' },
        { name: 'Ochranář přírody', en: 'Conservationist', category: 'Dospělé kariéry', pack: 'Island Living', levels: 10, age: 'adult' },
        { name: 'Vzdělávání', en: 'Education', category: 'Dospělé kariéry', pack: 'Discover University', levels: 10, age: 'adult' },
        { name: 'Inženýr', en: 'Engineer', category: 'Dospělé kariéry', pack: 'Discover University', levels: 10, age: 'adult' },
        { name: 'Právo', en: 'Law', category: 'Dospělé kariéry', pack: 'Discover University', levels: 10, age: 'adult' },
        { name: 'Stavební inženýr', en: 'Civil Designer', category: 'Dospělé kariéry', pack: 'Eco Lifestyle', levels: 10, age: 'adult' },
        { name: 'Korporátní zaměstnanec', en: 'Salaryperson', category: 'Dospělé kariéry', pack: 'Snowy Escape', levels: 10, age: 'adult' },
        { name: 'Bytový designér', en: 'Interior Decorator', category: 'Dospělé kariéry', pack: 'Dream Home Decorator', levels: 10, age: 'adult' },
        { name: 'Poradce pro vztahy', en: 'Romance Consultant', category: 'Dospělé kariéry', pack: 'Lovestruck', levels: 10, age: 'adult' },
        { name: 'Pohřební služby', en: 'Undertaker', category: 'Dospělé kariéry', pack: 'Life and Death', levels: 10, age: 'adult' },
        { name: 'Smrtka', en: 'Reaper', category: 'Dospělé kariéry', pack: 'Life and Death', levels: 10, age: 'adult' },
        // Brigády pro teenagery
        { name: 'Hlídání dětí', en: 'Babysitter', category: 'Brigády (Teenager)', pack: null, levels: 3, age: 'teen' },
        { name: 'Barista', en: 'Barista', category: 'Brigády (Teenager)', pack: null, levels: 3, age: 'teen' },
        { name: 'Rychlé občerstvení', en: 'Fast Food Employee', category: 'Brigády (Teenager)', pack: null, levels: 3, age: 'teen' },
        { name: 'Manuální pracovník', en: 'Manual Laborer', category: 'Brigády (Teenager)', pack: null, levels: 3, age: 'teen' },
        { name: 'Maloobchodní prodejce', en: 'Retail Employee', category: 'Brigády (Teenager)', pack: null, levels: 3, age: 'teen' },
        { name: 'Potápěč', en: 'Diver', category: 'Brigády (Teenager)', pack: 'Island Living', levels: 3, age: 'teen' },
        { name: 'Rybář', en: 'Fisherman', category: 'Brigády (Teenager)', pack: 'Island Living', levels: 3, age: 'teen' },
        { name: 'Plavčík', en: 'Lifeguard', category: 'Brigády (Teenager)', pack: 'Island Living', levels: 3, age: 'teen' },
        { name: 'Řemeslník', en: 'Handyperson', category: 'Brigády (Teenager)', pack: 'For Rent', levels: 3, age: 'teen' }
      ]
    },
    {
      id: 'degrees',
      label: 'Vysokoškolské obory',
      groupBy: null,
      incomplete: false,
      note: 'Dvě úrovně: běžný diplom (1) a diplom s vyznamenáním (2).',
      items: [
        { name: 'Dějiny umění', en: 'Art History', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Biologie', en: 'Biology', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Komunikace', en: 'Communications', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Informatika', en: 'Computer Science', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Kulinářská umění', en: 'Culinary Arts', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Dramatická umění', en: 'Drama', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Ekonomie', en: 'Economics', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Výtvarná umění', en: 'Fine Art', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Historie', en: 'History', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Jazyk a literatura', en: 'Language & Literature', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Fyzika', en: 'Physics', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Psychologie', en: 'Psychology', pack: 'Discover University', levels: 2, age: 'adult' },
        { name: 'Padoušství', en: 'Villainy', pack: 'Discover University', levels: 2, age: 'adult' }
      ]
    },
    {
      id: 'vampire_powers',
      label: 'Upíří síly',
      groupBy: null,
      incomplete: false,
      note: 'Kompletní přehled upířích schopností z herního balíčku Upíři.',
      items: [
        { name: 'Netopýří forma', en: 'Bat Form', pack: 'Vampires', levels: 1 },
        { name: 'Rozkazování', en: 'Command', pack: 'Vampires', levels: 1 },
        { name: 'Zbavení potřeb', en: 'Deprive Needs', pack: 'Vampires', levels: 1 },
        { name: 'Odhalení osobnosti', en: 'Detect Personality', pack: 'Vampires', levels: 1 },
        { name: 'Věčné pouto', en: 'Eternal Bond', pack: 'Vampires', levels: 1 },
        { name: 'Imunita vůči česneku', en: 'Garlic Immunity', pack: 'Vampires', levels: 1 },
        { name: 'Ovlivnění emocí', en: 'Influence Emotion', pack: 'Vampires', levels: 1 },
        { name: 'Neodolatelný spánek', en: 'Irresistible Slumber', pack: 'Vampires', levels: 1 },
        { name: 'Manipulace s životní silou', en: 'Manipulate Life Spirit', pack: 'Vampires', levels: 1 },
        { name: 'Zhypnotizování', en: 'Mesmerize', pack: 'Vampires', levels: 1 },
        { name: 'Mlžná forma', en: 'Mist Form', pack: 'Vampires', levels: 1 },
        { name: 'Okultní meditace', en: 'Occult Meditation', pack: 'Vampires', levels: 1 },
        { name: 'Bez zápachu', en: 'Odorless', pack: 'Vampires', levels: 1 },
        { name: 'Odolnost proti slunci', en: 'Sun Resistance', pack: 'Vampires', levels: 3 },
        { name: 'Nadpřirozená rychlost', en: 'Supernatural Speed', pack: 'Vampires', levels: 1 },
        { name: 'Zkrocená žízeň', en: 'Tamed Thirst', pack: 'Vampires', levels: 1 },
        { name: 'Vytvoření upíra', en: 'Vampire Creation', pack: 'Vampires', levels: 1 },
        { name: 'Upíří kouzlo', en: 'Vampiric Charm', pack: 'Vampires', levels: 3 },
        { name: 'Upíří síla', en: 'Vampiric Strength', pack: 'Vampires', levels: 3 }
      ]
    },
    {
      id: 'spellcaster',
      label: 'Schopnosti čaroděje',
      groupBy: 'category',
      incomplete: false,
      note: 'Kouzla, lektvary a hodnost čaroděje z balíčku Říše kouzel.',
      items: [
        { name: 'Hodnost čaroděje', en: 'Spellcaster Rank', category: 'Hodnost', pack: 'Realm of Magic', levels: 5 },
        // Praktická kouzla
        { name: 'Uklizeno', en: 'Scruberoo', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Opravito', en: 'Repairio', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Zelenito', en: 'Herbio', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Chuťovka', en: 'Deliciosio', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Kopiíro', en: 'Copypasto', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Teleportáto', en: 'Transportalate', category: 'Praktická magie', pack: 'Realm of Magic', levels: 1 },
        // Škodolibá kouzla
        { name: 'Blouznivo', en: 'Deliriate', category: 'Škodolibá magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Očaro', en: 'Infatuate', category: 'Škodolibá magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Proměno', en: 'Morphiate', category: 'Škodolibá magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Zuřivo', en: 'Furio', category: 'Škodolibá magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Zvláštno', en: 'Strangeify', category: 'Škodolibá magie', pack: 'Realm of Magic', levels: 1 },
        // Nezkrotná kouzla
        { name: 'Duplikáto', en: 'Duplicato', category: 'Nezkrotná magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Nekrovoláto', en: 'Necrocall', category: 'Nezkrotná magie', pack: 'Realm of Magic', levels: 1 },
        { name: 'Spalovačka', en: 'Inferniate', category: 'Nezkrotná magie', pack: 'Realm of Magic', levels: 1 },
        // Lektvary
        { name: 'Lektvar sejmutí kletby', en: 'Potion of Curse Cleansing', category: 'Lektvary', pack: 'Realm of Magic', levels: 1 },
        { name: 'Lektvar emoční stability', en: 'Potion of Emotional Stability', category: 'Lektvary', pack: 'Realm of Magic', levels: 1 },
        { name: 'Lektvar nesmrtelnosti', en: 'Potion of Immortality', category: 'Lektvary', pack: 'Realm of Magic', levels: 1 },
        { name: 'Lektvar hojných potřeb', en: 'Potion of Plentiful Needs', category: 'Lektvary', pack: 'Realm of Magic', levels: 1 },
        { name: 'Lektvar pravdy', en: 'Potion of Truth', category: 'Lektvary', pack: 'Realm of Magic', levels: 1 }
      ]
    },
    {
      id: 'fame_perks',
      label: 'Perky slávy',
      groupBy: null,
      incomplete: false,
      note: 'Výběr perků slávy z rozšíření Cesta ke slávě.',
      items: [
        { name: 'Zavedené jméno', en: 'Established Name', pack: 'Get Famous', levels: 1 },
        { name: 'Okamžitý nejlepší přítel', en: 'Instant Bestie', pack: 'Get Famous', levels: 1 },
        { name: 'Veřejná osoba', en: 'Public Figure', pack: 'Get Famous', levels: 1 },
        { name: 'Oblíbenec fanoušků', en: 'Fan Favorite', pack: 'Get Famous', levels: 1 },
        { name: 'Firemní sponzor', en: 'Corporate Sponsor', pack: 'Get Famous', levels: 1 },
        { name: 'Snadná cesta', en: 'Easy Street', pack: 'Get Famous', levels: 1 },
        { name: 'Družina', en: 'Squad', pack: 'Get Famous', levels: 1 },
        { name: 'Influencer', en: 'Influencer', pack: 'Get Famous', levels: 1 },
        { name: 'Vlastní značka', en: 'Lifestyle Brand', pack: 'Get Famous', levels: 1 }
      ]
    },
    {
      id: 'werewolf_abilities',
      label: 'Schopnosti vlkodlaka',
      groupBy: null,
      incomplete: false,
      note: 'Kompletní přehled schopností a hodností z herního balíčku Vlkodlaci.',
      items: [
        { name: 'Hodnost vlkodlaka', en: 'Werewolf Rank', pack: 'Werewolves', levels: 5 },
        { name: 'Divoké kousnutí', en: 'Ferocious Bite', pack: 'Werewolves', levels: 1 },
        { name: 'Hrabání v zemi', en: 'Scavenge', pack: 'Werewolves', levels: 1 },
        { name: 'Značkování teritoria', en: 'Territory Marking', pack: 'Werewolves', levels: 1 },
        { name: 'Vlčí zdřímnutí', en: 'Wolf Nap', pack: 'Werewolves', levels: 1 },
        { name: 'Vůle vzdorovat', en: 'The Will to Resist', pack: 'Werewolves', levels: 1 },
        { name: 'Noční slídil', en: 'Nightstalker', pack: 'Werewolves', levels: 1 },
        { name: 'Lov', en: 'Hunting', pack: 'Werewolves', levels: 1 },
        { name: 'Prvotní instinkty', en: 'Primal Instincts', pack: 'Werewolves', levels: 1 },
        { name: 'Nositel kletby', en: 'Curse Bearer', pack: 'Werewolves', levels: 1 },
        { name: 'Přirozené uzdravování', en: 'Natural Healing', pack: 'Werewolves', levels: 1 },
        { name: 'Ponuré vytí', en: 'Sombre Howl', pack: 'Werewolves', levels: 1 },
        { name: 'Měsíční požehnání', en: 'Lunar Blessing', pack: 'Werewolves', levels: 1 },
        { name: 'Vlkodlačí empatie', en: 'Werewolf Empathy', pack: 'Werewolves', levels: 1 },
        { name: 'Zastrašující vystupování', en: 'Menacing Demeanor', pack: 'Werewolves', levels: 1 },
        { name: 'Kopáč tunelů', en: 'Tunneler', pack: 'Werewolves', levels: 1 },
        { name: 'Ovládnutí proměny', en: 'Transformation Mastery', pack: 'Werewolves', levels: 1 },
        { name: 'Vlčí nesmrtelnost', en: 'Immortal Wolf', pack: 'Werewolves', levels: 1 },
        { name: 'Alfa vlk', en: 'Alpha Wolf', pack: 'Werewolves', levels: 1 },
        { name: 'Měsíční prozření', en: 'Lunar Epiphany', pack: 'Werewolves', levels: 1 },
        { name: 'Vlkodlačí diplomacie', en: 'Werewolf Diplomacy', pack: 'Werewolves', levels: 1 }
      ]
    },
    {
      id: 'ghost_mastery',
      label: 'Ovládnutí ducha',
      groupBy: null,
      incomplete: false,
      note: 'Duchařské schopnosti a hodnosti z rozšíření Život a smrt.',
      items: [
        { name: 'Úroveň ovládnutí ducha', en: 'Ghost Mastery Rank', pack: 'Life and Death', levels: 5 },
        { name: 'Telekineze', en: 'Telekinesis', pack: 'Life and Death', levels: 1 },
        { name: 'Zjevení', en: 'Apparition', pack: 'Life and Death', levels: 1 },
        { name: 'Chladný dotek', en: 'Chilling Touch', pack: 'Life and Death', levels: 1 },
        { name: 'Duchařské řádění', en: 'Poltergeist Havoc', pack: 'Life and Death', levels: 1 },
        { name: 'Vyvolání mlhy', en: 'Summon Mist', pack: 'Life and Death', levels: 1 },
        { name: 'Převtělení do předmětů', en: 'Object Possession', pack: 'Life and Death', levels: 1 },
        { name: 'Éterický vznos', en: 'Ethereal Levitation', pack: 'Life and Death', levels: 1 },
        { name: 'Duchařské zastrašení', en: 'Ghostly Fright', pack: 'Life and Death', levels: 1 },
        { name: 'Astrální projekce', en: 'Astral Projection', pack: 'Life and Death', levels: 1 },
        { name: 'Přátelský přízrak', en: 'Benevolent Presence', pack: 'Life and Death', levels: 1 },
        { name: 'Posmrtné požehnání', en: 'Afterlife Blessing', pack: 'Life and Death', levels: 1 },
        { name: 'Zjevení ve snu', en: 'Dream Walking', pack: 'Life and Death', levels: 1 }
      ]
    },
    {
      id: 'milestones',
      label: 'Milníky',
      groupBy: 'category',
      incomplete: false,
      note: 'Klíčové životní milníky z rozšíření Rodinný život (Growing Together).',
      items: [
        // Batolecí
        { name: 'První krůčky', en: 'First Steps', category: 'Batolecí milníky', pack: 'Growing Together', levels: 1, age: 'toddler' },
        { name: 'První slova', en: 'First Words', category: 'Batolecí milníky', pack: 'Growing Together', levels: 1, age: 'toddler' },
        { name: 'Zvládnutí nočníku', en: 'Potty Trained', category: 'Batolecí milníky', pack: 'Growing Together', levels: 1, age: 'toddler' },
        // Dětské
        { name: 'První nejlepší kamarád', en: 'First Best Friend', category: 'Dětské milníky', pack: 'Growing Together', levels: 1, age: 'child' },
        { name: 'Jízda na kole', en: 'Rode Bike', category: 'Dětské milníky', pack: 'Growing Together', levels: 1, age: 'child' },
        { name: 'Ztráta prvního zubu', en: 'Lost First Tooth', category: 'Dětské milníky', pack: 'Growing Together', levels: 1, age: 'child' },
        // Teenagerské
        { name: 'První polibek', en: 'First Kiss', category: 'Teenagerské milníky', pack: 'Growing Together', levels: 1, age: 'teen' },
        { name: 'První brigáda', en: 'First Job', category: 'Teenagerské milníky', pack: 'Growing Together', levels: 1, age: 'teen' },
        { name: 'Dokončení střední školy', en: 'Graduated High School', category: 'Teenagerské milníky', pack: 'Growing Together', levels: 1, age: 'teen' },
        // Dospělé
        { name: 'První milování', en: 'First Woohoo', category: 'Dospělé milníky', pack: 'Growing Together', levels: 1, age: 'adult' },
        { name: 'Svatba', en: 'Got Married', category: 'Dospělé milníky', pack: 'Growing Together', levels: 1, age: 'adult' },
        { name: 'Narození dítěte', en: 'Had a Baby', category: 'Dospělé milníky', pack: 'Growing Together', levels: 1, age: 'adult' },
        { name: 'Koupě prvního domu', en: 'Bought First Home', category: 'Dospělé milníky', pack: 'Growing Together', levels: 1, age: 'adult' },
        { name: 'Dosažení vrcholu kariéry', en: 'Reached Career Top', category: 'Dospělé milníky', pack: 'Growing Together', levels: 1, age: 'adult' }
      ]
    }
  ]
};

// Validate against packs.json
const packsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'packs.json'), 'utf8'));
const validPackNames = new Set(packsData.packs.map((p) => p.name));

let invalidPackCount = 0;
for (const s of supersim.sections) {
  for (const i of s.items) {
    if (i.pack && !validPackNames.has(i.pack)) {
      console.error(`Invalid pack: "${i.pack}" in section ${s.id}, item: "${i.name}"`);
      invalidPackCount++;
    }
  }
}

if (invalidPackCount === 0) {
  const targetPath = path.join(__dirname, '..', 'public', 'data', 'supersim.json');
  fs.writeFileSync(targetPath, JSON.stringify(supersim, null, 2), 'utf8');
  console.log('Successfully written supersim.json with', supersim.sections.length, 'sections!');
} else {
  console.error('Validation failed. Supersim data was NOT written.');
  process.exit(1);
}