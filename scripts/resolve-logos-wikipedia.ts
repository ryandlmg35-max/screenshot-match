import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_CLUB_SEEDS } from '../src/data/seed-builder';

const UA = 'FootballSimLogoResolver/1.0 (https://github.com/ryandlmg35-max/screenshot-match)';

async function isImageOk(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Range: 'bytes=0-1024' },
    });
    if (!res.ok && res.status !== 206) return false;
    const ct = res.headers.get('content-type') ?? '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

async function searchWikipediaLogo(clubName: string, wikiLang: 'en' | 'pt'): Promise<string | null> {
  try {
    // 1. Search Wikipedia article
    const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=3&format=json&srsearch=${encodeURIComponent(clubName + ' football')}`;
    const sRes = await fetch(searchUrl, { headers: { 'User-Agent': UA } });
    if (!sRes.ok) return null;
    const sData = (await sRes.json()) as { query?: { search?: Array<{ title: string }> } };
    const title = sData.query?.search?.[0]?.title;
    if (!title) return null;

    // 2. Get pageimages (often the club crest!) or images on the page
    const imgUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&imlimit=20&format=json`;
    const iRes = await fetch(imgUrl, { headers: { 'User-Agent': UA } });
    if (!iRes.ok) return null;
    const iData = (await iRes.json()) as {
      query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
    };
    const pages = Object.values(iData.query?.pages ?? {});
    const images = pages[0]?.images ?? [];

    // Prioritize files with logo/crest/escudo/badge/emblem/wappen in filename
    const candidates = images
      .map((im) => im.title)
      .filter((t) => /\.(svg|png|webp)$/i.test(t))
      .filter((t) => !/commons-logo|wiki|ambox|flag|kit|jersey|adidas|nike|puma|umbro|soccerball|trophy|medal|cup|arrow|check|cross|question/i.test(t))
      .sort((a, b) => {
        const score = (s: string) =>
          (/logo|crest|escudo|badge|emblem|wappen|blason/i.test(s) ? 10 : 0) +
          (/\.svg$/i.test(s) ? 2 : 0);
        return score(b) - score(a);
      });

    for (const fileTitle of candidates.slice(0, 4)) {
      const infoUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json`;
      const fRes = await fetch(infoUrl, { headers: { 'User-Agent': UA } });
      if (!fRes.ok) continue;
      const fData = (await fRes.json()) as {
        query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string }> }> };
      };
      const fileUrl = Object.values(fData.query?.pages ?? {})[0]?.imageinfo?.[0]?.url;
      if (fileUrl && (await isImageOk(fileUrl))) {
        return fileUrl;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const existingPath = resolve(process.cwd(), 'src/data/verified-logos.json');
  const existing: Record<string, string> = JSON.parse(readFileSync(existingPath, 'utf8'));

  let validCount = 0;
  let fixedCount = 0;
  let missingCount = 0;

  for (let i = 0; i < ALL_CLUB_SEEDS.length; i++) {
    const club = ALL_CLUB_SEEDS[i]!;
    const currentUrl = existing[club.id] ?? club.logo_url;

    if (await isImageOk(currentUrl)) {
      existing[club.id] = currentUrl;
      validCount++;
    } else {
      const langOrder: Array<'en' | 'pt'> =
        club.pais_id === 'bra' || club.pais_id === 'por' ? ['pt', 'en'] : ['en', 'pt'];
      let found: string | null = null;
      for (const lang of langOrder) {
        found = await searchWikipediaLogo(club.nome, lang);
        if (found) break;
      }
      if (found) {
        existing[club.id] = found;
        fixedCount++;
      } else {
        missingCount++;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    if ((i + 1) % 20 === 0 || i === ALL_CLUB_SEEDS.length - 1) {
      console.log(
        `Progress ${i + 1}/${ALL_CLUB_SEEDS.length} | valid=${validCount} fixed=${fixedCount} missing=${missingCount}`,
      );
    }
  }

  writeFileSync(existingPath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`Final: ${validCount + fixedCount}/${ALL_CLUB_SEEDS.length} logos verified!`);
}

void main();
