import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { calculateMarketValueAndSalary, generateDetailedAttributes } from '@/data/club-metadata';
import { buildInitialSimulatorDataset, type SimulatorDataset } from '@/data/seed-builder';
import {
  advanceSeasonAndPromotions,
  applyPostMatchUpdates,
  executeManualTransfer,
  runTransferWindow,
} from '@/lib/season-lifecycle';
import {
  generateKnockoutPhaseMatches,
  getPhaseNameForTeamCount,
  recalculateStandings,
  recalculateTopScorers,
  resolveKnockoutWinners,
  simulateMatch,
  type SimulateMatchResult,
} from '@/lib/simulation-engine';
import { supabase } from '@/lib/supabase';
import type { Competicao, Jogador, Partida, PernaDominante, Posicao, Tecnico, Time } from '@/types/simulator';

export type DataSourceMode = 'memory' | 'supabase';

export interface NewPlayerInput {
  time_id: string;
  nome: string;
  posicao: Posicao;
  numero: number;
  nacionalidade: string;
  idade: number;
  overall: number;
  perna_dominante: PernaDominante;
}

interface SimulatorContextValue {
  dataset: SimulatorDataset;
  dataSource: DataSourceMode;
  loading: boolean;
  simularPartida: (partidaId: string) => void;
  simularRodada: (competicaoId: string, temporadaId: string, rodada: number) => void;
  simularTemporada: (competicaoId: string, temporadaId: string) => void;
  resetarTemporada: (competicaoId: string, temporadaId: string) => void;
  avancarTemporada: () => void;
  comprarJogador: (jogadorId: string, timeDestinoId: string) => { ok: boolean; error?: string };
  simularJanela: () => number;
  adicionarJogador: (jogador: NewPlayerInput) => void;
  atualizarJogador: (jogador: Jogador) => void;
  removerJogador: (jogadorId: string) => void;
  atualizarTime: (time: Partial<Time> & { id: string }) => void;
  atualizarTecnico: (timeId: string, nome: string, nacionalidade: string) => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

function advanceKnockoutIfNeeded(
  comp: Competicao,
  temporadaId: string,
  allMatches: Partida[],
  dataset: SimulatorDataset,
): Partida[] {
  const compMatches = allMatches.filter(
    (m) => m.competicao_id === comp.id && m.temporada_id === temporadaId,
  );
  if (compMatches.length === 0) return allMatches;

  if (comp.formato === 'mata-mata') {
    const phases = Array.from(new Set(compMatches.map((m) => m.fase)));
    const lastPhase = phases[phases.length - 1]!;
    const lastPhaseMatches = compMatches.filter((m) => m.fase === lastPhase);
    if (lastPhase !== 'Final' && lastPhaseMatches.every((m) => m.finalizada)) {
      const winners = resolveKnockoutWinners(lastPhaseMatches);
      if (winners.length >= 2) {
        const nextPhase = getPhaseNameForTeamCount(winners.length);
        const alreadyExists = compMatches.some((m) => m.fase === nextPhase);
        if (!alreadyExists) {
          const maxRound = Math.max(...compMatches.map((m) => m.rodada));
          const nextMatches = generateKnockoutPhaseMatches(
            winners,
            comp.id,
            temporadaId,
            nextPhase,
            maxRound + 1,
            true,
          );
          return [...allMatches, ...nextMatches];
        }
      }
    }
  } else if (comp.formato === 'grupos') {
    const groupMatches = compMatches.filter((m) => m.fase.startsWith('Grupo'));
    const koMatches = compMatches.filter((m) => !m.fase.startsWith('Grupo'));
    if (groupMatches.length > 0 && groupMatches.every((m) => m.finalizada) && koMatches.length === 0) {
      // Avançam os 2 melhores de cada grupo
      const entries = dataset.timesCompeticao.filter(
        (tc) => tc.competicao_id === comp.id && tc.temporada_id === temporadaId,
      );
      const standings = recalculateStandings(entries, groupMatches, comp.id, temporadaId, true);
      const groups = Array.from(new Set(entries.map((e) => e.grupo).filter(Boolean))) as string[];
      const firsts: string[] = [];
      const seconds: string[] = [];
      for (const g of groups.sort()) {
        const gRows = standings.filter((s) => s.grupo === g);
        if (gRows[0]) firsts.push(gRows[0].time_id);
        if (gRows[1]) seconds.push(gRows[1].time_id);
      }
      // Cruzamento: 1A x 2B, 1B x 2A, etc.
      const seeded: string[] = [];
      for (let i = 0; i < firsts.length; i++) {
        const oppIdx = (i + 1) % seconds.length;
        seeded.push(firsts[i]!, seconds[oppIdx] ?? seconds[i]!);
      }
      // Garante potência de 2 (até 16)
      const pow2 = seeded.length >= 16 ? 16 : seeded.length >= 8 ? 8 : seeded.length >= 4 ? 4 : 2;
      const bracketTeams = seeded.slice(0, pow2);
      const nextPhase = getPhaseNameForTeamCount(bracketTeams.length);
      const maxRound = Math.max(...groupMatches.map((m) => m.rodada));
      const nextMatches = generateKnockoutPhaseMatches(
        bracketTeams,
        comp.id,
        temporadaId,
        nextPhase,
        maxRound + 1,
        comp.id !== 'fifa-cwc',
      );
      return [...allMatches, ...nextMatches];
    } else if (koMatches.length > 0) {
      const phases = Array.from(new Set(koMatches.map((m) => m.fase)));
      const lastPhase = phases[phases.length - 1]!;
      const lastPhaseMatches = koMatches.filter((m) => m.fase === lastPhase);
      if (lastPhase !== 'Final' && lastPhaseMatches.every((m) => m.finalizada)) {
        const winners = resolveKnockoutWinners(lastPhaseMatches);
        if (winners.length >= 2) {
          const nextPhase = getPhaseNameForTeamCount(winners.length);
          const alreadyExists = koMatches.some((m) => m.fase === nextPhase);
          if (!alreadyExists) {
            const maxRound = Math.max(...compMatches.map((m) => m.rodada));
            const nextMatches = generateKnockoutPhaseMatches(
              winners,
              comp.id,
              temporadaId,
              nextPhase,
              maxRound + 1,
              comp.id !== 'fifa-cwc',
            );
            return [...allMatches, ...nextMatches];
          }
        }
      }
    }
  }

  return allMatches;
}

function getKnockoutMatchContext(match: Partida, compMatches: Partida[]) {
  if (match.fase === 'Temporada Regular' || match.fase.startsWith('Grupo')) {
    return { allowPenalties: false, aggCasa: 0, aggFora: 0 };
  }
  const sameTie = compMatches.filter(
    (m) =>
      m.fase === match.fase &&
      ((m.time_casa_id === match.time_casa_id && m.time_fora_id === match.time_fora_id) ||
        (m.time_casa_id === match.time_fora_id && m.time_fora_id === match.time_casa_id)),
  );
  if (sameTie.length === 1) {
    return { allowPenalties: true, aggCasa: 0, aggFora: 0 };
  }
  const firstLeg = sameTie.find((m) => m.id !== match.id && m.finalizada);
  if (!firstLeg) {
    return { allowPenalties: false, aggCasa: 0, aggFora: 0 };
  }
  const aggCasa = firstLeg.time_casa_id === match.time_casa_id ? (firstLeg.gols_casa ?? 0) : (firstLeg.gols_fora ?? 0);
  const aggFora = firstLeg.time_fora_id === match.time_fora_id ? (firstLeg.gols_fora ?? 0) : (firstLeg.gols_casa ?? 0);
  return { allowPenalties: true, aggCasa, aggFora };
}

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = useState<SimulatorDataset>(() => buildInitialSimulatorDataset());
  const [dataSource, setDataSource] = useState<DataSourceMode>('memory');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function tryLoadSupabase() {
      try {
        const { data: timesData, error } = await (supabase as unknown as {
          from: (table: string) => { select: (cols: string) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } };
        })
          .from('times')
          .select('id')
          .limit(1);

        if (!active) return;
        if (!error && timesData && timesData.length > 0) {
          // Tabelas existem e estão populadas no Supabase!
          // Mantemos carregamento completo sob demanda ou sincronizado
          setDataSource('supabase');
        }
      } catch {
        // Fallback silencioso para modo em memória
      } finally {
        if (active) setLoading(false);
      }
    }
    void tryLoadSupabase();
    return () => {
      active = false;
    };
  }, []);

  const recomputeCompetitionDerived = useCallback(
    (prev: SimulatorDataset, competicaoId: string, temporadaId: string, partidas: Partida[], times: Time[]): SimulatorDataset => {
      const comp = prev.competicoes.find((c) => c.id === competicaoId);
      const updatedPartidas = comp
        ? advanceKnockoutIfNeeded(comp, temporadaId, partidas, prev)
        : partidas;

      const compPartidas = updatedPartidas.filter(
        (m) => m.competicao_id === competicaoId && m.temporada_id === temporadaId,
      );
      const compEntries = prev.timesCompeticao.filter(
        (tc) => tc.competicao_id === competicaoId && tc.temporada_id === temporadaId,
      );

      const newCompStandings = recalculateStandings(
        compEntries,
        compPartidas,
        competicaoId,
        temporadaId,
        comp?.formato === 'grupos',
      );
      const otherStandings = prev.classificacao.filter(
        (c) => !(c.competicao_id === competicaoId && c.temporada_id === temporadaId),
      );

      const newCompScorers = recalculateTopScorers(compPartidas, competicaoId, temporadaId);
      const otherScorers = prev.artilharia.filter(
        (a) => !(a.competicao_id === competicaoId && a.temporada_id === temporadaId),
      );

      return {
        ...prev,
        times,
        partidas: updatedPartidas,
        classificacao: [...otherStandings, ...newCompStandings],
        artilharia: [...otherScorers, ...newCompScorers],
      };
    },
    [],
  );

  const simularPartida = useCallback(
    (partidaId: string) => {
      setDataset((prev) => {
        const target = prev.partidas.find((p) => p.id === partidaId);
        if (!target || target.finalizada) return prev;

        const timesMap = new Map(prev.times.map((t) => [t.id, t]));
        const home = timesMap.get(target.time_casa_id);
        const away = timesMap.get(target.time_fora_id);
        if (!home || !away) return prev;

        const compMatches = prev.partidas.filter(
          (m) => m.competicao_id === target.competicao_id && m.temporada_id === target.temporada_id,
        );
        const ko = getKnockoutMatchContext(target, compMatches);

        const res = simulateMatch({
          partida: target,
          timeCasa: home,
          timeFora: away,
          jogadoresCasa: prev.jogadores.filter((j) => j.time_id === home.id),
          jogadoresFora: prev.jogadores.filter((j) => j.time_id === away.id),
          allowPenalties: ko.allowPenalties,
          aggregateCasaBefore: ko.aggCasa,
          aggregateForaBefore: ko.aggFora,
        });

        const nextPartidas = prev.partidas.map((p) => (p.id === partidaId ? res.partida : p));
        const afterLifecycle = applyPostMatchUpdates(prev, [res]);
        return recomputeCompetitionDerived(
          afterLifecycle,
          target.competicao_id,
          target.temporada_id,
          nextPartidas,
          afterLifecycle.times,
        );
      });
    },
    [recomputeCompetitionDerived],
  );

  const simularRodada = useCallback(
    (competicaoId: string, temporadaId: string, rodada: number) => {
      setDataset((prev) => {
        const timesMap = new Map(prev.times.map((t) => [t.id, { ...t }]));
        const compMatches = prev.partidas.filter(
          (m) => m.competicao_id === competicaoId && m.temporada_id === temporadaId,
        );
        const roundIds = new Set(
          compMatches.filter((m) => m.rodada === rodada && !m.finalizada).map((m) => m.id),
        );
        if (roundIds.size === 0) return prev;

        const results: SimulateMatchResult[] = [];
        const nextPartidas = prev.partidas.map((m) => {
          if (!roundIds.has(m.id)) return m;
          const home = timesMap.get(m.time_casa_id);
          const away = timesMap.get(m.time_fora_id);
          if (!home || !away) return m;
          const ko = getKnockoutMatchContext(m, compMatches);
          const res = simulateMatch({
            partida: m,
            timeCasa: home,
            timeFora: away,
            jogadoresCasa: prev.jogadores.filter((j) => j.time_id === home.id),
            jogadoresFora: prev.jogadores.filter((j) => j.time_id === away.id),
            allowPenalties: ko.allowPenalties,
            aggregateCasaBefore: ko.aggCasa,
            aggregateForaBefore: ko.aggFora,
          });
          results.push(res);
          return res.partida;
        });

        const afterLifecycle = applyPostMatchUpdates(prev, results);
        const nextState = recomputeCompetitionDerived(
          afterLifecycle,
          competicaoId,
          temporadaId,
          nextPartidas,
          afterLifecycle.times,
        );
        const comp = prev.competicoes.find((c) => c.id === competicaoId);
        const maxRound = Math.max(...compMatches.map((m) => m.rodada), 0);
        if (comp?.tipo === 'liga' && maxRound >= 10 && rodada === Math.ceil(maxRound / 2)) {
          return runTransferWindow(nextState, Math.random, 20).dataset;
        }
        return nextState;
      });
    },
    [recomputeCompetitionDerived],
  );

  const simularTemporada = useCallback(
    (competicaoId: string, temporadaId: string) => {
      setDataset((prev) => {
        let current = prev;
        // Loop até no máximo 50 iterações (cobre 38 rodadas + fases de mata-mata)
        for (let step = 0; step < 50; step++) {
          const pending = current.partidas
            .filter((m) => m.competicao_id === competicaoId && m.temporada_id === temporadaId && !m.finalizada)
            .sort((a, b) => a.rodada - b.rodada);
          if (pending.length === 0) break;

          const nextRound = pending[0]!.rodada;
          const timesMap = new Map(current.times.map((t) => [t.id, { ...t }]));
          const compMatches = current.partidas.filter(
            (m) => m.competicao_id === competicaoId && m.temporada_id === temporadaId,
          );
          const roundIds = new Set(pending.filter((m) => m.rodada === nextRound).map((m) => m.id));

          const results: SimulateMatchResult[] = [];
          const nextPartidas = current.partidas.map((m) => {
            if (!roundIds.has(m.id)) return m;
            const home = timesMap.get(m.time_casa_id);
            const away = timesMap.get(m.time_fora_id);
            if (!home || !away) return m;
            const ko = getKnockoutMatchContext(m, compMatches);
            const res = simulateMatch({
              partida: m,
              timeCasa: home,
              timeFora: away,
              jogadoresCasa: current.jogadores.filter((j) => j.time_id === home.id),
              jogadoresFora: current.jogadores.filter((j) => j.time_id === away.id),
              allowPenalties: ko.allowPenalties,
              aggregateCasaBefore: ko.aggCasa,
              aggregateForaBefore: ko.aggFora,
            });
            results.push(res);
            return res.partida;
          });

          const afterLifecycle = applyPostMatchUpdates(current, results);
          current = recomputeCompetitionDerived(
            afterLifecycle,
            competicaoId,
            temporadaId,
            nextPartidas,
            afterLifecycle.times,
          );
          const comp = current.competicoes.find((c) => c.id === competicaoId);
          const maxRound = Math.max(...compMatches.map((m) => m.rodada), 0);
          if (comp?.tipo === 'liga' && maxRound >= 10 && nextRound === Math.ceil(maxRound / 2)) {
            current = runTransferWindow(current, Math.random, 20).dataset;
          }
        }
        return current;
      });
    },
    [recomputeCompetitionDerived],
  );

  const resetarTemporada = useCallback((competicaoId: string, temporadaId: string) => {
    const fresh = buildInitialSimulatorDataset();
    setDataset((prev) => ({
      ...prev,
      partidas: [
        ...prev.partidas.filter((m) => !(m.competicao_id === competicaoId && m.temporada_id === temporadaId)),
        ...fresh.partidas.filter((m) => m.competicao_id === competicaoId && m.temporada_id === temporadaId),
      ],
      classificacao: [
        ...prev.classificacao.filter((c) => !(c.competicao_id === competicaoId && c.temporada_id === temporadaId)),
        ...fresh.classificacao.filter((c) => c.competicao_id === competicaoId && c.temporada_id === temporadaId),
      ],
      artilharia: prev.artilharia.filter((a) => !(a.competicao_id === competicaoId && a.temporada_id === temporadaId)),
    }));
  }, []);

  const avancarTemporada = useCallback(() => {
    setDataset((prev) => advanceSeasonAndPromotions(prev));
  }, []);

  const comprarJogador = useCallback(
    (jogadorId: string, timeDestinoId: string): { ok: boolean; error?: string } => {
      let outcome: { ok: boolean; error?: string } = { ok: true };
      setDataset((prev) => {
        const res = executeManualTransfer(prev, jogadorId, timeDestinoId);
        if (res.error) {
          outcome = { ok: false, error: res.error };
          return prev;
        }
        return res.dataset;
      });
      return outcome;
    },
    [],
  );

  const simularJanela = useCallback((): number => {
    let count = 0;
    setDataset((prev) => {
      const res = runTransferWindow(prev);
      count = res.transfers.length;
      return res.dataset;
    });
    return count;
  }, []);

  const adicionarJogador = useCallback((jogador: NewPlayerInput) => {
    const playerId = `${jogador.time_id}-custom-${Date.now()}`;
    const attrs = generateDetailedAttributes(playerId, jogador.posicao, jogador.overall, jogador.idade);
    setDataset((prev) => {
      const teamElo = prev.times.find((t) => t.id === jogador.time_id)?.elo_rating ?? 1500;
      const { valorMercado, salarioSemanal } = calculateMarketValueAndSalary(
        jogador.overall,
        jogador.idade,
        teamElo,
      );
      return {
        ...prev,
        jogadores: [
          ...prev.jogadores,
          {
            ...jogador,
            id: playerId,
            ...attrs,
            forma_fisica: 92,
            moral: 78,
            amarelos_acumulados: 0,
            vermelhos_temporada: 0,
            suspenso_jogos: 0,
            lesionado_jogos: 0,
            lesao_descricao: null,
            salario_semanal: salarioSemanal,
            valor_mercado: valorMercado,
            contrato_fim_ano: prev.anoAtual + 3,
            historico_temporadas: [],
            timeline_ocorrencias: [],
          },
        ],
      };
    });
  }, []);

  const atualizarJogador = useCallback((jogador: Jogador) => {
    setDataset((prev) => ({
      ...prev,
      jogadores: prev.jogadores.map((j) => (j.id === jogador.id ? jogador : j)),
    }));
  }, []);

  const removerJogador = useCallback((jogadorId: string) => {
    setDataset((prev) => ({
      ...prev,
      jogadores: prev.jogadores.filter((j) => j.id !== jogadorId),
    }));
  }, []);

  const atualizarTime = useCallback((time: Partial<Time> & { id: string }) => {
    setDataset((prev) => ({
      ...prev,
      times: prev.times.map((t) => (t.id === time.id ? { ...t, ...time } : t)),
    }));
  }, []);

  const atualizarTecnico = useCallback((timeId: string, nome: string, nacionalidade: string) => {
    setDataset((prev) => {
      const exists = prev.tecnicos.some((tec) => tec.time_id === timeId);
      const nextTecnicos: Tecnico[] = exists
        ? prev.tecnicos.map((tec) => (tec.time_id === timeId ? { ...tec, nome, nacionalidade } : tec))
        : [...prev.tecnicos, { id: `tec-${timeId}`, time_id: timeId, nome, nacionalidade }];
      return { ...prev, tecnicos: nextTecnicos };
    });
  }, []);

  const value = useMemo<SimulatorContextValue>(
    () => ({
      dataset,
      dataSource,
      loading,
      simularPartida,
      simularRodada,
      simularTemporada,
      resetarTemporada,
      avancarTemporada,
      comprarJogador,
      simularJanela,
      adicionarJogador,
      atualizarJogador,
      removerJogador,
      atualizarTime,
      atualizarTecnico,
    }),
    [
      dataset,
      dataSource,
      loading,
      simularPartida,
      simularRodada,
      simularTemporada,
      resetarTemporada,
      avancarTemporada,
      comprarJogador,
      simularJanela,
      adicionarJogador,
      atualizarJogador,
      removerJogador,
      atualizarTime,
      atualizarTecnico,
    ],
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider');
  return ctx;
}
