import { useMemo, useState } from 'react';
import { Swords, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateAverageOverall, selectStartingXI } from '@/lib/simulation-engine';
import type { Competicao, Jogador, Partida, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface HeadToHeadModalProps {
  times: Time[];
  jogadores: Jogador[];
  partidas: Partida[];
  competicoes: Competicao[];
  initialTeamAId?: string;
  initialTeamBId?: string;
  onClose: () => void;
}

export function HeadToHeadModal({
  times,
  jogadores,
  partidas,
  competicoes,
  initialTeamAId = 'bra-flamengo',
  initialTeamBId = 'bra-palmeiras',
  onClose,
}: HeadToHeadModalProps) {
  const [teamAId, setTeamAId] = useState(initialTeamAId);
  const [teamBId, setTeamBId] = useState(initialTeamBId);

  const sortedTeams = useMemo(() => [...times].sort((a, b) => a.nome.localeCompare(b.nome)), [times]);
  const timesMap = useMemo(() => new Map(times.map((t) => [t.id, t])), [times]);
  const compsMap = useMemo(() => new Map(competicoes.map((c) => [c.id, c.nome])), [competicoes]);

  const teamA = timesMap.get(teamAId) ?? sortedTeams[0]!;
  const teamB = timesMap.get(teamBId) ?? sortedTeams[1]!;

  const ovrA = useMemo(
    () => calculateAverageOverall(selectStartingXI(jogadores.filter((j) => j.time_id === teamA.id))),
    [jogadores, teamA.id],
  );
  const ovrB = useMemo(
    () => calculateAverageOverall(selectStartingXI(jogadores.filter((j) => j.time_id === teamB.id))),
    [jogadores, teamB.id],
  );

  // Probabilidade pré-jogo (Elo + OVR neutro)
  const { probA, probDraw, probB } = useMemo(() => {
    const scoreA = teamA.elo_rating * 0.6 + ovrA * 12;
    const scoreB = teamB.elo_rating * 0.6 + ovrB * 12;
    const expA = 1 / (1 + Math.pow(10, (scoreB - scoreA) / 260));
    const draw = Math.max(0.16, 0.29 - Math.abs(expA - 0.5) * 0.22);
    const pA = Math.round(expA * (1 - draw) * 100);
    const pD = Math.round(draw * 100);
    const pB = Math.max(1, 100 - pA - pD);
    return { probA: pA, probDraw: pD, probB: pB };
  }, [teamA.elo_rating, teamB.elo_rating, ovrA, ovrB]);

  const clashes = useMemo(() => {
    return partidas.filter(
      (m) =>
        m.finalizada &&
        ((m.time_casa_id === teamA.id && m.time_fora_id === teamB.id) ||
          (m.time_casa_id === teamB.id && m.time_fora_id === teamA.id)),
    );
  }, [partidas, teamA.id, teamB.id]);

  const summary = useMemo(() => {
    let winsA = 0;
    let draws = 0;
    let winsB = 0;
    let goalsA = 0;
    let goalsB = 0;
    for (const m of clashes) {
      const aHome = m.time_casa_id === teamA.id;
      const gA = aHome ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0);
      const gB = aHome ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0);
      goalsA += gA;
      goalsB += gB;
      if (gA > gB) winsA++;
      else if (gA < gB) winsB++;
      else draws++;
    }
    return { winsA, draws, winsB, goalsA, goalsB };
  }, [clashes, teamA.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Swords className="h-4 w-4" /> Comparador Head-to-Head (H2H)
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-slate-300" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Selectors */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
              <select
                value={teamA.id}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                {sortedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <div className="flex justify-center pt-1">
                <ClubBadge team={teamA} size="lg" />
              </div>
              <div className="text-xs text-slate-400">
                OVR <strong className="font-mono text-emerald-400">{ovrA}</strong> • Elo{' '}
                <strong className="font-mono text-white">{teamA.elo_rating}</strong>
              </div>
            </div>

            <div className="text-center font-mono text-xl font-black text-slate-500">VS</div>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
              <select
                value={teamB.id}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                {sortedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <div className="flex justify-center pt-1">
                <ClubBadge team={teamB} size="lg" />
              </div>
              <div className="text-xs text-slate-400">
                OVR <strong className="font-mono text-sky-400">{ovrB}</strong> • Elo{' '}
                <strong className="font-mono text-white">{teamB.elo_rating}</strong>
              </div>
            </div>
          </div>

          {/* Probabilidades */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-2 flex justify-between text-xs font-bold">
              <span className="text-emerald-400">
                {teamA.sigla} {probA}%
              </span>
              <span className="text-slate-400">Empate {probDraw}%</span>
              <span className="text-sky-400">
                {probB}% {teamB.sigla}
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div className="bg-emerald-500" style={{ width: `${probA}%` }} />
              <div className="bg-slate-500" style={{ width: `${probDraw}%` }} />
              <div className="bg-sky-500" style={{ width: `${probB}%` }} />
            </div>
          </div>

          {/* Retrospecto */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] font-bold uppercase text-emerald-400">Vitórias {teamA.sigla}</div>
              <div className="mt-1 font-mono text-2xl font-black text-white">{summary.winsA}</div>
              <div className="text-[11px] text-slate-400">{summary.goalsA} gols</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] font-bold uppercase text-slate-400">Empates</div>
              <div className="mt-1 font-mono text-2xl font-black text-white">{summary.draws}</div>
              <div className="text-[11px] text-slate-400">{clashes.length} jogos</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[11px] font-bold uppercase text-sky-400">Vitórias {teamB.sigla}</div>
              <div className="mt-1 font-mono text-2xl font-black text-white">{summary.winsB}</div>
              <div className="text-[11px] text-slate-400">{summary.goalsB} gols</div>
            </div>
          </div>

          {/* Lista de confrontos */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Confrontos Disputados no Simulador
            </h3>
            {clashes.length === 0 ? (
              <p className="text-xs text-slate-500">
                Ainda não houve partidas finalizadas entre {teamA.nome} e {teamB.nome} nesta temporada.
              </p>
            ) : (
              <div className="space-y-2">
                {clashes.map((m) => {
                  const home = timesMap.get(m.time_casa_id);
                  const away = timesMap.get(m.time_fora_id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-2 text-xs"
                    >
                      <span className="text-[11px] text-slate-400">
                        {compsMap.get(m.competicao_id) ?? m.competicao_id} • R{m.rodada}
                      </span>
                      <span className="font-mono font-bold text-white">
                        {home?.sigla} {m.gols_casa} x {m.gols_fora} {away?.sigla}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
