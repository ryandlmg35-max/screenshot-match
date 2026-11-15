import {
  calculateMarketValueAndSalary,
  generateDetailedAttributes,
  getRivalryName,
} from '@/data/club-metadata';
import { getPhaseNameForTeamCount, generateKnockoutPhaseMatches, generateRoundRobinSchedule, recalculateStandings } from '@/lib/simulation-engine';
import type { SimulatorDataset } from '@/data/seed-builder';
import type { SimulateMatchResult } from '@/lib/simulation-engine';
import type {
  Classificacao,
  Jogador,
  OcorrenciaJogador,
  Partida,
  Posicao,
  Time,
  TimeCompeticao,
  Transferencia,
} from '@/types/simulator';

const RELEGATION_SPOTS: Record<string, number> = {
  bra: 4,
  eng: 3,
  esp: 3,
  ita: 3,
  ger: 3,
  fra: 3,
  por: 3,
};

const LEAGUE_PAIRS: Array<{ country: string; div1: string; div2: string }> = [
  { country: 'bra', div1: 'bra-serie-a', div2: 'bra-serie-b' },
  { country: 'eng', div1: 'eng-premier-league', div2: 'eng-championship' },
  { country: 'esp', div1: 'esp-la-liga', div2: 'esp-la-liga-2' },
  { country: 'ita', div1: 'ita-serie-a', div2: 'ita-serie-b' },
  { country: 'ger', div1: 'ger-bundesliga', div2: 'ger-2-bundesliga' },
  { country: 'fra', div1: 'fra-ligue-1', div2: 'fra-ligue-2' },
  { country: 'por', div1: 'por-primeira-liga', div2: 'por-liga-2' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sortStandings(rows: Classificacao[]): Classificacao[] {
  return [...rows].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    return b.gols_pro - a.gols_pro;
  });
}

/**
 * Aplica atualizações pós-partida em jogadores e clubes:
 * - Forma física e moral
 * - Acúmulo de cartões amarelos (3 -> suspensão automática) e vermelhos (1 -> suspensão)
 * - Novas lesões e recuperação de jogadores que ficaram de fora
 * - Moral do elenco e sequência de forma recente (V/E/D)
 */
export function applyPostMatchUpdates(
  dataset: SimulatorDataset,
  results: SimulateMatchResult[],
): SimulatorDataset {
  if (results.length === 0) return dataset;

  const compNameMap = new Map(dataset.competicoes.map((c) => [c.id, c.nome]));
  const timesMap = new Map(dataset.times.map((t) => [t.id, { ...t, forma_recente: [...(t.forma_recente ?? [])] }]));
  const jogadoresMap = new Map(
    dataset.jogadores.map((j) => [
      j.id,
      {
        ...j,
        timeline_ocorrencias: [...(j.timeline_ocorrencias ?? [])],
        historico_temporadas: [...(j.historico_temporadas ?? [])],
      },
    ]),
  );

  // Agrupa jogadores por time para saber quem ficou de fora (recuperação)
  const playersByTeam = new Map<string, string[]>();
  for (const j of jogadoresMap.values()) {
    const arr = playersByTeam.get(j.time_id) ?? [];
    arr.push(j.id);
    playersByTeam.set(j.time_id, arr);
  }

  for (const res of results) {
    const { partida, eloCasaNovo, eloForaNovo, novasLesoes, cartoesAplicados } = res;
    const home = timesMap.get(partida.time_casa_id);
    const away = timesMap.get(partida.time_fora_id);
    const compName = compNameMap.get(partida.competicao_id) ?? partida.competicao_id;
    const gc = partida.gols_casa ?? 0;
    const gf = partida.gols_fora ?? 0;

    if (home) {
      home.elo_rating = eloCasaNovo;
      const outcome: 'V' | 'E' | 'D' = gc > gf ? 'V' : gc === gf ? 'E' : 'D';
      home.forma_recente = [...home.forma_recente, outcome].slice(-5);
      const moralDelta = outcome === 'V' ? (gc - gf >= 3 ? 5 : 3) : outcome === 'E' ? 0 : gf - gc >= 3 ? -5 : -3;
      home.moral_elenco = clamp((home.moral_elenco ?? 75) + moralDelta, 35, 99);
    }

    if (away) {
      away.elo_rating = eloForaNovo;
      const outcome: 'V' | 'E' | 'D' = gf > gc ? 'V' : gf === gc ? 'E' : 'D';
      away.forma_recente = [...away.forma_recente, outcome].slice(-5);
      const moralDelta = outcome === 'V' ? (gf - gc >= 3 ? 5 : 3) : outcome === 'E' ? 0 : gc - gf >= 3 ? -5 : -3;
      away.moral_elenco = clamp((away.moral_elenco ?? 75) + moralDelta, 35, 99);
    }

    const startersHome = new Set((partida.sumula?.titulares_casa ?? []).map((p) => p.id));
    const startersAway = new Set((partida.sumula?.titulares_fora ?? []).map((p) => p.id));
    const cardsMap = new Map(cartoesAplicados.map((c) => [c.jogadorId, c]));
    const injuryMap = new Map(novasLesoes.map((l) => [l.jogadorId, l]));

    const processTeamPlayers = (teamId: string, starters: Set<string>, teamWon: boolean, teamLost: boolean) => {
      const playerIds = playersByTeam.get(teamId) ?? [];
      for (const pid of playerIds) {
        const p = jogadoresMap.get(pid);
        if (!p) continue;

        const wasUnavailable = p.lesionado_jogos > 0 || p.suspenso_jogos > 0;
        if (wasUnavailable) {
          if (p.suspenso_jogos > 0) p.suspenso_jogos = Math.max(0, p.suspenso_jogos - 1);
          if (p.lesionado_jogos > 0) {
            p.lesionado_jogos = Math.max(0, p.lesionado_jogos - 1);
            if (p.lesionado_jogos === 0) p.lesao_descricao = null;
          }
          p.forma_fisica = clamp((p.forma_fisica ?? 88) + 6, 40, 100);
          continue;
        }

        if (starters.has(pid)) {
          p.forma_fisica = clamp((p.forma_fisica ?? 90) - 5, 45, 100);
          const moralShift = teamWon ? 3 : teamLost ? -3 : 0;
          p.moral = clamp((p.moral ?? 75) + moralShift, 30, 100);
        } else {
          p.forma_fisica = clamp((p.forma_fisica ?? 90) + 4, 45, 100);
        }

        const card = cardsMap.get(pid);
        if (card) {
          if (card.amarelos > 0) {
            p.amarelos_acumulados += card.amarelos;
            if (p.amarelos_acumulados >= 3) {
              p.amarelos_acumulados = 0;
              p.suspenso_jogos = Math.max(p.suspenso_jogos, 1);
              const occ: OcorrenciaJogador = {
                id: `occ-${partida.id}-${pid}-ya`,
                tipo: 'suspensao_amarelo',
                descricao: 'Suspensão automática por 3º cartão amarelo',
                jogos_fora: 1,
                rodada: partida.rodada,
                competicao_nome: compName,
              };
              p.timeline_ocorrencias.unshift(occ);
            }
          }
          if (card.vermelhos > 0) {
            p.vermelhos_temporada += card.vermelhos;
            p.suspenso_jogos = Math.max(p.suspenso_jogos, 1);
            const occ: OcorrenciaJogador = {
              id: `occ-${partida.id}-${pid}-red`,
              tipo: 'suspensao_vermelho',
              descricao: 'Suspensão automática por cartão vermelho',
              jogos_fora: 1,
              rodada: partida.rodada,
              competicao_nome: compName,
            };
            p.timeline_ocorrencias.unshift(occ);
          }
        }

        const inj = injuryMap.get(pid);
        if (inj) {
          p.lesionado_jogos = Math.max(p.lesionado_jogos, inj.jogosFora);
          p.lesao_descricao = inj.descricao;
          const occ: OcorrenciaJogador = {
            id: `occ-${partida.id}-${pid}-inj`,
            tipo: 'lesao',
            descricao: inj.descricao,
            jogos_fora: inj.jogosFora,
            rodada: partida.rodada,
            competicao_nome: compName,
          };
          p.timeline_ocorrencias.unshift(occ);
        }
      }
    };

    processTeamPlayers(partida.time_casa_id, startersHome, gc > gf, gc < gf);
    processTeamPlayers(partida.time_fora_id, startersAway, gf > gc, gf < gc);
  }

  return {
    ...dataset,
    times: Array.from(timesMap.values()),
    jogadores: Array.from(jogadoresMap.values()),
  };
}

/**
 * Executa uma transferência manual entre clubes (respeitando orçamento e passe livre).
 */
export function executeManualTransfer(
  dataset: SimulatorDataset,
  jogadorId: string,
  destTeamId: string,
): { dataset: SimulatorDataset; transfer?: Transferencia; error?: string } {
  const jogador = dataset.jogadores.find((j) => j.id === jogadorId);
  if (!jogador) return { dataset, error: 'Jogador não encontrado.' };
  if (jogador.time_id === destTeamId) return { dataset, error: 'Jogador já pertence a este clube.' };

  const destTeam = dataset.times.find((t) => t.id === destTeamId);
  if (!destTeam) return { dataset, error: 'Clube de destino não encontrado.' };

  const isFree = jogador.contrato_fim_ano <= dataset.anoAtual;
  const fee = isFree ? 0 : jogador.valor_mercado;

  if (destTeam.orcamento < fee) {
    return {
      dataset,
      error: `Orçamento insuficiente (${destTeam.nome} possui € ${(destTeam.orcamento / 1_000_000).toFixed(1)}M e o jogador custa € ${(fee / 1_000_000).toFixed(1)}M).`,
    };
  }

  const originId = jogador.time_id;
  const transfer: Transferencia = {
    id: `tr-${Date.now()}-${jogador.id}`,
    jogador_id: jogador.id,
    jogador_nome: jogador.nome,
    posicao: jogador.posicao,
    overall: jogador.overall,
    time_origem_id: originId,
    time_destino_id: destTeamId,
    valor: fee,
    tipo: isFree ? 'livre' : 'compra',
    temporada_ano: dataset.anoAtual,
    data: new Date().toISOString().slice(0, 10),
  };

  const times = dataset.times.map((t) => {
    if (t.id === destTeamId) {
      return { ...t, orcamento: Number((t.orcamento - fee).toFixed(2)) };
    }
    if (t.id === originId) {
      return { ...t, orcamento: Number((t.orcamento + fee).toFixed(2)) };
    }
    return t;
  });

  const jogadores = dataset.jogadores.map((j) =>
    j.id === jogadorId
      ? {
          ...j,
          time_id: destTeamId,
          contrato_fim_ano: dataset.anoAtual + 3,
          amarelos_acumulados: 0,
          suspenso_jogos: 0,
        }
      : j,
  );

  return {
    dataset: {
      ...dataset,
      times,
      jogadores,
      transferencias: [transfer, ...dataset.transferencias],
    },
    transfer,
  };
}

/**
 * Simula uma janela de transferências automática baseada em necessidades de elenco,
 * jogadores em fim de contrato (passe livre) e orçamento dos clubes.
 */
export function runTransferWindow(
  dataset: SimulatorDataset,
  rng: () => number = Math.random,
): { dataset: SimulatorDataset; transfers: Transferencia[] } {
  let current = dataset;
  const newTransfers: Transferencia[] = [];

  const clubsByBudget = [...current.times].sort((a, b) => b.orcamento - a.orcamento);
  const candidateClubs = clubsByBudget.slice(0, 45);
  const positions: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];

  for (const club of candidateClubs) {
    if (newTransfers.length >= 24) break;
    if (rng() > 0.55) continue;

    const clubPlayers = current.jogadores.filter((j) => j.time_id === club.id);
    if (clubPlayers.length >= 26) continue;

    // Encontra a posição mais carente
    let weakestPos: Posicao = 'ATA';
    let lowestBestOvr = 99;
    for (const pos of positions) {
      const best = clubPlayers
        .filter((p) => p.posicao === pos)
        .sort((a, b) => b.overall - a.overall)[0];
      const bestOvr = best ? best.overall : 50;
      if (bestOvr < lowestBestOvr) {
        lowestBestOvr = bestOvr;
        weakestPos = pos;
      }
    }

    const targets = current.jogadores.filter((j) => {
      if (j.time_id === club.id) return false;
      if (j.posicao !== weakestPos) return false;
      const isFree = j.contrato_fim_ano <= current.anoAtual;
      const cost = isFree ? 0 : j.valor_mercado;
      if (cost > club.orcamento * 0.65) return false;
      return j.overall >= lowestBestOvr + 1 && j.overall <= lowestBestOvr + 10;
    });

    if (targets.length === 0) continue;
    const picked = targets[Math.floor(rng() * Math.min(targets.length, 6))]!;
    const res = executeManualTransfer(current, picked.id, club.id);
    if (res.transfer) {
      current = res.dataset;
      newTransfers.push(res.transfer);
    }
  }

  return { dataset: current, transfers: newTransfers };
}

function createYouthPlayer(team: Time, posicao: Posicao, anoAtual: number, idx: number, rng: () => number): Jogador {
  const idade = 17 + Math.floor(rng() * 3);
  const baseOvr = clamp(Math.round(58 + ((team.elo_rating - 1350) / 500) * 14 + rng() * 6), 56, 76);
  const youthId = `youth-${team.id}-${anoAtual}-${idx}`;
  const attrs = generateDetailedAttributes(youthId, posicao, baseOvr, idade);
  const { valorMercado, salarioSemanal } = calculateMarketValueAndSalary(baseOvr, idade, team.elo_rating);
  const firstNames = ['Lucas', 'Matheus', 'Gabriel', 'Pedro', 'Rafael', 'Arthur', 'Enzo', 'Vitor', 'Diego', 'Theo'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida', 'Ribeiro', 'Martins', 'Rocha', 'Lima'];
  const nome = `${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]} (Base)`;

  return {
    id: youthId,
    time_id: team.id,
    nome,
    posicao,
    numero: 30 + (idx % 20),
    nacionalidade: 'Local',
    idade,
    overall: baseOvr,
    perna_dominante: rng() > 0.25 ? 'Direita' : 'Esquerda',
    ...attrs,
    forma_fisica: 95,
    moral: 82,
    amarelos_acumulados: 0,
    vermelhos_temporada: 0,
    suspenso_jogos: 0,
    lesionado_jogos: 0,
    lesao_descricao: null,
    salario_semanal: salarioSemanal,
    valor_mercado: valorMercado,
    contrato_fim_ano: anoAtual + 4,
    historico_temporadas: [],
    timeline_ocorrencias: [],
  };
}

/**
 * Avança para a próxima temporada:
 * - Registra histórico anual dos jogadores, evolui jovens (<21), envelhece veteranos (34+) e aposenta (38+)
 * - Executa acesso e rebaixamento automático entre 1ª e 2ª divisão de cada país
 * - Atualiza vagas continentais (Libertadores/Sul-Americana/Champions/Europa League)
 * - Roda janela de transferências automática e gera o novo calendário
 */
export function advanceSeasonAndPromotions(
  dataset: SimulatorDataset,
  rng: () => number = Math.random,
): SimulatorDataset {
  const nextYear = dataset.anoAtual + 1;
  const teamsMap = new Map(dataset.times.map((t) => [t.id, t]));
  const compMap = new Map(dataset.competicoes.map((c) => [c.id, c]));

  // 1. Histórico, evolução, envelhecimento e aposentadorias
  const artByPlayer = new Map<string, { gols: number; assistencias: number; compId: string }>();
  for (const a of dataset.artilharia) {
    const prev = artByPlayer.get(a.jogador_id);
    if (!prev || a.gols > prev.gols) {
      artByPlayer.set(a.jogador_id, { gols: a.gols, assistencias: a.assistencias, compId: a.competicao_id });
    }
  }

  const nextJogadores: Jogador[] = [];
  const retirementTransfers: Transferencia[] = [];
  let youthSeq = 1;

  for (const j of dataset.jogadores) {
    const team = teamsMap.get(j.time_id);
    const stat = artByPlayer.get(j.id);
    const compName = stat ? compMap.get(stat.compId)?.nome ?? 'Liga' : 'Liga';

    const historico = [
      ...(j.historico_temporadas ?? []),
      {
        ano: dataset.anoAtual,
        competicao_id: stat?.compId ?? 'liga',
        competicao_nome: compName,
        time_id: j.time_id,
        time_nome: team?.nome ?? j.time_id,
        jogos: stat ? Math.max(10, Math.min(38, 18 + stat.gols)) : 12,
        gols: stat?.gols ?? 0,
        assistencias: stat?.assistencias ?? 0,
        amarelos: j.amarelos_acumulados,
        vermelhos: j.vermelhos_temporada,
      },
    ];

    const novaIdade = j.idade + 1;
    // Aposentadoria natural
    if (novaIdade >= 38 || (novaIdade >= 36 && j.overall < 68 && rng() < 0.65)) {
      if (team) {
        const youth = createYouthPlayer(team, j.posicao, nextYear, youthSeq++, rng);
        nextJogadores.push(youth);
        retirementTransfers.push({
          id: `base-${youth.id}`,
          jogador_id: youth.id,
          jogador_nome: youth.nome,
          posicao: youth.posicao,
          overall: youth.overall,
          time_origem_id: null,
          time_destino_id: team.id,
          valor: 0,
          tipo: 'base',
          temporada_ano: nextYear,
          data: `${nextYear}-01-10`,
        });
      }
      continue;
    }

    let delta = 0;
    if (novaIdade <= 21) delta = j.overall >= 72 ? 2 : 1;
    else if (novaIdade >= 34) delta = novaIdade >= 36 ? -2 : -1;

    const novoOverall = clamp(j.overall + delta, 52, 95);
    const { valorMercado, salarioSemanal } = calculateMarketValueAndSalary(
      novoOverall,
      novaIdade,
      team?.elo_rating ?? 1500,
    );
    const adjustAttr = (v: number) => clamp(v + delta, 35, 99);

    nextJogadores.push({
      ...j,
      idade: novaIdade,
      overall: novoOverall,
      finalizacao: adjustAttr(j.finalizacao),
      passe: adjustAttr(j.passe),
      drible: adjustAttr(j.drible),
      velocidade: clamp(j.velocidade + (novaIdade >= 33 ? delta - 1 : delta), 35, 99),
      forca_fisica: adjustAttr(j.forca_fisica),
      marcacao: adjustAttr(j.marcacao),
      visao_jogo: adjustAttr(j.visao_jogo),
      posicionamento: adjustAttr(j.posicionamento),
      reflexos: adjustAttr(j.reflexos),
      valor_mercado: valorMercado,
      salario_semanal: salarioSemanal,
      forma_fisica: 92,
      moral: 76,
      amarelos_acumulados: 0,
      vermelhos_temporada: 0,
      suspenso_jogos: 0,
      lesionado_jogos: 0,
      lesao_descricao: null,
      historico_temporadas: historico,
      timeline_ocorrencias: [],
    });
  }

  // 2. Acesso e Rebaixamento entre divisões
  const linksByComp = new Map<string, string[]>();
  for (const tc of dataset.timesCompeticao) {
    const list = linksByComp.get(tc.competicao_id) ?? [];
    list.push(tc.time_id);
    linksByComp.set(tc.competicao_id, list);
  }

  const standingsByComp = new Map<string, Classificacao[]>();
  for (const row of dataset.classificacao) {
    const list = standingsByComp.get(row.competicao_id) ?? [];
    list.push(row);
    standingsByComp.set(row.competicao_id, list);
  }

  const leagueStandings = new Map<string, Classificacao[]>();
  for (const pair of LEAGUE_PAIRS) {
    const spots = RELEGATION_SPOTS[pair.country] ?? 3;
    const s1 = sortStandings(standingsByComp.get(pair.div1) ?? []);
    const s2 = sortStandings(standingsByComp.get(pair.div2) ?? []);
    leagueStandings.set(pair.div1, s1);

    if (s1.length > spots && s2.length > spots) {
      const relegated = s1.slice(-spots).map((r) => r.time_id);
      const promoted = s2.slice(0, spots).map((r) => r.time_id);
      const kept1 = s1.slice(0, s1.length - spots).map((r) => r.time_id);
      const kept2 = s2.slice(spots).map((r) => r.time_id);

      linksByComp.set(pair.div1, [...kept1, ...promoted]);
      linksByComp.set(pair.div2, [...kept2, ...relegated]);
    }
  }

  // 3. Classificação continental baseada nas ligas domésticas
  const braTable = leagueStandings.get('bra-serie-a') ?? [];
  if (braTable.length >= 12) {
    const currentLib = linksByComp.get('conmebol-lib') ?? [];
    const nonBraLib = currentLib.filter((id) => teamsMap.get(id)?.pais_id !== 'bra');
    const braLib = braTable.slice(0, 6).map((r) => r.time_id);
    linksByComp.set('conmebol-lib', Array.from(new Set([...braLib, ...nonBraLib])).slice(0, 16));

    const currentSula = linksByComp.get('conmebol-sula') ?? [];
    const nonBraSula = currentSula.filter((id) => teamsMap.get(id)?.pais_id !== 'bra');
    const braSula = braTable.slice(6, 12).map((r) => r.time_id);
    linksByComp.set('conmebol-sula', Array.from(new Set([...braSula, ...nonBraSula])).slice(0, 16));
  }

  const uclQualified: string[] = [];
  const uelQualified: string[] = [];
  for (const euroDiv of ['eng-premier-league', 'esp-la-liga', 'ita-serie-a', 'ger-bundesliga', 'fra-ligue-1', 'por-primeira-liga']) {
    const tbl = leagueStandings.get(euroDiv) ?? [];
    const uclSpots = euroDiv === 'fra-ligue-1' || euroDiv === 'por-primeira-liga' ? 2 : 4;
    uclQualified.push(...tbl.slice(0, uclSpots).map((r) => r.time_id));
    uelQualified.push(...tbl.slice(uclSpots, uclSpots + 2).map((r) => r.time_id));
  }
  if (uclQualified.length >= 16) linksByComp.set('uefa-ucl', Array.from(new Set(uclQualified)).slice(0, 16));
  if (uelQualified.length >= 12) linksByComp.set('uefa-uel', Array.from(new Set(uelQualified)).slice(0, 16));

  // 4. Atualiza temporadas e reconstrói timesCompeticao, partidas e classificacao
  const temporadas = dataset.temporadas.map((t) => ({
    ...t,
    ano_inicio: nextYear,
    ano_fim: nextYear,
  }));
  const tempByComp = new Map(temporadas.map((t) => [t.competicao_id, t]));

  const timesCompeticao: TimeCompeticao[] = [];
  const partidas: Partida[] = [];
  const classificacao: Classificacao[] = [];

  for (const comp of dataset.competicoes) {
    const temp = tempByComp.get(comp.id);
    if (!temp) continue;
    const clubIds = linksByComp.get(comp.id) ?? [];
    if (clubIds.length === 0) continue;

    if (comp.formato === 'pontos-corridos') {
      clubIds.forEach((tid, idx) => {
        timesCompeticao.push({
          id: `${comp.id}-${nextYear}-${idx}`,
          time_id: tid,
          competicao_id: comp.id,
          temporada_id: temp.id,
        });
      });
      partidas.push(...generateRoundRobinSchedule(clubIds, comp.id, temp.id, true, 'Temporada Regular', 1));
    } else if (comp.formato === 'grupos') {
      const sorted = [...clubIds].sort(
        (a, b) => (teamsMap.get(b)?.elo_rating ?? 1500) - (teamsMap.get(a)?.elo_rating ?? 1500),
      );
      const groupLetters = ['A', 'B', 'C', 'D'];
      const numGroups = Math.min(4, Math.max(2, Math.floor(sorted.length / 4)));
      const groups: Record<string, string[]> = {};
      for (let g = 0; g < numGroups; g++) groups[groupLetters[g]!] = [];

      sorted.forEach((tid, idx) => {
        const pot = Math.floor(idx / numGroups);
        const col = idx % numGroups;
        const gIdx = pot % 2 === 0 ? col : numGroups - 1 - col;
        const grp = groupLetters[gIdx]!;
        groups[grp]!.push(tid);
        timesCompeticao.push({
          id: `${comp.id}-${nextYear}-${tid}`,
          time_id: tid,
          competicao_id: comp.id,
          temporada_id: temp.id,
          grupo: `Grupo ${grp}`,
        });
      });

      for (const grp of Object.keys(groups)) {
        const gTeams = groups[grp]!;
        if (gTeams.length >= 2) {
          partidas.push(...generateRoundRobinSchedule(gTeams, comp.id, temp.id, true, `Grupo ${grp}`, 1));
        }
      }
    } else {
      const sorted = [...clubIds].sort(
        (a, b) => (teamsMap.get(b)?.elo_rating ?? 1500) - (teamsMap.get(a)?.elo_rating ?? 1500),
      );
      const bracketSize = Math.min(32, Math.pow(2, Math.floor(Math.log2(Math.max(2, sorted.length)))));
      const entrants = sorted.slice(0, bracketSize);
      const topHalf = entrants.slice(0, bracketSize / 2);
      const bottomHalf = entrants.slice(bracketSize / 2).reverse();
      const seededFlat = topHalf.flatMap((h, i) => [bottomHalf[i]!, h]);
      entrants.forEach((tid, idx) => {
        timesCompeticao.push({
          id: `${comp.id}-${nextYear}-${idx}`,
          time_id: tid,
          competicao_id: comp.id,
          temporada_id: temp.id,
        });
      });
      partidas.push(
        ...generateKnockoutPhaseMatches(
          seededFlat,
          comp.id,
          temp.id,
          getPhaseNameForTeamCount(entrants.length),
          1,
          true,
        ),
      );
    }
  }

  for (const p of partidas) {
    const rName = getRivalryName(p.time_casa_id, p.time_fora_id);
    if (rName) p.classico = true;
  }

  for (const comp of dataset.competicoes) {
    const temp = tempByComp.get(comp.id);
    if (!temp) continue;
    const links = timesCompeticao.filter((tc) => tc.competicao_id === comp.id);
    if (links.length === 0) continue;
    const compPartidas = partidas.filter((p) => p.competicao_id === comp.id);
    classificacao.push(
      ...recalculateStandings(links, compPartidas, comp.id, temp.id, comp.formato === 'grupos'),
    );
  }

  const nextDataset: SimulatorDataset = {
    ...dataset,
    anoAtual: nextYear,
    temporadas,
    timesCompeticao,
    jogadores: nextJogadores,
    partidas,
    classificacao,
    artilharia: [],
    transferencias: [...retirementTransfers, ...dataset.transferencias],
  };

  // Roda janela de transferências automática para a nova temporada
  const { dataset: afterTransfers } = runTransferWindow(nextDataset, rng);
  return afterTransfers;
}
