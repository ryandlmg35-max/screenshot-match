import { describe, expect, it } from 'vitest';
import { getRivalryName } from '@/data/club-metadata';
import { buildInitialSimulatorDataset } from '@/data/seed-builder';
import { calcularOverallEstimado } from '@/lib/overall-formula';
import {
  advanceSeasonAndPromotions,
  applyPostMatchUpdates,
  executeManualTransfer,
  runTransferWindow,
} from '@/lib/season-lifecycle';
import {
  generateRoundRobinSchedule,
  poissonRandom,
  recalculateStandings,
  recalculateTopScorers,
  selectStartingXI,
  simulateMatch,
} from '@/lib/simulation-engine';
import { buildWorldCupTournament, simulateWorldCupStep } from '@/lib/world-cup';

describe('Overall formula', () => {
  it('computes realistic overall clamped between 50 and 95', () => {
    const star = calcularOverallEstimado({
      posicao: 'ATA',
      reputacao: 5,
      idade: 26,
      clubeElo: 1920,
    });
    const prospect = calcularOverallEstimado({
      posicao: 'GOL',
      reputacao: 1,
      idade: 18,
      clubeElo: 1450,
    });

    expect(star).toBeGreaterThanOrEqual(88);
    expect(star).toBeLessThanOrEqual(95);
    expect(prospect).toBeGreaterThanOrEqual(50);
    expect(prospect).toBeLessThan(star);
  });
});

describe('Simulation engine', () => {
  const dataset = buildInitialSimulatorDataset();

  it('includes all 25 competitions (20 core + 5 secondary leagues) and 330+ clubs', () => {
    expect(dataset.competicoes).toHaveLength(25);
    expect(dataset.times.length).toBeGreaterThanOrEqual(330);
    expect(dataset.jogadores.length).toBeGreaterThanOrEqual(5000);
  });

  it('generates double round-robin schedule for 20 teams (38 rounds, 380 matches)', () => {
    const teams = Array.from({ length: 20 }, (_, i) => `t-${i}`);
    const matches = generateRoundRobinSchedule(teams, 'test-league', '2026', true);
    expect(matches).toHaveLength(380);
    expect(Math.max(...matches.map((m) => m.rodada))).toBe(38);
  });

  it('samples Poisson goals realistically and generates match sumula with scorers and lineups', () => {
    expect(poissonRandom(1.5, () => 0.5)).toBeGreaterThanOrEqual(0);

    const flamengo = dataset.times.find((t) => t.id === 'bra-flamengo')!;
    const palmeiras = dataset.times.find((t) => t.id === 'bra-palmeiras')!;
    const jFla = dataset.jogadores.filter((j) => j.time_id === flamengo.id);
    const jPal = dataset.jogadores.filter((j) => j.time_id === palmeiras.id);

    expect(selectStartingXI(jFla)).toHaveLength(11);

    const partida = dataset.partidas.find(
      (p) => p.competicao_id === 'bra-serie-a' && p.rodada === 1,
    )!;

    const result = simulateMatch({
      partida,
      timeCasa: flamengo,
      timeFora: palmeiras,
      jogadoresCasa: jFla,
      jogadoresFora: jPal,
    });

    expect(result.partida.finalizada).toBe(true);
    expect(result.partida.gols_casa).not.toBeNull();
    expect(result.partida.gols_fora).not.toBeNull();
    expect(result.partida.sumula).not.toBeNull();
    expect(result.partida.sumula?.titulares_casa).toHaveLength(11);
    expect(result.partida.sumula?.titulares_fora).toHaveLength(11);

    const goalEvents =
      result.partida.sumula?.eventos.filter((e) => e.tipo === 'gol') ?? [];
    expect(goalEvents).toHaveLength(
      (result.partida.gols_casa ?? 0) + (result.partida.gols_fora ?? 0),
    );
  });

  it('simulates penalty shootout in knockout ties when scores are level', () => {
    const arsenal = dataset.times.find((t) => t.id === 'eng-arsenal')!;
    const city = dataset.times.find((t) => t.id === 'eng-man-city')!;
    const jArs = dataset.jogadores.filter((j) => j.time_id === arsenal.id);
    const jCity = dataset.jogadores.filter((j) => j.time_id === city.id);

    // Force 0-0 by returning 0.01 for the two Poisson draws, then alternating for penalties
    let call = 0;
    const result = simulateMatch({
      partida: {
        id: 'ko-test',
        competicao_id: 'bra-copa',
        temporada_id: 'bra-copa-2026',
        time_casa_id: arsenal.id,
        time_fora_id: city.id,
        gols_casa: null,
        gols_fora: null,
        penaltis_casa: null,
        penaltis_fora: null,
        rodada: 1,
        fase: 'Final',
        data: new Date().toISOString(),
        finalizada: false,
        clima: 'Nublado',
        gramado: 'Bom',
        classico: false,
        sumula: null,
      },
      timeCasa: arsenal,
      timeFora: city,
      jogadoresCasa: jArs,
      jogadoresFora: jCity,
      allowPenalties: true,
      rng: () => {
        call++;
        if (call <= 8) return 0.01;
        return call % 2 === 0 ? 0.1 : 0.95;
      },
    });

    expect(result.partida.gols_casa).toBe(0);
    expect(result.partida.gols_fora).toBe(0);
    expect(result.partida.penaltis_casa).not.toBeNull();
    expect(result.partida.penaltis_fora).not.toBeNull();
    expect(result.partida.penaltis_casa).not.toBe(result.partida.penaltis_fora);
    expect(result.partida.sumula?.vencedor_penaltis_id).toBeTruthy();
  });

  it('recalculates standings and top scorers accurately', () => {
    const standings = recalculateStandings(
      [{ time_id: 'a' }, { time_id: 'b' }],
      [
        {
          id: 'm1',
          competicao_id: 'c',
          temporada_id: 't',
          time_casa_id: 'a',
          time_fora_id: 'b',
          gols_casa: 2,
          gols_fora: 1,
          penaltis_casa: null,
          penaltis_fora: null,
          rodada: 1,
          fase: 'Temporada Regular',
          data: '',
          finalizada: true,
          clima: 'Ensolarado',
          gramado: 'Excelente',
          classico: false,
          sumula: {
            overall_casa: 80,
            overall_fora: 75,
            titulares_casa: [],
            titulares_fora: [],
            estatisticas: {
              posse_casa: 55,
              posse_fora: 45,
              finalizacoes_casa: 12,
              finalizacoes_fora: 8,
              finalizacoes_gol_casa: 5,
              finalizacoes_gol_fora: 3,
              finalizacoes_fora_casa: 7,
              finalizacoes_fora_fora: 5,
              defesas_casa: 2,
              defesas_fora: 3,
              xg_casa: 1.8,
              xg_fora: 0.9,
              escanteios_casa: 6,
              escanteios_fora: 3,
              faltas_casa: 10,
              faltas_fora: 12,
            },
            eventos: [
              {
                minuto: 12,
                tipo: 'gol',
                time_id: 'a',
                jogador_id: 'p1',
                jogador_nome: 'Jogador 1',
                assistencia_id: 'p2',
                assistencia_nome: 'Jogador 2',
                narracao: '12\' GOOOL! Jogador 1 marca após passe de Jogador 2.',
              },
            ],
          },
        },
      ],
      'c',
      't',
    );

    expect(standings[0]?.time_id).toBe('a');
    expect(standings[0]?.pontos).toBe(3);
    expect(standings[0]?.saldo).toBe(1);
    expect(standings[1]?.pontos).toBe(0);

    const scorers = recalculateTopScorers(
      [
        {
          id: 'm1',
          competicao_id: 'c',
          temporada_id: 't',
          time_casa_id: 'a',
          time_fora_id: 'b',
          gols_casa: 2,
          gols_fora: 1,
          penaltis_casa: null,
          penaltis_fora: null,
          rodada: 1,
          fase: 'Temporada Regular',
          data: '',
          finalizada: true,
          clima: 'Ensolarado',
          gramado: 'Excelente',
          classico: false,
          sumula: {
            overall_casa: 80,
            overall_fora: 75,
            titulares_casa: [],
            titulares_fora: [],
            estatisticas: {
              posse_casa: 55,
              posse_fora: 45,
              finalizacoes_casa: 12,
              finalizacoes_fora: 8,
              finalizacoes_gol_casa: 5,
              finalizacoes_gol_fora: 3,
              finalizacoes_fora_casa: 7,
              finalizacoes_fora_fora: 5,
              defesas_casa: 2,
              defesas_fora: 3,
              xg_casa: 1.8,
              xg_fora: 0.9,
              escanteios_casa: 6,
              escanteios_fora: 3,
              faltas_casa: 10,
              faltas_fora: 12,
            },
            eventos: [
              {
                minuto: 12,
                tipo: 'gol',
                time_id: 'a',
                jogador_id: 'p1',
                jogador_nome: 'Jogador 1',
                assistencia_id: 'p2',
                assistencia_nome: 'Jogador 2',
                narracao: '12\' GOOOL! Jogador 1 marca após passe de Jogador 2.',
              },
            ],
          },
        },
      ],
      'c',
      't',
    );

    expect(scorers.find((s) => s.jogador_id === 'p1')?.gols).toBe(1);
    expect(scorers.find((s) => s.jogador_id === 'p2')?.assistencias).toBe(1);
  });
});

describe('FM Depth Systems (Attributes, Lifecycle, Transfers, Promotions)', () => {
  const dataset = buildInitialSimulatorDataset();

  it('populates detailed attributes, club tactics, budgets, and rivalries', () => {
    const fla = dataset.times.find((t) => t.id === 'bra-flamengo')!;
    const vasco = dataset.times.find((t) => t.id === 'bra-vasco')!;
    expect(fla.estilo_tatico).toBeDefined();
    expect(fla.orcamento).toBeGreaterThan(0);
    expect(getRivalryName(fla.id, vasco.id)).toBe('Clássico dos Milhões');

    const player = dataset.jogadores.find((j) => j.time_id === fla.id)!;
    expect(player.finalizacao).toBeGreaterThanOrEqual(35);
    expect(player.valor_mercado).toBeGreaterThan(0);
    expect(player.contrato_fim_ano).toBeGreaterThanOrEqual(2026);
  });

  it('applies post-match card suspensions and injury updates', () => {
    const fla = dataset.times.find((t) => t.id === 'bra-flamengo')!;
    const pal = dataset.times.find((t) => t.id === 'bra-palmeiras')!;
    const jFla = dataset.jogadores.filter((j) => j.time_id === fla.id);
    const targetPlayer = jFla[0]!;

    // Simula jogador com 2 amarelos acumulados recebendo mais 1 amarelo
    const preDataset = {
      ...dataset,
      jogadores: dataset.jogadores.map((j) =>
        j.id === targetPlayer.id ? { ...j, amarelos_acumulados: 2 } : j,
      ),
    };

    const partida = preDataset.partidas.find(
      (p) => p.competicao_id === 'bra-serie-a' && p.rodada === 1,
    )!;

    const updated = applyPostMatchUpdates(preDataset, [
      {
        partida: {
          ...partida,
          time_casa_id: fla.id,
          time_fora_id: pal.id,
          gols_casa: 2,
          gols_fora: 1,
          finalizada: true,
        },
        eloCasaNovo: fla.elo_rating + 8,
        eloForaNovo: pal.elo_rating - 8,
        novasLesoes: [{ jogadorId: jFla[1]!.id, descricao: 'Entorse no tornozelo', jogosFora: 2 }],
        cartoesAplicados: [{ jogadorId: targetPlayer.id, amarelos: 1, vermelhos: 0 }],
      },
    ]);

    const afterSuspended = updated.jogadores.find((j) => j.id === targetPlayer.id)!;
    const afterInjured = updated.jogadores.find((j) => j.id === jFla[1]!.id)!;
    expect(afterSuspended.suspenso_jogos).toBe(1);
    expect(afterSuspended.amarelos_acumulados).toBe(0);
    expect(afterInjured.lesionado_jogos).toBe(2);
  });

  it('executes manual & AI transfers and advances season with promotion/relegation', () => {
    const fla = dataset.times.find((t) => t.id === 'bra-flamengo')!;
    const target = dataset.jogadores.find(
      (j) => j.time_id !== fla.id && j.valor_mercado <= fla.orcamento,
    )!;

    const transferRes = executeManualTransfer(dataset, target.id, fla.id);
    expect(transferRes.error).toBeUndefined();
    expect(transferRes.transfer?.time_destino_id).toBe(fla.id);
    expect(
      transferRes.dataset.jogadores.find((j) => j.id === target.id)?.time_id,
    ).toBe(fla.id);

    const windowRes = runTransferWindow(transferRes.dataset, () => 0.3);
    expect(windowRes.dataset.transferencias.length).toBeGreaterThanOrEqual(1);

    const nextSeason = advanceSeasonAndPromotions(windowRes.dataset, () => 0.5);
    expect(nextSeason.anoAtual).toBe(dataset.anoAtual + 1);
    expect(nextSeason.partidas.some((p) => !p.finalizada)).toBe(true);
    expect(nextSeason.timesCompeticao.filter((tc) => tc.competicao_id === 'uefa-ucl')).toHaveLength(24);
    expect(nextSeason.timesCompeticao.filter((tc) => tc.competicao_id === 'conmebol-lib')).toHaveLength(16);
    expect(nextSeason.timesCompeticao.filter((tc) => tc.competicao_id === 'fifa-cwc')).toHaveLength(20);
  });
});

describe('World Cup of Nations', () => {
  it('calls up 16 nations from dataset players and simulates to a champion', () => {
    const dataset = buildInitialSimulatorDataset();
    let wc = buildWorldCupTournament(dataset.jogadores);

    expect(wc.teams).toHaveLength(16);
    expect(Object.keys(wc.groups)).toHaveLength(4);
    expect(wc.partidas.filter((p) => p.fase.startsWith('Grupo'))).toHaveLength(24);
    expect(wc.championId).toBeNull();

    for (let i = 0; i < 8 && !wc.championId; i++) {
      wc = simulateWorldCupStep(wc);
    }

    expect(wc.championId).toBeTruthy();
    expect(wc.teams.some((t) => t.id === wc.championId)).toBe(true);
    const finalMatch = wc.partidas.find((p) => p.fase === 'Final');
    expect(finalMatch?.finalizada).toBe(true);
  });
});
