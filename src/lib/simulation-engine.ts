import type {
  Artilharia,
  Classificacao,
  EscalacaoJogador,
  EstatisticasPartida,
  EventoPartida,
  Jogador,
  Partida,
  Posicao,
  Sumula,
  Time,
} from '@/types/simulator';

const GOAL_WEIGHT_BY_POS: Record<Posicao, number> = {
  ATA: 4.4,
  PON: 3.3,
  MEI: 2.4,
  VOL: 0.9,
  LAT: 0.65,
  ZAG: 0.45,
  GOL: 0.005,
};

const ASSIST_WEIGHT_BY_POS: Record<Posicao, number> = {
  MEI: 3.8,
  PON: 3.4,
  LAT: 2.3,
  ATA: 2.0,
  VOL: 1.5,
  ZAG: 0.4,
  GOL: 0.05,
};

/**
 * Seleciona os 11 titulares respeitando uma formação tática equilibrada (4-3-3).
 */
export function selectStartingXI(jogadores: Jogador[]): EscalacaoJogador[] {
  if (jogadores.length === 0) return [];
  const pool = [...jogadores].sort((a, b) => b.overall - a.overall);
  const picked = new Set<string>();
  const xi: Jogador[] = [];

  const quotas: Array<[Posicao[], number]> = [
    [['GOL'], 1],
    [['ZAG'], 2],
    [['LAT'], 2],
    [['VOL'], 1],
    [['MEI'], 2],
    [['PON'], 2],
    [['ATA'], 1],
  ];

  for (const [positions, count] of quotas) {
    let added = 0;
    for (const p of pool) {
      if (added >= count) break;
      if (!picked.has(p.id) && positions.includes(p.posicao)) {
        picked.add(p.id);
        xi.push(p);
        added++;
      }
    }
  }

  for (const p of pool) {
    if (xi.length >= 11) break;
    if (!picked.has(p.id)) {
      picked.add(p.id);
      xi.push(p);
    }
  }

  const posOrder: Record<Posicao, number> = {
    GOL: 1,
    LAT: 2,
    ZAG: 3,
    VOL: 4,
    MEI: 5,
    PON: 6,
    ATA: 7,
  };

  return xi
    .sort((a, b) => posOrder[a.posicao] - posOrder[b.posicao])
    .map((j) => ({
      id: j.id,
      nome: j.nome,
      posicao: j.posicao,
      numero: j.numero,
      overall: j.overall,
    }));
}

export function calculateAverageOverall(titulares: EscalacaoJogador[]): number {
  if (titulares.length === 0) return 70;
  const total = titulares.reduce((acc, j) => acc + j.overall, 0);
  return Math.round((total / titulares.length) * 10) / 10;
}

/**
 * Amostragem de Poisson (algoritmo de Knuth) para gerar número realista de gols.
 */
export function poissonRandom(lambda: number, rng: () => number = Math.random): number {
  const safeLambda = Math.max(0.15, Math.min(5.5, lambda));
  const L = Math.exp(-safeLambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function weightedPick<T>(items: T[], weights: number[], rng: () => number = Math.random): T {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[0]!;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export interface SimulateMatchInput {
  partida: Partida;
  timeCasa: Time;
  timeFora: Time;
  jogadoresCasa: Jogador[];
  jogadoresFora: Jogador[];
  allowPenalties?: boolean;
  aggregateCasaBefore?: number;
  aggregateForaBefore?: number;
  rng?: () => number;
}

export interface SimulateMatchResult {
  partida: Partida;
  eloCasaNovo: number;
  eloForaNovo: number;
}

/**
 * Simula uma partida completa com base no overall titular + fator casa + elo_rating,
 * utilizando distribuição de Poisson para gols e gerando súmula com marcadores e assistências.
 */
export function simulateMatch({
  partida,
  timeCasa,
  timeFora,
  jogadoresCasa,
  jogadoresFora,
  allowPenalties = false,
  aggregateCasaBefore = 0,
  aggregateForaBefore = 0,
  rng = Math.random,
}: SimulateMatchInput): SimulateMatchResult {
  const titularesCasa = selectStartingXI(jogadoresCasa);
  const titularesFora = selectStartingXI(jogadoresFora);

  const ovrCasa = calculateAverageOverall(titularesCasa);
  const ovrFora = calculateAverageOverall(titularesFora);

  // Força combinada: 65% overall titular + 35% Elo convertido para escala ~55-95
  const eloScaleCasa = 55 + ((timeCasa.elo_rating - 1200) / 800) * 35;
  const eloScaleFora = 55 + ((timeFora.elo_rating - 1200) / 800) * 35;

  const powerCasa = ovrCasa * 0.65 + eloScaleCasa * 0.35;
  const powerFora = ovrFora * 0.65 + eloScaleFora * 0.35;

  // Fator casa (~+2.8 pontos de força efetiva)
  const diff = powerCasa + 2.8 - powerFora;

  // Expectativa de gols (xG base 1.32 por time ajustada pela diferença de força)
  const lambdaCasa = Math.max(0.28, Math.min(3.8, 1.32 * Math.exp(diff * 0.052)));
  const lambdaFora = Math.max(0.22, Math.min(3.4, 1.18 * Math.exp(-diff * 0.052)));

  const golsCasa = poissonRandom(lambdaCasa, rng);
  const golsFora = poissonRandom(lambdaFora, rng);

  const eventos: EventoPartida[] = [];

  const gerarGols = (
    gols: number,
    teamId: string,
    titulares: EscalacaoJogador[],
  ) => {
    if (titulares.length === 0) return;
    const goalWeights = titulares.map(
      (j) => GOAL_WEIGHT_BY_POS[j.posicao] * Math.pow(Math.max(50, j.overall) / 70, 2.2),
    );
    for (let i = 0; i < gols; i++) {
      const scorer = weightedPick(titulares, goalWeights, rng);
      const assistPool = titulares.filter((j) => j.id !== scorer.id && j.posicao !== 'GOL');
      let assister: EscalacaoJogador | undefined;
      if (assistPool.length > 0 && rng() < 0.76) {
        const assistWeights = assistPool.map(
          (j) => ASSIST_WEIGHT_BY_POS[j.posicao] * Math.pow(Math.max(50, j.overall) / 70, 1.8),
        );
        assister = weightedPick(assistPool, assistWeights, rng);
      }
      eventos.push({
        minuto: Math.floor(rng() * 92) + 1,
        tipo: 'gol',
        time_id: teamId,
        jogador_id: scorer.id,
        jogador_nome: scorer.nome,
        ...(assister ? { assistencia_id: assister.id, assistencia_nome: assister.nome } : {}),
      });
    }
  };

  gerarGols(golsCasa, timeCasa.id, titularesCasa);
  gerarGols(golsFora, timeFora.id, titularesFora);

  // Cartões amarelos (1 a 3 por equipe)
  const gerarCartoes = (teamId: string, titulares: EscalacaoJogador[]) => {
    const outfield = titulares.filter((j) => j.posicao !== 'GOL');
    if (outfield.length === 0) return;
    const count = Math.floor(rng() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const player = outfield[Math.floor(rng() * outfield.length)]!;
      eventos.push({
        minuto: Math.floor(rng() * 90) + 1,
        tipo: 'cartao_amarelo',
        time_id: teamId,
        jogador_id: player.id,
        jogador_nome: player.nome,
      });
    }
  };

  gerarCartoes(timeCasa.id, titularesCasa);
  gerarCartoes(timeFora.id, titularesFora);

  eventos.sort((a, b) => a.minuto - b.minuto);

  // Pênaltis se necessário (empate no mata-mata)
  let penaltisCasa: number | null = null;
  let penaltisFora: number | null = null;
  let vencedorPenaltisId: string | null = null;

  const totalCasa = aggregateCasaBefore + golsCasa;
  const totalFora = aggregateForaBefore + golsFora;

  if (allowPenalties && totalCasa === totalFora) {
    let pCasa = 0;
    let pFora = 0;
    const probCasa = Math.min(0.84, Math.max(0.66, 0.75 + (ovrCasa - ovrFora) * 0.005));
    const probFora = Math.min(0.84, Math.max(0.66, 0.75 + (ovrFora - ovrCasa) * 0.005));

    for (let round = 1; round <= 5; round++) {
      if (rng() < probCasa) pCasa++;
      if (pCasa - pFora > 5 - round + 1) break;
      if (pFora - pCasa > 5 - round) break;
      if (rng() < probFora) pFora++;
      if (pCasa - pFora > 5 - round) break;
      if (pFora - pCasa > 5 - round) break;
    }

    while (pCasa === pFora) {
      const cHit = rng() < probCasa;
      const fHit = rng() < probFora;
      if (cHit) pCasa++;
      if (fHit) pFora++;
    }

    penaltisCasa = pCasa;
    penaltisFora = pFora;
    vencedorPenaltisId = pCasa > pFora ? timeCasa.id : timeFora.id;
  }

  // Estatísticas realistas da partida
  const posseBase = Math.round(Math.max(32, Math.min(68, 50 + diff * 1.15 + (rng() - 0.5) * 8)));
  const finCasa = Math.max(golsCasa + 2, Math.round(lambdaCasa * 8.2 + rng() * 5));
  const finFora = Math.max(golsFora + 2, Math.round(lambdaFora * 8.2 + rng() * 5));
  const finGolCasa = Math.max(golsCasa, Math.min(finCasa, Math.round(finCasa * 0.38 + golsCasa * 0.5)));
  const finGolFora = Math.max(golsFora, Math.min(finFora, Math.round(finFora * 0.38 + golsFora * 0.5)));

  const estatisticas: EstatisticasPartida = {
    posse_casa: posseBase,
    posse_fora: 100 - posseBase,
    finalizacoes_casa: finCasa,
    finalizacoes_fora: finFora,
    finalizacoes_gol_casa: finGolCasa,
    finalizacoes_gol_fora: finGolFora,
    xg_casa: Math.round(lambdaCasa * 100) / 100,
    xg_fora: Math.round(lambdaFora * 100) / 100,
    escanteios_casa: Math.max(1, Math.round(finCasa * 0.42 + rng() * 2)),
    escanteios_fora: Math.max(1, Math.round(finFora * 0.42 + rng() * 2)),
    faltas_casa: Math.floor(rng() * 9) + 8,
    faltas_fora: Math.floor(rng() * 9) + 8,
  };

  const sumula: Sumula = {
    overall_casa: ovrCasa,
    overall_fora: ovrFora,
    titulares_casa: titularesCasa,
    titulares_fora: titularesFora,
    eventos,
    estatisticas,
    vencedor_penaltis_id: vencedorPenaltisId,
  };

  // Atualização do Elo (K = 24)
  const expectedCasa = 1 / (1 + Math.pow(10, (timeFora.elo_rating - (timeCasa.elo_rating + 45)) / 400));
  const actualCasa = golsCasa > golsFora ? 1 : golsCasa === golsFora ? 0.5 : 0;
  const marginMult = Math.abs(golsCasa - golsFora) >= 2 ? 1.25 : 1;
  const delta = Math.round(24 * marginMult * (actualCasa - expectedCasa));

  return {
    partida: {
      ...partida,
      gols_casa: golsCasa,
      gols_fora: golsFora,
      penaltis_casa: penaltisCasa,
      penaltis_fora: penaltisFora,
      finalizada: true,
      sumula,
    },
    eloCasaNovo: Math.max(1150, Math.min(2150, timeCasa.elo_rating + delta)),
    eloForaNovo: Math.max(1150, Math.min(2150, timeFora.elo_rating - delta)),
  };
}

/**
 * Gera tabela de jogos de pontos corridos (turno e returno) pelo método de Berger.
 */
export function generateRoundRobinSchedule(
  timeIds: string[],
  competicaoId: string,
  temporadaId: string,
  doubleRoundRobin = true,
  fase = 'Temporada Regular',
  startRound = 1,
): Partida[] {
  const teams = [...timeIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const n = teams.length;
  const half = n / 2;
  const roundsFirstLeg: Array<Array<[string, string]>> = [];
  const fixed = teams[0]!;
  const rotating = teams.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[string, string]> = [];
    const current = [fixed, ...rotating];
    for (let i = 0; i < half; i++) {
      const home = current[i]!;
      const away = current[n - 1 - i]!;
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    roundsFirstLeg.push(pairs);
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  const partidas: Partida[] = [];
  const baseDate = new Date('2026-02-01T16:00:00Z');

  roundsFirstLeg.forEach((pairs, rIdx) => {
    const rodada = startRound + rIdx;
    const matchDate = new Date(baseDate.getTime() + (rodada - 1) * 7 * 86400000).toISOString();
    pairs.forEach(([home, away]) => {
      partidas.push({
        id: `${competicaoId}-${temporadaId}-r${rodada}-${home}-${away}`,
        competicao_id: competicaoId,
        temporada_id: temporadaId,
        time_casa_id: home,
        time_fora_id: away,
        gols_casa: null,
        gols_fora: null,
        penaltis_casa: null,
        penaltis_fora: null,
        rodada,
        fase,
        data: matchDate,
        finalizada: false,
        sumula: null,
      });
    });
  });

  if (doubleRoundRobin) {
    const offset = roundsFirstLeg.length;
    roundsFirstLeg.forEach((pairs, rIdx) => {
      const rodada = startRound + offset + rIdx;
      const matchDate = new Date(baseDate.getTime() + (rodada - 1) * 7 * 86400000).toISOString();
      pairs.forEach(([home, away]) => {
        partidas.push({
          id: `${competicaoId}-${temporadaId}-r${rodada}-${away}-${home}`,
          competicao_id: competicaoId,
          temporada_id: temporadaId,
          time_casa_id: away,
          time_fora_id: home,
          gols_casa: null,
          gols_fora: null,
          penaltis_casa: null,
          penaltis_fora: null,
          rodada,
          fase,
          data: matchDate,
          finalizada: false,
          sumula: null,
        });
      });
    });
  }

  return partidas;
}

export const KNOCKOUT_PHASES = [
  { name: 'Segunda Fase', size: 32 },
  { name: 'Oitavas de Final', size: 16 },
  { name: 'Quartas de Final', size: 8 },
  { name: 'Semifinal', size: 4 },
  { name: 'Final', size: 2 },
] as const;

export function getPhaseNameForTeamCount(count: number): string {
  if (count <= 2) return 'Final';
  if (count <= 4) return 'Semifinal';
  if (count <= 8) return 'Quartas de Final';
  if (count <= 16) return 'Oitavas de Final';
  return 'Segunda Fase';
}

/**
 * Gera confrontos de mata-mata para uma fase (ida e volta ou jogo único).
 */
export function generateKnockoutPhaseMatches(
  teamIds: string[],
  competicaoId: string,
  temporadaId: string,
  fase: string,
  startRound: number,
  twoLegged = true,
): Partida[] {
  const partidas: Partida[] = [];
  const baseDate = new Date('2026-04-01T19:30:00Z');
  const isFinal = fase === 'Final';
  const useTwoLegs = twoLegged && !isFinal;

  for (let i = 0; i + 1 < teamIds.length; i += 2) {
    const t1 = teamIds[i]!;
    const t2 = teamIds[i + 1]!;
    partidas.push({
      id: `${competicaoId}-${temporadaId}-${fase}-r${startRound}-${t1}-${t2}`,
      competicao_id: competicaoId,
      temporada_id: temporadaId,
      time_casa_id: t1,
      time_fora_id: t2,
      gols_casa: null,
      gols_fora: null,
      penaltis_casa: null,
      penaltis_fora: null,
      rodada: startRound,
      fase,
      data: new Date(baseDate.getTime() + (startRound - 1) * 7 * 86400000).toISOString(),
      finalizada: false,
      sumula: null,
    });

    if (useTwoLegs) {
      partidas.push({
        id: `${competicaoId}-${temporadaId}-${fase}-r${startRound + 1}-${t2}-${t1}`,
        competicao_id: competicaoId,
        temporada_id: temporadaId,
        time_casa_id: t2,
        time_fora_id: t1,
        gols_casa: null,
        gols_fora: null,
        penaltis_casa: null,
        penaltis_fora: null,
        rodada: startRound + 1,
        fase,
        data: new Date(baseDate.getTime() + startRound * 7 * 86400000).toISOString(),
        finalizada: false,
        sumula: null,
      });
    }
  }

  return partidas;
}

/**
 * Determina os vencedores de uma fase de mata-mata concluída.
 */
export function resolveKnockoutWinners(phaseMatches: Partida[]): string[] {
  const ties = new Map<string, Partida[]>();
  for (const m of phaseMatches) {
    const key = [m.time_casa_id, m.time_fora_id].sort().join('::');
    const arr = ties.get(key) ?? [];
    arr.push(m);
    ties.set(key, arr);
  }

  const winners: string[] = [];
  for (const matches of ties.values()) {
    if (!matches.every((m) => m.finalizada)) continue;
    const sorted = [...matches].sort((a, b) => a.rodada - b.rodada);
    const tA = sorted[0]!.time_casa_id;
    const tB = sorted[0]!.time_fora_id;

    let goalsA = 0;
    let goalsB = 0;
    for (const m of sorted) {
      if (m.time_casa_id === tA) {
        goalsA += m.gols_casa ?? 0;
        goalsB += m.gols_fora ?? 0;
      } else {
        goalsB += m.gols_casa ?? 0;
        goalsA += m.gols_fora ?? 0;
      }
    }

    if (goalsA > goalsB) {
      winners.push(tA);
    } else if (goalsB > goalsA) {
      winners.push(tB);
    } else {
      const last = sorted[sorted.length - 1]!;
      if (last.sumula?.vencedor_penaltis_id) {
        winners.push(last.sumula.vencedor_penaltis_id);
      } else if (last.penaltis_casa !== null && last.penaltis_fora !== null) {
        winners.push(last.penaltis_casa > last.penaltis_fora ? last.time_casa_id : last.time_fora_id);
      } else {
        winners.push(tA);
      }
    }
  }
  return winners;
}

/**
 * Recalcula toda a tabela de classificação de uma competição/temporada a partir das partidas finalizadas.
 */
export function recalculateStandings(
  teamEntries: Array<{ time_id: string; grupo?: string | null }>,
  partidas: Partida[],
  competicaoId: string,
  temporadaId: string,
  onlyGroupStage = false,
): Classificacao[] {
  const map = new Map<string, Classificacao>();
  for (const entry of teamEntries) {
    map.set(entry.time_id, {
      competicao_id: competicaoId,
      temporada_id: temporadaId,
      time_id: entry.time_id,
      grupo: entry.grupo ?? null,
      pontos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      gols_pro: 0,
      gols_contra: 0,
      saldo: 0,
    });
  }

  for (const p of partidas) {
    if (!p.finalizada || p.gols_casa === null || p.gols_fora === null) continue;
    if (onlyGroupStage && !p.fase.startsWith('Grupo') && p.fase !== 'Temporada Regular') continue;

    const casa = map.get(p.time_casa_id);
    const fora = map.get(p.time_fora_id);
    if (!casa || !fora) continue;

    casa.gols_pro += p.gols_casa;
    casa.gols_contra += p.gols_fora;
    fora.gols_pro += p.gols_fora;
    fora.gols_contra += p.gols_casa;

    if (p.gols_casa > p.gols_fora) {
      casa.vitorias += 1;
      casa.pontos += 3;
      fora.derrotas += 1;
    } else if (p.gols_fora > p.gols_casa) {
      fora.vitorias += 1;
      fora.pontos += 3;
      casa.derrotas += 1;
    } else {
      casa.empates += 1;
      casa.pontos += 1;
      fora.empates += 1;
      fora.pontos += 1;
    }

    casa.saldo = casa.gols_pro - casa.gols_contra;
    fora.saldo = fora.gols_pro - fora.gols_contra;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    return b.gols_pro - a.gols_pro;
  });
}

/**
 * Recalcula artilharia e assistências a partir das súmulas das partidas finalizadas.
 */
export function recalculateTopScorers(
  partidas: Partida[],
  competicaoId: string,
  temporadaId: string,
): Artilharia[] {
  const map = new Map<string, Artilharia>();

  const ensure = (jogadorId: string) => {
    let row = map.get(jogadorId);
    if (!row) {
      row = {
        jogador_id: jogadorId,
        competicao_id: competicaoId,
        temporada_id: temporadaId,
        gols: 0,
        assistencias: 0,
      };
      map.set(jogadorId, row);
    }
    return row;
  };

  for (const p of partidas) {
    if (!p.finalizada || !p.sumula) continue;
    for (const ev of p.sumula.eventos) {
      if (ev.tipo === 'gol') {
        ensure(ev.jogador_id).gols += 1;
        if (ev.assistencia_id) {
          ensure(ev.assistencia_id).assistencias += 1;
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.gols !== a.gols) return b.gols - a.gols;
    return b.assistencias - a.assistencias;
  });
}
