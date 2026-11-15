import type {
  AtributosJogador,
  EstiloTatico,
  Posicao,
  TituloHistorico,
} from '@/types/simulator';

export const RIVALRIES: Array<[string, string, string]> = [
  // Brasil
  ['bra-flamengo', 'bra-vasco', 'Clássico dos Milhões'],
  ['bra-flamengo', 'bra-fluminense', 'Fla-Flu'],
  ['bra-flamengo', 'bra-botafogo', 'Clássico da Rivalidade'],
  ['bra-fluminense', 'bra-vasco', 'Clássico dos Gigantes'],
  ['bra-botafogo', 'bra-vasco', 'Clássico da Amizade'],
  ['bra-palmeiras', 'bra-corinthians', 'Derby Paulista'],
  ['bra-sao-paulo', 'bra-corinthians', 'Majestoso'],
  ['bra-palmeiras', 'bra-sao-paulo', 'Choque-Rei'],
  ['bra-santos', 'bra-corinthians', 'Clássico Alvinegro'],
  ['bra-santos', 'bra-palmeiras', 'Clássico da Saudade'],
  ['bra-santos', 'bra-sao-paulo', 'San-São'],
  ['bra-gremio', 'bra-internacional', 'Grenal'],
  ['bra-atletico-mg', 'bra-cruzeiro', 'Clássico Mineiro'],
  ['bra-bahia', 'bra-vitoria', 'Ba-Vi'],
  ['bra-athletico-pr', 'bra-coritiba', 'Atletiba'],
  ['bra-ceara', 'bra-fortaleza', 'Clássico-Rei'],
  ['bra-goias', 'bra-vila-nova', 'Derby do Cerrado'],
  // Inglaterra
  ['eng-arsenal', 'eng-tottenham', 'North London Derby'],
  ['eng-arsenal', 'eng-chelsea', 'London Derby'],
  ['eng-liverpool', 'eng-man-utd', 'North West Derby'],
  ['eng-liverpool', 'eng-everton', 'Merseyside Derby'],
  ['eng-man-city', 'eng-man-utd', 'Manchester Derby'],
  ['eng-newcastle', 'eng-sunderland', 'Tyne-Wear Derby'],
  // Espanha
  ['esp-real-madrid', 'esp-barcelona', 'El Clásico'],
  ['esp-real-madrid', 'esp-atletico', 'Derbi Madrileño'],
  ['esp-barcelona', 'esp-espanyol', 'Derbi Barceloní'],
  ['esp-betis', 'esp-sevilla', 'El Gran Derbi'],
  ['esp-athletic', 'esp-real-sociedad', 'Euskal Derbia'],
  // Itália
  ['ita-inter', 'ita-milan', 'Derby della Madonnina'],
  ['ita-inter', 'ita-juventus', 'Derby d\'Italia'],
  ['ita-roma', 'ita-lazio', 'Derby della Capitale'],
  ['ita-juventus', 'ita-torino', 'Derby della Mole'],
  ['ita-genoa', 'ita-sampdoria', 'Derby della Lanterna'],
  // Alemanha
  ['ger-bayern', 'ger-dortmund', 'Der Klassiker'],
  ['ger-dortmund', 'ger-schalke', 'Revierderby'],
  // França
  ['fra-psg', 'fra-marseille', 'Le Classique'],
  ['fra-lyon', 'fra-st-etienne', 'Derby du Rhône'],
  // Portugal
  ['por-benfica', 'por-porto', 'O Clássico'],
  ['por-benfica', 'por-sporting', 'Derby de Lisboa'],
  ['por-porto', 'por-sporting', 'Clássico Porto-Sporting'],
  // América do Sul
  ['arg-river', 'arg-boca', 'Superclásico'],
  ['arg-racing', 'arg-independiente', 'Clásico de Avellaneda'],
  ['uru-penarol', 'uru-nacional', 'Clásico del Fútbol Uruguayo'],
];

export function getRivalryName(teamA: string, teamB: string): string | null {
  for (const [a, b, label] of RIVALRIES) {
    if ((a === teamA && b === teamB) || (a === teamB && b === teamA)) {
      return label;
    }
  }
  return null;
}

export const CLUB_TACTICS_MAP: Record<string, EstiloTatico> = {
  'bra-flamengo': 'posse',
  'bra-palmeiras': 'pressao-alta',
  'bra-botafogo': 'contra-ataque',
  'bra-bahia': 'posse',
  'bra-internacional': 'pressao-alta',
  'bra-sao-paulo': 'posse',
  'bra-atletico-mg': 'posse',
  'bra-cruzeiro': 'pressao-alta',
  'bra-corinthians': 'contra-ataque',
  'bra-fluminense': 'posse',
  'bra-gremio': 'contra-ataque',
  'bra-vasco': 'contra-ataque',
  'bra-fortaleza': 'contra-ataque',
  'eng-man-city': 'posse',
  'eng-arsenal': 'pressao-alta',
  'eng-liverpool': 'pressao-alta',
  'eng-chelsea': 'posse',
  'eng-aston-villa': 'contra-ataque',
  'eng-tottenham': 'pressao-alta',
  'eng-everton': 'retranca',
  'esp-barcelona': 'pressao-alta',
  'esp-real-madrid': 'contra-ataque',
  'esp-atletico': 'retranca',
  'esp-getafe': 'retranca',
  'esp-athletic': 'pressao-alta',
  'ita-inter': 'posse',
  'ita-napoli': 'pressao-alta',
  'ita-atalanta': 'pressao-alta',
  'ita-juventus': 'retranca',
  'ita-milan': 'contra-ataque',
  'ger-bayern': 'pressao-alta',
  'ger-leverkusen': 'posse',
  'ger-dortmund': 'contra-ataque',
  'fra-psg': 'posse',
  'por-sporting': 'pressao-alta',
  'por-benfica': 'posse',
  'por-porto': 'pressao-alta',
};

export function inferClubTactic(clubId: string, elo: number): EstiloTatico {
  if (CLUB_TACTICS_MAP[clubId]) return CLUB_TACTICS_MAP[clubId]!;
  if (elo >= 1800) return 'posse';
  if (elo >= 1680) return 'pressao-alta';
  if (elo >= 1560) return 'contra-ataque';
  return 'retranca';
}

export function inferHomeBonus(clubId: string, elo: number): number {
  const fortressClubs = new Set([
    'bra-flamengo', 'bra-palmeiras', 'bra-atletico-mg', 'bra-internacional',
    'bra-gremio', 'eng-liverpool', 'eng-arsenal', 'eng-newcastle',
    'esp-real-madrid', 'esp-barcelona', 'esp-athletic', 'ita-napoli',
    'ita-inter', 'ger-dortmund', 'ger-bayern', 'arg-boca', 'arg-river',
  ]);
  if (fortressClubs.has(clubId)) return 3.4;
  if (elo >= 1750) return 3.0;
  if (elo >= 1600) return 2.7;
  return 2.4;
}

export function inferClubBudget(paisId: string, elo: number): number {
  const baseEur = paisId === 'eng' ? 1.5 : paisId === 'esp' || paisId === 'ger' || paisId === 'ita' || paisId === 'fra' ? 1.15 : 0.45;
  const tierMult = elo >= 1850 ? 95_000_000 : elo >= 1750 ? 50_000_000 : elo >= 1650 ? 22_000_000 : elo >= 1550 ? 9_000_000 : 3_500_000;
  return Math.round(tierMult * baseEur);
}

export const CLUB_TITLES_MAP: Record<string, TituloHistorico[]> = {
  'bra-flamengo': [
    { competicao: 'Copa Libertadores', quantidade: 3, ultimo_ano: 2022 },
    { competicao: 'Brasileirão Série A', quantidade: 8, ultimo_ano: 2020 },
    { competicao: 'Copa do Brasil', quantidade: 5, ultimo_ano: 2024 },
  ],
  'bra-palmeiras': [
    { competicao: 'Copa Libertadores', quantidade: 3, ultimo_ano: 2021 },
    { competicao: 'Brasileirão Série A', quantidade: 12, ultimo_ano: 2023 },
    { competicao: 'Copa do Brasil', quantidade: 4, ultimo_ano: 2020 },
  ],
  'bra-sao-paulo': [
    { competicao: 'Copa Libertadores', quantidade: 3, ultimo_ano: 2005 },
    { competicao: 'Brasileirão Série A', quantidade: 6, ultimo_ano: 2008 },
    { competicao: 'Copa do Brasil', quantidade: 1, ultimo_ano: 2023 },
  ],
  'bra-santos': [
    { competicao: 'Copa Libertadores', quantidade: 3, ultimo_ano: 2011 },
    { competicao: 'Brasileirão Série A', quantidade: 8, ultimo_ano: 2004 },
    { competicao: 'Copa do Brasil', quantidade: 1, ultimo_ano: 2010 },
  ],
  'bra-corinthians': [
    { competicao: 'Copa Libertadores', quantidade: 1, ultimo_ano: 2012 },
    { competicao: 'Brasileirão Série A', quantidade: 7, ultimo_ano: 2017 },
    { competicao: 'Copa do Brasil', quantidade: 3, ultimo_ano: 2009 },
  ],
  'bra-gremio': [
    { competicao: 'Copa Libertadores', quantidade: 3, ultimo_ano: 2017 },
    { competicao: 'Brasileirão Série A', quantidade: 2, ultimo_ano: 1996 },
    { competicao: 'Copa do Brasil', quantidade: 5, ultimo_ano: 2016 },
  ],
  'bra-internacional': [
    { competicao: 'Copa Libertadores', quantidade: 2, ultimo_ano: 2010 },
    { competicao: 'Brasileirão Série A', quantidade: 3, ultimo_ano: 1979 },
    { competicao: 'Copa do Brasil', quantidade: 1, ultimo_ano: 1992 },
  ],
  'bra-cruzeiro': [
    { competicao: 'Copa Libertadores', quantidade: 2, ultimo_ano: 1997 },
    { competicao: 'Brasileirão Série A', quantidade: 4, ultimo_ano: 2014 },
    { competicao: 'Copa do Brasil', quantidade: 6, ultimo_ano: 2018 },
  ],
  'bra-atletico-mg': [
    { competicao: 'Copa Libertadores', quantidade: 1, ultimo_ano: 2013 },
    { competicao: 'Brasileirão Série A', quantidade: 3, ultimo_ano: 2021 },
    { competicao: 'Copa do Brasil', quantidade: 2, ultimo_ano: 2021 },
  ],
  'bra-botafogo': [
    { competicao: 'Copa Libertadores', quantidade: 1, ultimo_ano: 2024 },
    { competicao: 'Brasileirão Série A', quantidade: 3, ultimo_ano: 2024 },
  ],
  'bra-fluminense': [
    { competicao: 'Copa Libertadores', quantidade: 1, ultimo_ano: 2023 },
    { competicao: 'Brasileirão Série A', quantidade: 4, ultimo_ano: 2012 },
    { competicao: 'Copa do Brasil', quantidade: 1, ultimo_ano: 2007 },
  ],
  'bra-vasco': [
    { competicao: 'Copa Libertadores', quantidade: 1, ultimo_ano: 1998 },
    { competicao: 'Brasileirão Série A', quantidade: 4, ultimo_ano: 2000 },
    { competicao: 'Copa do Brasil', quantidade: 1, ultimo_ano: 2011 },
  ],
  'eng-liverpool': [
    { competicao: 'UEFA Champions League', quantidade: 6, ultimo_ano: 2019 },
    { competicao: 'Premier League / 1ª Div.', quantidade: 20, ultimo_ano: 2025 },
  ],
  'eng-man-utd': [
    { competicao: 'UEFA Champions League', quantidade: 3, ultimo_ano: 2008 },
    { competicao: 'Premier League / 1ª Div.', quantidade: 20, ultimo_ano: 2013 },
  ],
  'eng-arsenal': [
    { competicao: 'Premier League / 1ª Div.', quantidade: 14, ultimo_ano: 2026 },
  ],
  'eng-man-city': [
    { competicao: 'UEFA Champions League', quantidade: 1, ultimo_ano: 2023 },
    { competicao: 'Premier League / 1ª Div.', quantidade: 10, ultimo_ano: 2024 },
  ],
  'eng-chelsea': [
    { competicao: 'UEFA Champions League', quantidade: 2, ultimo_ano: 2021 },
    { competicao: 'Premier League / 1ª Div.', quantidade: 6, ultimo_ano: 2017 },
  ],
  'esp-real-madrid': [
    { competicao: 'UEFA Champions League', quantidade: 15, ultimo_ano: 2024 },
    { competicao: 'La Liga', quantidade: 36, ultimo_ano: 2024 },
  ],
  'esp-barcelona': [
    { competicao: 'UEFA Champions League', quantidade: 5, ultimo_ano: 2015 },
    { competicao: 'La Liga', quantidade: 28, ultimo_ano: 2025 },
  ],
  'esp-atletico': [
    { competicao: 'La Liga', quantidade: 11, ultimo_ano: 2021 },
    { competicao: 'UEFA Europa League', quantidade: 3, ultimo_ano: 2018 },
  ],
  'ita-juventus': [
    { competicao: 'UEFA Champions League', quantidade: 2, ultimo_ano: 1996 },
    { competicao: 'Serie A', quantidade: 36, ultimo_ano: 2020 },
  ],
  'ita-inter': [
    { competicao: 'UEFA Champions League', quantidade: 3, ultimo_ano: 2010 },
    { competicao: 'Serie A', quantidade: 21, ultimo_ano: 2026 },
  ],
  'ita-milan': [
    { competicao: 'UEFA Champions League', quantidade: 7, ultimo_ano: 2007 },
    { competicao: 'Serie A', quantidade: 19, ultimo_ano: 2022 },
  ],
  'ger-bayern': [
    { competicao: 'UEFA Champions League', quantidade: 6, ultimo_ano: 2020 },
    { competicao: 'Bundesliga', quantidade: 34, ultimo_ano: 2025 },
  ],
  'fra-psg': [
    { competicao: 'UEFA Champions League', quantidade: 1, ultimo_ano: 2025 },
    { competicao: 'Ligue 1', quantidade: 13, ultimo_ano: 2025 },
  ],
  'por-benfica': [
    { competicao: 'UEFA Champions League', quantidade: 2, ultimo_ano: 1962 },
    { competicao: 'Primeira Liga', quantidade: 38, ultimo_ano: 2023 },
  ],
  'por-porto': [
    { competicao: 'UEFA Champions League', quantidade: 2, ultimo_ano: 2004 },
    { competicao: 'Primeira Liga', quantidade: 30, ultimo_ano: 2026 },
  ],
  'por-sporting': [
    { competicao: 'Primeira Liga', quantidade: 21, ultimo_ano: 2025 },
  ],
  'arg-boca': [
    { competicao: 'Copa Libertadores', quantidade: 6, ultimo_ano: 2007 },
  ],
  'arg-river': [
    { competicao: 'Copa Libertadores', quantidade: 4, ultimo_ano: 2018 },
  ],
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clampAttr = (n: number) => Math.max(35, Math.min(97, Math.round(n)));

export function generateDetailedAttributes(
  id: string,
  posicao: Posicao,
  overall: number,
  idade: number,
): AtributosJogador {
  const h = hashSeed(id);
  const jitter = (shift: number) => (((h >> shift) & 7) - 3);
  const speedAgePenalty = idade > 32 ? (idade - 32) * 2.5 : 0;

  switch (posicao) {
    case 'GOL':
      return {
        finalizacao: clampAttr(25 + jitter(0)),
        passe: clampAttr(overall - 14 + jitter(3)),
        drible: clampAttr(35 + jitter(6)),
        velocidade: clampAttr(overall - 24 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall - 6 + jitter(12)),
        marcacao: clampAttr(40 + jitter(15)),
        visao_jogo: clampAttr(overall - 12 + jitter(18)),
        posicionamento: clampAttr(overall + 2 + jitter(21)),
        reflexos: clampAttr(overall + 4 + jitter(24)),
      };
    case 'ZAG':
      return {
        finalizacao: clampAttr(overall - 26 + jitter(0)),
        passe: clampAttr(overall - 8 + jitter(3)),
        drible: clampAttr(overall - 16 + jitter(6)),
        velocidade: clampAttr(overall - 9 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall + 5 + jitter(12)),
        marcacao: clampAttr(overall + 5 + jitter(15)),
        visao_jogo: clampAttr(overall - 10 + jitter(18)),
        posicionamento: clampAttr(overall + 3 + jitter(21)),
        reflexos: clampAttr(38 + jitter(24)),
      };
    case 'LAT':
      return {
        finalizacao: clampAttr(overall - 14 + jitter(0)),
        passe: clampAttr(overall - 2 + jitter(3)),
        drible: clampAttr(overall - 3 + jitter(6)),
        velocidade: clampAttr(overall + 5 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall - 5 + jitter(12)),
        marcacao: clampAttr(overall - 1 + jitter(15)),
        visao_jogo: clampAttr(overall - 4 + jitter(18)),
        posicionamento: clampAttr(overall - 2 + jitter(21)),
        reflexos: clampAttr(35 + jitter(24)),
      };
    case 'VOL':
      return {
        finalizacao: clampAttr(overall - 12 + jitter(0)),
        passe: clampAttr(overall + 2 + jitter(3)),
        drible: clampAttr(overall - 5 + jitter(6)),
        velocidade: clampAttr(overall - 5 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall + 3 + jitter(12)),
        marcacao: clampAttr(overall + 4 + jitter(15)),
        visao_jogo: clampAttr(overall + 1 + jitter(18)),
        posicionamento: clampAttr(overall + 2 + jitter(21)),
        reflexos: clampAttr(35 + jitter(24)),
      };
    case 'MEI':
      return {
        finalizacao: clampAttr(overall - 4 + jitter(0)),
        passe: clampAttr(overall + 5 + jitter(3)),
        drible: clampAttr(overall + 2 + jitter(6)),
        velocidade: clampAttr(overall - 3 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall - 8 + jitter(12)),
        marcacao: clampAttr(overall - 14 + jitter(15)),
        visao_jogo: clampAttr(overall + 6 + jitter(18)),
        posicionamento: clampAttr(overall + 1 + jitter(21)),
        reflexos: clampAttr(35 + jitter(24)),
      };
    case 'PON':
      return {
        finalizacao: clampAttr(overall + 1 + jitter(0)),
        passe: clampAttr(overall - 2 + jitter(3)),
        drible: clampAttr(overall + 5 + jitter(6)),
        velocidade: clampAttr(overall + 6 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall - 10 + jitter(12)),
        marcacao: clampAttr(overall - 25 + jitter(15)),
        visao_jogo: clampAttr(overall + jitter(18)),
        posicionamento: clampAttr(overall + 1 + jitter(21)),
        reflexos: clampAttr(35 + jitter(24)),
      };
    case 'ATA':
      return {
        finalizacao: clampAttr(overall + 6 + jitter(0)),
        passe: clampAttr(overall - 8 + jitter(3)),
        drible: clampAttr(overall - 1 + jitter(6)),
        velocidade: clampAttr(overall + 1 - speedAgePenalty + jitter(9)),
        forca_fisica: clampAttr(overall + 1 + jitter(12)),
        marcacao: clampAttr(overall - 30 + jitter(15)),
        visao_jogo: clampAttr(overall - 5 + jitter(18)),
        posicionamento: clampAttr(overall + 5 + jitter(21)),
        reflexos: clampAttr(35 + jitter(24)),
      };
  }
}

export function calculateMarketValueAndSalary(overall: number, idade: number, elo: number) {
  const ovrFactor = Math.pow(Math.max(1, overall - 52), 2.35);
  const ageFactor = idade <= 23 ? 1.35 : idade <= 28 ? 1.15 : idade <= 31 ? 0.85 : 0.45;
  const eloFactor = elo >= 1800 ? 1.4 : elo >= 1680 ? 1.0 : 0.65;
  const valorMercado = Math.max(150_000, Math.round((ovrFactor * 4200 * ageFactor * eloFactor) / 50_000) * 50_000);
  const salarioSemanal = Math.max(3_000, Math.round((valorMercado * 0.0045) / 1000) * 1000);
  return { valorMercado, salarioSemanal };
}
