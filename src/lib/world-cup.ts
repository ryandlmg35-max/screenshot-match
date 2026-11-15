import { calculateMarketValueAndSalary, generateDetailedAttributes } from '@/data/club-metadata';
import {
  generateKnockoutPhaseMatches,
  generateRoundRobinSchedule,
  getPhaseNameForTeamCount,
  recalculateStandings,
  resolveKnockoutWinners,
  simulateMatch,
} from '@/lib/simulation-engine';
import type { Classificacao, Jogador, Partida, Posicao, Time } from '@/types/simulator';

export interface NationalTeamMeta {
  id: string;
  nome: string;
  sigla: string;
  flag: string;
  aliases: string[];
  baseElo: number;
}

export const WORLD_CUP_NATIONS: NationalTeamMeta[] = [
  { id: 'wc-bra', nome: 'Seleção Brasileira', sigla: 'BRA', flag: '🇧🇷', aliases: ['Brasil', 'Brazil'], baseElo: 1920 },
  { id: 'wc-arg', nome: 'Seleção Argentina', sigla: 'ARG', flag: '🇦🇷', aliases: ['Argentina'], baseElo: 1930 },
  { id: 'wc-fra', nome: 'Seleção Francesa', sigla: 'FRA', flag: '🇫🇷', aliases: ['França', 'France'], baseElo: 1915 },
  { id: 'wc-esp', nome: 'Seleção Espanhola', sigla: 'ESP', flag: '🇪🇸', aliases: ['Espanha', 'Spain'], baseElo: 1910 },
  { id: 'wc-eng', nome: 'Seleção Inglesa', sigla: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', aliases: ['Inglaterra', 'England'], baseElo: 1895 },
  { id: 'wc-ger', nome: 'Seleção Alemã', sigla: 'GER', flag: '🇩🇪', aliases: ['Alemanha', 'Germany'], baseElo: 1880 },
  { id: 'wc-por', nome: 'Seleção Portuguesa', sigla: 'POR', flag: '🇵🇹', aliases: ['Portugal'], baseElo: 1875 },
  { id: 'wc-ita', nome: 'Seleção Italiana', sigla: 'ITA', flag: '🇮🇹', aliases: ['Itália', 'Italy'], baseElo: 1865 },
  { id: 'wc-ned', nome: 'Seleção Holandesa', sigla: 'NED', flag: '🇳🇱', aliases: ['Holanda', 'Países Baixos', 'Netherlands'], baseElo: 1850 },
  { id: 'wc-bel', nome: 'Seleção Belga', sigla: 'BEL', flag: '🇧🇪', aliases: ['Bélgica', 'Belgium'], baseElo: 1825 },
  { id: 'wc-uru', nome: 'Seleção Uruguaia', sigla: 'URU', flag: '🇺🇾', aliases: ['Uruguai', 'Uruguay'], baseElo: 1835 },
  { id: 'wc-col', nome: 'Seleção Colombiana', sigla: 'COL', flag: '🇨🇴', aliases: ['Colômbia', 'Colombia'], baseElo: 1820 },
  { id: 'wc-cro', nome: 'Seleção Croata', sigla: 'CRO', flag: '🇭🇷', aliases: ['Croácia', 'Croatia'], baseElo: 1810 },
  { id: 'wc-usa', nome: 'Seleção Americana', sigla: 'USA', flag: '🇺🇸', aliases: ['Estados Unidos', 'USA'], baseElo: 1775 },
  { id: 'wc-mar', nome: 'Seleção Marroquina', sigla: 'MAR', flag: '🇲🇦', aliases: ['Marrocos', 'Morocco'], baseElo: 1790 },
  { id: 'wc-jpn', nome: 'Seleção Japonesa', sigla: 'JPN', flag: '🇯🇵', aliases: ['Japão', 'Japan'], baseElo: 1780 },
];

const SQUAD_SLOTS: Array<{ pos: Posicao; count: number }> = [
  { pos: 'GOL', count: 3 },
  { pos: 'ZAG', count: 4 },
  { pos: 'LAT', count: 4 },
  { pos: 'VOL', count: 3 },
  { pos: 'MEI', count: 3 },
  { pos: 'PON', count: 3 },
  { pos: 'ATA', count: 3 },
];

export interface WorldCupState {
  teams: Array<Time & { flag: string }>;
  callups: Record<string, Jogador[]>;
  groups: Record<string, string[]>;
  partidas: Partida[];
  standings: Classificacao[];
  championId: string | null;
}

export function buildWorldCupTournament(allPlayers: Jogador[]): WorldCupState {
  const teams: Array<Time & { flag: string }> = [];
  const callups: Record<string, Jogador[]> = {};

  for (const nation of WORLD_CUP_NATIONS) {
    const aliasSet = new Set(nation.aliases.map((a) => a.toLowerCase()));
    const pool = allPlayers
      .filter((j) => aliasSet.has(j.nacionalidade.toLowerCase()))
      .sort((a, b) => b.overall - a.overall);

    const selected: Jogador[] = [];
    const usedIds = new Set<string>();

    for (const slot of SQUAD_SLOTS) {
      const candidates = pool.filter((j) => j.posicao === slot.pos && !usedIds.has(j.id));
      for (let i = 0; i < slot.count; i++) {
        if (candidates[i]) {
          selected.push(candidates[i]!);
          usedIds.add(candidates[i]!.id);
        } else {
          // Completa convocação caso não haja 23 atletas dessa nacionalidade no banco
          const ovr = Math.max(66, Math.round((nation.baseElo - 1200) / 10));
          const fakeId = `${nation.id}-gen-${slot.pos}-${i}`;
          const attrs = generateDetailedAttributes(fakeId, slot.pos, ovr, 24);
          const { valorMercado, salarioSemanal } = calculateMarketValueAndSalary(ovr, 24, nation.baseElo);
          selected.push({
            id: fakeId,
            time_id: nation.id,
            nome: `${nation.sigla} Convocado ${selected.length + 1}`,
            posicao: slot.pos,
            numero: selected.length + 1,
            nacionalidade: nation.aliases[0]!,
            idade: 24,
            overall: ovr,
            perna_dominante: 'Direita',
            ...attrs,
            forma_fisica: 95,
            moral: 85,
            amarelos_acumulados: 0,
            vermelhos_temporada: 0,
            suspenso_jogos: 0,
            lesionado_jogos: 0,
            lesao_descricao: null,
            salario_semanal: salarioSemanal,
            valor_mercado: valorMercado,
            contrato_fim_ano: 2028,
            historico_temporadas: [],
            timeline_ocorrencias: [],
          });
        }
      }
    }

    callups[nation.id] = selected;
    teams.push({
      id: nation.id,
      nome: nation.nome,
      sigla: nation.sigla,
      pais_id: 'intl',
      cidade: nation.aliases[0]!,
      estadio: 'Estádio da Copa',
      logo_url: '',
      elo_rating: nation.baseElo,
      estilo_tatico: 'posse',
      moral_elenco: 82,
      home_bonus: 1.0,
      orcamento: 0,
      titulos_historicos: [],
      forma_recente: [],
      flag: nation.flag,
    });
  }

  // Distribui em 4 grupos de 4 com cabeças de chave por Elo
  const sorted = [...teams].sort((a, b) => b.elo_rating - a.elo_rating);
  const groupNames = ['Grupo A', 'Grupo B', 'Grupo C', 'Grupo D'];
  const groups: Record<string, string[]> = {
    'Grupo A': [],
    'Grupo B': [],
    'Grupo C': [],
    'Grupo D': [],
  };
  sorted.forEach((t, idx) => {
    const pot = Math.floor(idx / 4);
    const col = idx % 4;
    const gIdx = pot % 2 === 0 ? col : 3 - col;
    groups[groupNames[gIdx]!]!.push(t.id);
  });

  const partidas: Partida[] = [];
  const entries: Array<{ time_id: string; grupo: string }> = [];
  for (const grp of groupNames) {
    const gTeams = groups[grp]!;
    gTeams.forEach((tid) => entries.push({ time_id: tid, grupo: grp }));
    partidas.push(...generateRoundRobinSchedule(gTeams, 'world-cup', 'wc-2026', false, grp, 1));
  }

  const standings = recalculateStandings(entries, partidas, 'world-cup', 'wc-2026', true);

  return {
    teams,
    callups,
    groups,
    partidas,
    standings,
    championId: null,
  };
}

export function simulateWorldCupStep(state: WorldCupState): WorldCupState {
  const teamsMap = new Map(state.teams.map((t) => [t.id, t]));
  const pending = state.partidas.filter((m) => !m.finalizada).sort((a, b) => a.rodada - b.rodada);

  let nextPartidas = [...state.partidas];
  if (pending.length > 0) {
    const round = pending[0]!.rodada;
    nextPartidas = state.partidas.map((m) => {
      if (m.finalizada || m.rodada !== round) return m;
      const home = teamsMap.get(m.time_casa_id);
      const away = teamsMap.get(m.time_fora_id);
      if (!home || !away) return m;
      const isKnockout = !m.fase.startsWith('Grupo');
      const res = simulateMatch({
        partida: m,
        timeCasa: home,
        timeFora: away,
        jogadoresCasa: state.callups[home.id] ?? [],
        jogadoresFora: state.callups[away.id] ?? [],
        allowPenalties: isKnockout,
      });
      return res.partida;
    });
  }

  const entries: Array<{ time_id: string; grupo: string }> = [];
  for (const [grp, ids] of Object.entries(state.groups)) {
    ids.forEach((tid) => entries.push({ time_id: tid, grupo: grp }));
  }

  const groupMatches = nextPartidas.filter((m) => m.fase.startsWith('Grupo'));
  const standings = recalculateStandings(entries, groupMatches, 'world-cup', 'wc-2026', true);

  // Avança para o mata-mata ou próxima fase se tudo finalizado
  const koMatches = nextPartidas.filter((m) => !m.fase.startsWith('Grupo'));
  let championId = state.championId;

  if (groupMatches.every((m) => m.finalizada) && koMatches.length === 0) {
    const firsts: string[] = [];
    const seconds: string[] = [];
    for (const grp of Object.keys(state.groups).sort()) {
      const rows = standings.filter((s) => s.grupo === grp);
      if (rows[0]) firsts.push(rows[0].time_id);
      if (rows[1]) seconds.push(rows[1].time_id);
    }
    const seeded: string[] = [];
    for (let i = 0; i < firsts.length; i++) {
      seeded.push(firsts[i]!, seconds[(i + 1) % seconds.length]!);
    }
    const maxR = Math.max(...groupMatches.map((m) => m.rodada));
    nextPartidas = [
      ...nextPartidas,
      ...generateKnockoutPhaseMatches(seeded, 'world-cup', 'wc-2026', 'Quartas de Final', maxR + 1, false),
    ];
  } else if (koMatches.length > 0) {
    const phases = Array.from(new Set(koMatches.map((m) => m.fase)));
    const lastPhase = phases[phases.length - 1]!;
    const lastMatches = koMatches.filter((m) => m.fase === lastPhase);
    if (lastMatches.every((m) => m.finalizada)) {
      const winners = resolveKnockoutWinners(lastMatches);
      if (lastPhase === 'Final' && winners[0]) {
        championId = winners[0];
      } else if (winners.length >= 2) {
        const nextPhase = getPhaseNameForTeamCount(winners.length);
        const maxR = Math.max(...nextPartidas.map((m) => m.rodada));
        nextPartidas = [
          ...nextPartidas,
          ...generateKnockoutPhaseMatches(winners, 'world-cup', 'wc-2026', nextPhase, maxR + 1, false),
        ];
      }
    }
  }

  return {
    ...state,
    partidas: nextPartidas,
    standings,
    championId,
  };
}
