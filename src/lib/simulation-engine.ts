import { getRivalryName } from '@/data/club-metadata';
import type {
  Artilharia,
  Classificacao,
  ClimaPartida,
  CondicaoGramado,
  EscalacaoJogador,
  EstatisticasPartida,
  EstiloTatico,
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

const CLIMAS: ClimaPartida[] = ['Ensolarado', 'Nublado', 'Chuva leve', 'Chuva forte', 'Calor intenso'];
const GRAMADOS: CondicaoGramado[] = ['Excelente', 'Bom', 'Bom', 'Regular', 'Pesado'];

const INJURY_TYPES = [
  { desc: 'Estiramento muscular na coxa', minGames: 2, maxGames: 4 },
  { desc: 'Entorse no tornozelo', minGames: 1, maxGames: 3 },
  { desc: 'Desconforto muscular leve', minGames: 1, maxGames: 2 },
  { desc: 'Contratura na panturrilha', minGames: 2, maxGames: 3 },
];

export function isPlayerAvailable(j: Jogador): boolean {
  return (j.lesionado_jogos ?? 0) === 0 && (j.suspenso_jogos ?? 0) === 0;
}

/**
 * Seleciona os 11 titulares disponíveis respeitando formação 4-3-3 e ponderando forma/moral,
 * além de retornar até 7 reservas para substituições.
 */
export function selectMatchSquad(jogadores: Jogador[]): {
  titulares: EscalacaoJogador[];
  reservas: EscalacaoJogador[];
} {
  if (jogadores.length === 0) return { titulares: [], reservas: [] };
  const available = jogadores.filter(isPlayerAvailable);
  const poolSource = available.length >= 11 ? available : jogadores;

  const effectiveScore = (j: Jogador) =>
    j.overall + ((j.forma_fisica ?? 90) - 85) * 0.12 + ((j.moral ?? 75) - 75) * 0.08;

  const pool = [...poolSource].sort((a, b) => effectiveScore(b) - effectiveScore(a));
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

  const toEscalacao = (j: Jogador): EscalacaoJogador => ({
    id: j.id,
    nome: j.nome,
    posicao: j.posicao,
    numero: j.numero,
    overall: j.overall,
    forma_fisica: j.forma_fisica,
    moral: j.moral,
  });

  const titulares = xi
    .sort((a, b) => posOrder[a.posicao] - posOrder[b.posicao])
    .map(toEscalacao);

  const reservas = pool
    .filter((p) => !picked.has(p.id))
    .slice(0, 7)
    .map(toEscalacao);

  return { titulares, reservas };
}

export function selectStartingXI(jogadores: Jogador[]): EscalacaoJogador[] {
  return selectMatchSquad(jogadores).titulares;
}

export function calculateAverageOverall(titulares: EscalacaoJogador[]): number {
  if (titulares.length === 0) return 70;
  const total = titulares.reduce((acc, j) => acc + j.overall, 0);
  return Math.round((total / titulares.length) * 10) / 10;
}

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

function getTacticalModifiers(own: EstiloTatico, opp: EstiloTatico) {
  let attackMult = 1;
  let possBonus = 0;

  if (own === 'posse') {
    possBonus += 5;
    if (opp === 'retranca') attackMult *= 0.94;
    if (opp === 'contra-ataque') attackMult *= 0.97;
  } else if (own === 'contra-ataque') {
    possBonus -= 5;
    if (opp === 'posse' || opp === 'pressao-alta') attackMult *= 1.07;
  } else if (own === 'pressao-alta') {
    possBonus += 3;
    attackMult *= 1.06;
  } else if (own === 'retranca') {
    possBonus -= 6;
    attackMult *= 0.88;
  }

  if (opp === 'retranca') attackMult *= 0.90;
  if (opp === 'pressao-alta') attackMult *= 1.04;

  return { attackMult, possBonus };
}

function buildGoalNarration(
  minuto: number,
  scorerName: string,
  assisterName: string | undefined,
  teamSigla: string,
  isClassic: boolean,
  rng: () => number,
): string {
  const classicTag = isClassic ? ' (NO CLÁSSICO!)' : '';
  if (assisterName) {
    const templates = [
      `${minuto}' GOL DO ${teamSigla}!${classicTag} ${scorerName} recebe passe açucarado de ${assisterName} e bate cruzado, sem chances para o goleiro!`,
      `${minuto}' É REDE!${classicTag} ${assisterName} encontra ${scorerName} na área, que finaliza firme no canto!`,
      `${minuto}' GOLAÇO DO ${teamSigla}!${classicTag} Jogada trabalhada com ${assisterName}, e ${scorerName} manda no ângulo!`,
    ];
    return templates[Math.floor(rng() * templates.length)]!;
  }
  const soloTemplates = [
    `${minuto}' GOL DO ${teamSigla}!${classicTag} ${scorerName} aproveita a sobra na entrada da área e solta a bomba!`,
    `${minuto}' BALANÇOU A REDE!${classicTag} ${scorerName} ganha da marcação e toca na saída do goleiro!`,
  ];
  return soloTemplates[Math.floor(rng() * soloTemplates.length)]!;
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
  novasLesoes: Array<{ jogadorId: string; descricao: string; jogosFora: number }>;
  cartoesAplicados: Array<{ jogadorId: string; amarelos: number; vermelhos: number }>;
}

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
  const squadCasa = selectMatchSquad(jogadoresCasa);
  const squadFora = selectMatchSquad(jogadoresFora);
  const titularesCasa = squadCasa.titulares;
  const titularesFora = squadFora.titulares;

  const ovrCasa = calculateAverageOverall(titularesCasa);
  const ovrFora = calculateAverageOverall(titularesFora);

  const rivalryName = getRivalryName(timeCasa.id, timeFora.id);
  const isClassic = Boolean(rivalryName) || partida.classico;

  const clima = CLIMAS[Math.floor(rng() * CLIMAS.length)]!;
  const gramado =
    clima === 'Chuva forte'
      ? 'Pesado'
      : GRAMADOS[Math.floor(rng() * GRAMADOS.length)]!;

  // Forma média e moral do elenco afetam o desempenho efetivo
  const avgFitCasa = titularesCasa.reduce((s, p) => s + (p.forma_fisica ?? 90), 0) / Math.max(1, titularesCasa.length);
  const avgFitFora = titularesFora.reduce((s, p) => s + (p.forma_fisica ?? 90), 0) / Math.max(1, titularesFora.length);
  const moralModCasa = ((timeCasa.moral_elenco ?? 75) - 75) * 0.08 + (avgFitCasa - 88) * 0.06;
  const moralModFora = ((timeFora.moral_elenco ?? 75) - 75) * 0.08 + (avgFitFora - 88) * 0.06;

  const eloScaleCasa = 55 + ((timeCasa.elo_rating - 1200) / 800) * 35;
  const eloScaleFora = 55 + ((timeFora.elo_rating - 1200) / 800) * 35;

  const powerCasa = ovrCasa * 0.65 + eloScaleCasa * 0.35 + moralModCasa;
  const powerFora = ovrFora * 0.65 + eloScaleFora * 0.35 + moralModFora;

  // Bônus de mando variável por clube + variância extra em clássicos
  const homeBonus = timeCasa.home_bonus ?? 2.8;
  const classicSwing = isClassic ? (rng() - 0.5) * 3.8 : 0;
  const diff = powerCasa + homeBonus - powerFora + classicSwing;

  const tacCasa = getTacticalModifiers(timeCasa.estilo_tatico ?? 'posse', timeFora.estilo_tatico ?? 'posse');
  const tacFora = getTacticalModifiers(timeFora.estilo_tatico ?? 'posse', timeCasa.estilo_tatico ?? 'posse');
  const weatherMult = clima === 'Chuva forte' || gramado === 'Pesado' ? 0.92 : 1;

  const lambdaCasa = Math.max(0.25, Math.min(3.9, 1.32 * Math.exp(diff * 0.052) * tacCasa.attackMult * weatherMult));
  const lambdaFora = Math.max(0.20, Math.min(3.5, 1.18 * Math.exp(-diff * 0.052) * tacFora.attackMult * weatherMult));

  const golsCasa = poissonRandom(lambdaCasa, rng);
  const golsFora = poissonRandom(lambdaFora, rng);

  const eventos: EventoPartida[] = [];
  const cartoesMap = new Map<string, { amarelos: number; vermelhos: number }>();
  const addCardStat = (id: string, tipo: 'a' | 'v') => {
    const cur = cartoesMap.get(id) ?? { amarelos: 0, vermelhos: 0 };
    if (tipo === 'a') cur.amarelos += 1;
    else cur.vermelhos += 1;
    cartoesMap.set(id, cur);
  };

  const gerarGols = (gols: number, team: Time, titulares: EscalacaoJogador[]) => {
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
      const minuto = Math.floor(rng() * 92) + 1;
      eventos.push({
        minuto,
        tipo: 'gol',
        time_id: team.id,
        jogador_id: scorer.id,
        jogador_nome: scorer.nome,
        ...(assister ? { assistencia_id: assister.id, assistencia_nome: assister.nome } : {}),
        narracao: buildGoalNarration(minuto, scorer.nome, assister?.nome, team.sigla, isClassic, rng),
      });
    }
  };

  gerarGols(golsCasa, timeCasa, titularesCasa);
  gerarGols(golsFora, timeFora, titularesFora);

  // Cartões (mais intensos em clássicos)
  const gerarCartoes = (team: Time, titulares: EscalacaoJogador[]) => {
    const outfield = titulares.filter((j) => j.posicao !== 'GOL');
    if (outfield.length === 0) return;
    const count = Math.floor(rng() * (isClassic ? 4 : 3)) + 1;
    for (let i = 0; i < count; i++) {
      const player = outfield[Math.floor(rng() * outfield.length)]!;
      const minuto = Math.floor(rng() * 90) + 1;
      const isRed = rng() < (isClassic ? 0.08 : 0.04);
      if (isRed) {
        addCardStat(player.id, 'v');
        eventos.push({
          minuto,
          tipo: 'cartao_vermelho',
          time_id: team.id,
          jogador_id: player.id,
          jogador_nome: player.nome,
          narracao: `${minuto}' CARTÃO VERMELHO! ${player.nome} (${team.sigla}) faz falta dura e está expulso de campo!`,
        });
      } else {
        addCardStat(player.id, 'a');
        eventos.push({
          minuto,
          tipo: 'cartao_amarelo',
          time_id: team.id,
          jogador_id: player.id,
          jogador_nome: player.nome,
          narracao: `${minuto}' Cartão amarelo para ${player.nome} (${team.sigla}) após chegada atrasada.`,
        });
      }
    }
  };

  gerarCartoes(timeCasa, titularesCasa);
  gerarCartoes(timeFora, titularesFora);

  // Substituições (2 a 3 por time entre 58' e 86')
  const gerarSubstituicoes = (team: Time, titulares: EscalacaoJogador[], reservas: EscalacaoJogador[]) => {
    const subsCount = Math.min(3, reservas.length, titulares.length - 1);
    const outCandidates = titulares.filter((j) => j.posicao !== 'GOL');
    const inCandidates = reservas.filter((j) => j.posicao !== 'GOL');
    for (let i = 0; i < Math.min(subsCount, outCandidates.length, inCandidates.length); i++) {
      const subOut = outCandidates[outCandidates.length - 1 - i]!;
      const subIn = inCandidates[i]!;
      const minuto = 58 + Math.floor(rng() * 28);
      eventos.push({
        minuto,
        tipo: 'substituicao',
        time_id: team.id,
        jogador_id: subIn.id,
        jogador_nome: subIn.nome,
        substituido_id: subOut.id,
        substituido_nome: subOut.nome,
        narracao: `${minuto}' Substituição no ${team.sigla}: entra ${subIn.nome}, sai ${subOut.nome}.`,
      });
    }
  };

  gerarSubstituicoes(timeCasa, titularesCasa, squadCasa.reservas);
  gerarSubstituicoes(timeFora, titularesFora, squadFora.reservas);

  // Defesas dos goleiros e estatísticas
  const posseBase = Math.round(
    Math.max(30, Math.min(70, 50 + diff * 1.05 + tacCasa.possBonus - tacFora.possBonus + (rng() - 0.5) * 6)),
  );
  const finCasa = Math.max(golsCasa + 2, Math.round(lambdaCasa * 8.2 + rng() * 5));
  const finFora = Math.max(golsFora + 2, Math.round(lambdaFora * 8.2 + rng() * 5));
  const finGolCasa = Math.max(golsCasa, Math.min(finCasa, Math.round(finCasa * 0.4 + golsCasa * 0.5)));
  const finGolFora = Math.max(golsFora, Math.min(finFora, Math.round(finFora * 0.4 + golsFora * 0.5)));
  const defesasCasa = Math.max(0, finGolFora - golsFora);
  const defesasFora = Math.max(0, finGolCasa - golsCasa);

  const gkCasa = titularesCasa.find((j) => j.posicao === 'GOL');
  const gkFora = titularesFora.find((j) => j.posicao === 'GOL');
  if (gkCasa && defesasCasa >= 2) {
    const min = 20 + Math.floor(rng() * 65);
    eventos.push({
      minuto: min,
      tipo: 'defesa_goleiro',
      time_id: timeCasa.id,
      jogador_id: gkCasa.id,
      jogador_nome: gkCasa.nome,
      narracao: `${min}' MILAGRE DE ${gkCasa.nome.toUpperCase()}! O goleiro do ${timeCasa.sigla} voa no ângulo para evitar o gol!`,
    });
  }
  if (gkFora && defesasFora >= 2) {
    const min = 20 + Math.floor(rng() * 65);
    eventos.push({
      minuto: min,
      tipo: 'defesa_goleiro',
      time_id: timeFora.id,
      jogador_id: gkFora.id,
      jogador_nome: gkFora.nome,
      narracao: `${min}' GRANDE DEFESA! ${gkFora.nome} (${timeFora.sigla}) salva à queima-roupa!`,
    });
  }

  // Lesões eventuais (chance ~5% por time por jogo, maior para veteranos ou forma baixa)
  const novasLesoes: Array<{ jogadorId: string; descricao: string; jogosFora: number }> = [];
  const checarLesao = (team: Time, titulares: EscalacaoJogador[], fullSquad: Jogador[]) => {
    const fullMap = new Map(fullSquad.map((j) => [j.id, j]));
    for (const t of titulares) {
      const full = fullMap.get(t.id);
      if (!full || full.posicao === 'GOL') continue;
      const ageRisk = full.idade >= 32 ? 0.008 : 0.004;
      const fitRisk = (full.forma_fisica ?? 90) < 75 ? 0.01 : 0;
      if (rng() < ageRisk + fitRisk) {
        const inj = INJURY_TYPES[Math.floor(rng() * INJURY_TYPES.length)]!;
        const jogosFora = inj.minGames + Math.floor(rng() * (inj.maxGames - inj.minGames + 1));
        const minuto = 15 + Math.floor(rng() * 70);
        novasLesoes.push({ jogadorId: full.id, descricao: inj.desc, jogosFora });
        eventos.push({
          minuto,
          tipo: 'lesao',
          time_id: team.id,
          jogador_id: full.id,
          jogador_nome: full.nome,
          narracao: `${minuto}' LESÃO! ${full.nome} (${team.sigla}) sente ${inj.desc.toLowerCase()} e deixa o gramado.`,
        });
        break;
      }
    }
  };
  checarLesao(timeCasa, titularesCasa, jogadoresCasa);
  checarLesao(timeFora, titularesFora, jogadoresFora);

  eventos.sort((a, b) => a.minuto - b.minuto);

  // Pênaltis se aplicável
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
      if (rng() < probCasa) pCasa++;
      if (rng() < probFora) pFora++;
    }

    penaltisCasa = pCasa;
    penaltisFora = pFora;
    vencedorPenaltisId = pCasa > pFora ? timeCasa.id : timeFora.id;
  }

  const estatisticas: EstatisticasPartida = {
    posse_casa: posseBase,
    posse_fora: 100 - posseBase,
    finalizacoes_casa: finCasa,
    finalizacoes_fora: finFora,
    finalizacoes_gol_casa: finGolCasa,
    finalizacoes_gol_fora: finGolFora,
    finalizacoes_fora_casa: finCasa - finGolCasa,
    finalizacoes_fora_fora: finFora - finGolFora,
    defesas_casa: defesasCasa,
    defesas_fora: defesasFora,
    xg_casa: Math.round(lambdaCasa * 100) / 100,
    xg_fora: Math.round(lambdaFora * 100) / 100,
    escanteios_casa: Math.max(1, Math.round(finCasa * 0.42 + rng() * 2)),
    escanteios_fora: Math.max(1, Math.round(finFora * 0.42 + rng() * 2)),
    faltas_casa: Math.floor(rng() * 8) + (isClassic ? 12 : 8),
    faltas_fora: Math.floor(rng() * 8) + (isClassic ? 12 : 8),
  };

  // Melhor em campo: quem fez mais gols na partida, ou atacante/meia do vencedor
  const goalCounts = new Map<string, { nome: string; time_id: string; score: number }>();
  for (const ev of eventos) {
    if (ev.tipo === 'gol') {
      const cur = goalCounts.get(ev.jogador_id) ?? { nome: ev.jogador_nome, time_id: ev.time_id, score: 0 };
      cur.score += 3;
      goalCounts.set(ev.jogador_id, cur);
    }
  }
  const topActor = Array.from(goalCounts.entries()).sort((a, b) => b[1].score - a[1].score)[0];
  const fallbackMvp = (golsCasa >= golsFora ? titularesCasa : titularesFora).at(-1);

  const sumula: Sumula = {
    overall_casa: ovrCasa,
    overall_fora: ovrFora,
    titulares_casa: titularesCasa,
    titulares_fora: titularesFora,
    reservas_casa: squadCasa.reservas,
    reservas_fora: squadFora.reservas,
    eventos,
    estatisticas,
    vencedor_penaltis_id: vencedorPenaltisId,
    ...(topActor
      ? { melhor_em_campo: { jogador_id: topActor[0], nome: topActor[1].nome, time_id: topActor[1].time_id } }
      : fallbackMvp
        ? {
            melhor_em_campo: {
              jogador_id: fallbackMvp.id,
              nome: fallbackMvp.nome,
              time_id: golsCasa >= golsFora ? timeCasa.id : timeFora.id,
            },
          }
        : {}),
  };

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
      clima,
      gramado,
      classico: isClassic,
      sumula,
    },
    eloCasaNovo: Math.max(1150, Math.min(2150, timeCasa.elo_rating + delta)),
    eloForaNovo: Math.max(1150, Math.min(2150, timeFora.elo_rating - delta)),
    novasLesoes,
    cartoesAplicados: Array.from(cartoesMap.entries()).map(([jogadorId, c]) => ({
      jogadorId,
      amarelos: c.amarelos,
      vermelhos: c.vermelhos,
    })),
  };
}

function getCompetitionStartDate(competicaoId: string): Date {
  if (competicaoId.startsWith('bra-')) return new Date('2026-04-12T16:00:00Z');
  if (competicaoId.startsWith('conmebol-')) return new Date('2026-02-18T21:30:00Z');
  if (competicaoId === 'fifa-cwc') return new Date('2026-06-15T18:00:00Z');
  if (competicaoId.startsWith('uefa-')) return new Date('2026-09-15T19:45:00Z');
  return new Date('2026-08-15T15:00:00Z');
}

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
  const baseDate = getCompetitionStartDate(competicaoId);

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
        clima: 'Ensolarado',
        gramado: 'Bom',
        classico: Boolean(getRivalryName(home, away)),
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
          clima: 'Ensolarado',
          gramado: 'Bom',
          classico: Boolean(getRivalryName(away, home)),
          sumula: null,
        });
      });
    });
  }

  return partidas;
}

export function getPhaseNameForTeamCount(count: number): string {
  if (count <= 2) return 'Final';
  if (count <= 4) return 'Semifinal';
  if (count <= 8) return 'Quartas de Final';
  if (count <= 16) return 'Oitavas de Final';
  return 'Segunda Fase';
}

export function generateKnockoutPhaseMatches(
  teamIds: string[],
  competicaoId: string,
  temporadaId: string,
  fase: string,
  startRound: number,
  twoLegged = true,
): Partida[] {
  const partidas: Partida[] = [];
  const baseDate = getCompetitionStartDate(competicaoId);
  const isFinal = fase === 'Final';
  const useTwoLegs = twoLegged && !isFinal;

  for (let i = 0; i + 1 < teamIds.length; i += 2) {
    const t1 = teamIds[i]!;
    const t2 = teamIds[i + 1]!;
    const isClassic = Boolean(getRivalryName(t1, t2));
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
      data: new Date(baseDate.getTime() + (startRound + 10) * 7 * 86400000).toISOString(),
      finalizada: false,
      clima: 'Ensolarado',
      gramado: 'Bom',
      classico: isClassic,
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
        data: new Date(baseDate.getTime() + (startRound + 11) * 7 * 86400000).toISOString(),
        finalizada: false,
        clima: 'Ensolarado',
        gramado: 'Bom',
        classico: isClassic,
        sumula: null,
      });
    }
  }

  return partidas;
}

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
