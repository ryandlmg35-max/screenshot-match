import type { Competicao, Pais, Temporada } from '@/types/simulator';

export const PAISES: Pais[] = [
  { id: 'bra', nome: 'Brasil', continente: 'América do Sul', codigo_iso: 'BR' },
  { id: 'eng', nome: 'Inglaterra', continente: 'Europa', codigo_iso: 'GB-ENG' },
  { id: 'esp', nome: 'Espanha', continente: 'Europa', codigo_iso: 'ES' },
  { id: 'ita', nome: 'Itália', continente: 'Europa', codigo_iso: 'IT' },
  { id: 'ger', nome: 'Alemanha', continente: 'Europa', codigo_iso: 'DE' },
  { id: 'fra', nome: 'França', continente: 'Europa', codigo_iso: 'FR' },
  { id: 'por', nome: 'Portugal', continente: 'Europa', codigo_iso: 'PT' },
  { id: 'intl', nome: 'Internacional', continente: 'Global', codigo_iso: 'UN' },
];

export const COMPETICOES: Competicao[] = [
  // Brasil
  { id: 'bra-serie-a', nome: 'Brasileirão Série A', pais_id: 'bra', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'bra-serie-b', nome: 'Brasileirão Série B', pais_id: 'bra', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },
  { id: 'bra-copa', nome: 'Copa do Brasil', pais_id: 'bra', tipo: 'copa', divisao: null, formato: 'mata-mata' },

  // Inglaterra
  { id: 'eng-pl', nome: 'Premier League', pais_id: 'eng', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'eng-champ', nome: 'EFL Championship', pais_id: 'eng', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // Espanha
  { id: 'esp-laliga', nome: 'La Liga', pais_id: 'esp', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'esp-laliga2', nome: 'La Liga 2 (Segunda División)', pais_id: 'esp', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // Itália
  { id: 'ita-serie-a', nome: 'Serie A', pais_id: 'ita', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'ita-serie-b', nome: 'Serie B', pais_id: 'ita', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // Alemanha
  { id: 'ger-bundesliga', nome: 'Bundesliga', pais_id: 'ger', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'ger-bundesliga2', nome: '2. Bundesliga', pais_id: 'ger', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // França
  { id: 'fra-ligue1', nome: 'Ligue 1', pais_id: 'fra', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'fra-ligue2', nome: 'Ligue 2', pais_id: 'fra', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // Portugal
  { id: 'por-primeira', nome: 'Primeira Liga', pais_id: 'por', tipo: 'liga', divisao: 1, formato: 'pontos-corridos' },
  { id: 'por-segunda', nome: 'Liga Portugal 2', pais_id: 'por', tipo: 'liga', divisao: 2, formato: 'pontos-corridos' },

  // Continentais / Internacionais
  { id: 'conmebol-lib', nome: 'Copa Libertadores', pais_id: 'intl', tipo: 'continental', divisao: null, formato: 'grupos' },
  { id: 'conmebol-sula', nome: 'Copa Sul-Americana', pais_id: 'intl', tipo: 'continental', divisao: null, formato: 'grupos' },
  { id: 'uefa-ucl', nome: 'UEFA Champions League', pais_id: 'intl', tipo: 'continental', divisao: null, formato: 'grupos' },
  { id: 'uefa-uel', nome: 'UEFA Europa League', pais_id: 'intl', tipo: 'continental', divisao: null, formato: 'grupos' },
  { id: 'fifa-cwc', nome: 'Copa do Mundo de Clubes', pais_id: 'intl', tipo: 'continental', divisao: null, formato: 'grupos' },
];

export const TEMPORADAS: Temporada[] = COMPETICOES.map((c) => {
  const isCalendarYear = c.pais_id === 'bra' || c.id === 'conmebol-lib' || c.id === 'conmebol-sula' || c.id === 'fifa-cwc';
  return {
    id: `${c.id}-2026`,
    competicao_id: c.id,
    ano_inicio: 2026,
    ano_fim: isCalendarYear ? 2026 : 2027,
    ativa: true,
  };
});
