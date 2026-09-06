'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PACKS_PATH = path.join(__dirname, '../public/data/packs.json');
const ICONS_DIR = path.join(__dirname, '../public/icons/packs');

fs.mkdirSync(ICONS_DIR, { recursive: true });

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Special mappings for packs whose Fandom wiki page or icon name differs
const SPECIAL_PAGE_MAP = {
  'Life and Death': 'The_Sims_4:_Life_%26_Death',
  'Star Wars: Journey to Batuu': 'The_Sims_4:_Star_Wars:_Journey_to_Batuu',
  'Kids Room Stuff': 'The_Sims_4:_Kids_Room_Stuff',
  'Bust the Dust Kit': 'Kits_for_The_Sims_4',
  'Country Kitchen Kit': 'Kits_for_The_Sims_4',
  'Throwback Fit Kit': 'Kits_for_The_Sims_4',
  'Courtyard Oasis Kit': 'Kits_for_The_Sims_4',
  'Industrial Loft Kit': 'Kits_for_The_Sims_4',
  'Fashion Street Kit': 'Kits_for_The_Sims_4',
  'Incheon Arrivals Kit': 'Kits_for_The_Sims_4',
  'Blooming Rooms Kit': 'Kits_for_The_Sims_4',
  'Modern Menswear Kit': 'Kits_for_The_Sims_4',
  'Carnaval Streetwear Kit': 'Kits_for_The_Sims_4',
  'Decor to the Max Kit': 'Kits_for_The_Sims_4',
  'Little Campers Kit': 'Kits_for_The_Sims_4',
  'Moonlight Chic Kit': 'Kits_for_The_Sims_4',
  'First Fits Kit': 'Kits_for_The_Sims_4',
  'Desert Luxe Kit': 'Kits_for_The_Sims_4',
  'Everyday Clutter Kit': 'Kits_for_The_Sims_4',
  'Pastel Pop Kit': 'Kits_for_The_Sims_4',
  'Bathroom Clutter Kit': 'Kits_for_The_Sims_4',
  'Simtimates Collection Kit': 'Kits_for_The_Sims_4',
  'Basement Treasures Kit': 'Kits_for_The_Sims_4',
  'Greenhouse Haven Kit': 'Kits_for_The_Sims_4',
  'Grunge Revival Kit': 'Kits_for_The_Sims_4',
  'Book Nook Kit': 'Kits_for_The_Sims_4',
  'Modern Luxe Kit': 'Kits_for_The_Sims_4',
  'Poolside Splash Kit': 'Kits_for_The_Sims_4',
  'Castle Estate Kit': 'Kits_for_The_Sims_4',
  'Goth Galore Kit': 'Kits_for_The_Sims_4',
  'Party Essentials Kit': 'Kits_for_The_Sims_4',
  'Urban Homage Kit': 'Kits_for_The_Sims_4',
  'Riviera Retreat Kit': 'Kits_for_The_Sims_4',
  'Cozy Bistro Kit': 'Kits_for_The_Sims_4',
  'Artist Studio Kit': 'Kits_for_The_Sims_4',
  'Storybook Nursery Kit': 'Kits_for_The_Sims_4',
  'Comfy Gamer Kit': 'Kits_for_The_Sims_4',
  'Secret Sanctuary Kit': 'Kits_for_The_Sims_4',
  'Casanova Cave Kit': 'Kits_for_The_Sims_4',
  'Golden Years Kit': 'Kits_for_The_Sims_4',
  'Kitchen Clutter Kit': 'Kits_for_The_Sims_4',
  'Restoration Workshop Kit': 'Kits_for_The_Sims_4',
};

async function getKitsMapping() {
  const mapping = {};
  try {
    const res = await fetch('https://sims.fandom.com/api.php?action=parse&page=Kits_for_The_Sims_4&prop=wikitext&format=json');
    const d = await res.json();
    const text = d.parse?.wikitext?.['*'] || '';
    const regex = /\[\[File:([^\n|\]]+\.png)[^\]]*\]\]\s*['*]+(?:The Sims 4:\s*)?([^'\n]+)['*]+/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const file = match[1].trim();
      const name = match[2].trim().replace(/^The Sims 4:\s*/i, '');
      const key = slugify(name);
      if (!mapping[key]) mapping[key] = file;
    }
  } catch (err) {
    console.error('Failed to parse Kits page:', err.message);
  }
  return mapping;
}

async function resolveImageUrl(fileName) {
  const url = `https://sims.fandom.com/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.imageinfo?.[0]?.url || null;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

function generateSvgFallback(name, category) {
  const colorMap = {
    expansion: '#4a2fb3',
    gamepack: '#0284c7',
    stuffpack: '#059669',
    kit: '#d97706',
  };
  const bg = colorMap[category] || '#6d4bd6';
  const label = (category === 'expansion' ? 'EP' : category === 'gamepack' ? 'GP' : category === 'stuffpack' ? 'SP' : 'KIT');
  const shortName = name.slice(0, 3).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect width="64" height="64" rx="14" fill="${bg}"/>
    <rect x="3" y="3" width="58" height="58" rx="11" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
    <text x="32" y="26" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.75)" font-family="system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="1">${label}</text>
    <text x="32" y="44" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="system-ui, sans-serif" font-size="15" font-weight="900">${shortName}</text>
  </svg>`;
}

async function main() {
  const rawPacks = JSON.parse(fs.readFileSync(PACKS_PATH, 'utf8'));
  const packs = rawPacks.packs;
  console.log(`Starting pack icon fetch for ${packs.length} packs...`);

  const kitsMapping = await getKitsMapping();
  console.log(`Loaded ${Object.keys(kitsMapping).length} kits from wikitext.`);

  let downloadedCount = 0;
  let fallbackCount = 0;

  for (let i = 0; i < packs.length; i += 1) {
    const pack = packs[i];
    const slug = slugify(pack.name);
    const pngPath = path.join(ICONS_DIR, `${slug}.png`);
    const svgPath = path.join(ICONS_DIR, `${slug}.svg`);

    // If icon already exists, link it
    if (fs.existsSync(pngPath)) {
      pack.icon = `icons/packs/${slug}.png`;
      downloadedCount += 1;
      continue;
    }
    if (fs.existsSync(svgPath)) {
      pack.icon = `icons/packs/${slug}.svg`;
      fallbackCount += 1;
      continue;
    }

    let iconFileName = kitsMapping[slug] || null;

    if (!iconFileName) {
      // Find from dedicated Fandom page
      let pageTitle = SPECIAL_PAGE_MAP[pack.name];
      if (!pageTitle) {
        pageTitle = 'The_Sims_4:_' + pack.name.replace(/\s+/g, '_');
        if (pack.category === 'stuffpack' && !pageTitle.toLowerCase().includes('stuff')) {
          pageTitle += '_Stuff';
        }
      }

      try {
        const parseUrl = `https://sims.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=images&format=json`;
        const res = await fetch(parseUrl);
        const data = await res.json();
        const images = data.parse?.images || [];
        iconFileName = images.find((x) => /icon/i.test(x) && !/star_trophy|ts4_icon|fandom|button/i.test(x));
      } catch {}
    }

    if (iconFileName) {
      try {
        const imgUrl = await resolveImageUrl(iconFileName);
        if (imgUrl) {
          await downloadFile(imgUrl, pngPath);
          pack.icon = `icons/packs/${slug}.png`;
          downloadedCount += 1;
          console.log(`[${i + 1}/${packs.length}] Downloaded: ${pack.name} -> ${slug}.png`);
          await sleep(100);
          continue;
        }
      } catch (err) {
        console.warn(`Failed downloading ${iconFileName} for ${pack.name}:`, err.message);
      }
    }

    // Fallback: create beautiful SVG badge
    fs.writeFileSync(svgPath, generateSvgFallback(pack.name, pack.category), 'utf8');
    pack.icon = `icons/packs/${slug}.svg`;
    fallbackCount += 1;
    console.log(`[${i + 1}/${packs.length}] Generated fallback badge: ${pack.name}`);
  }

  fs.writeFileSync(PACKS_PATH, JSON.stringify({ packs }, null, 2), 'utf8');
  console.log(`\nFinished! Downloaded ${downloadedCount} icons, created ${fallbackCount} fallback badges.`);
}

main().catch(console.error);

