import { Trophy } from 'lucide-react';
import { ClubBadge } from './ClubBadge';
import type { Partida, Time } from '@/types/simulator';

interface KnockoutBracketProps {
  partidas: Partida[];
  timesMap: Map<string, Time>;
  onSelectMatch: (match: Partida) => void;
}

const PHASE_ORDER = ['Segunda Fase', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];

interface TieGroup {
  key: string;
  teamAId: string;
  teamBId: string;
  legs: Partida[];
  goalsA: number;
  goalsB: number;
  winnerId: string | null;
  penaltiesText: string | null;
}

function groupPhaseIntoTies(matches: Partida[]): TieGroup[] {
  const map = new Map<string, Partida[]>();
  for (const m of matches) {
    const k = [m.time_casa_id, m.time_fora_id].sort().join('::');
    const arr = map.get(k) ?? [];
    arr.push(m);
    map.set(k, arr);
  }

  const ties: TieGroup[] = [];
  for (const [key, legs] of map.entries()) {
    const sorted = [...legs].sort((a, b) => a.rodada - b.rodada);
    const first = sorted[0]!;
    const teamAId = first.time_casa_id;
    const teamBId = first.time_fora_id;

    let goalsA = 0;
    let goalsB = 0;
    for (const l of sorted) {
      if (!l.finalizada) continue;
      if (l.time_casa_id === teamAId) {
        goalsA += l.gols_casa ?? 0;
        goalsB += l.gols_fora ?? 0;
      } else {
        goalsB += l.gols_casa ?? 0;
        goalsA += l.gols_fora ?? 0;
      }
    }

    const allDone = sorted.every((l) => l.finalizada);
    let winnerId: string | null = null;
    let penaltiesText: string | null = null;

    if (allDone) {
      if (goalsA > goalsB) winnerId = teamAId;
      else if (goalsB > goalsA) winnerId = teamBId;
      else {
        const last = sorted[sorted.length - 1]!;
        winnerId = last.sumula?.vencedor_penaltis_id ?? teamAId;
        if (last.penaltis_casa !== null && last.penaltis_fora !== null) {
          const penA = last.time_casa_id === teamAId ? last.penaltis_casa : last.penaltis_fora;
          const penB = last.time_casa_id === teamAId ? last.penaltis_fora : last.penaltis_casa;
          penaltiesText = `Pênaltis: ${penA} x ${penB}`;
        }
      }
    }

    ties.push({ key, teamAId, teamBId, legs: sorted, goalsA, goalsB, winnerId, penaltiesText });
  }
  return ties;
}

export function KnockoutBracket({ partidas, timesMap, onSelectMatch }: KnockoutBracketProps) {
  const koMatches = partidas.filter(
    (p) => p.fase !== 'Temporada Regular' && !p.fase.startsWith('Grupo'),
  );

  if (koMatches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        O chaveamento de mata-mata será gerado automaticamente assim que a fase de grupos for concluída.
      </div>
    );
  }

  const phasesPresent = PHASE_ORDER.filter((phase) => koMatches.some((m) => m.fase === phase));
  const finalMatches = koMatches.filter((m) => m.fase === 'Final');
  const finalTie = finalMatches.length > 0 ? groupPhaseIntoTies(finalMatches)[0] : null;
  const champion = finalTie?.winnerId ? timesMap.get(finalTie.winnerId) : null;

  return (
    <div className="space-y-4">
      {champion && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Campeão da Temporada
              </div>
              <div className="flex items-center gap-2 text-base font-bold">
                <ClubBadge team={champion} size="sm" />
                <span>{champion.nome}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {phasesPresent.map((phase) => {
          const ties = groupPhaseIntoTies(koMatches.filter((m) => m.fase === phase));
          return (
            <div key={phase} className="min-w-[260px] flex-1 space-y-3">
              <div className="rounded-md bg-muted px-3 py-1.5 text-center text-xs font-bold tracking-wider uppercase">
                {phase}
              </div>
              <div className="space-y-3">
                {ties.map((tie) => {
                  const teamA = timesMap.get(tie.teamAId);
                  const teamB = timesMap.get(tie.teamBId);
                  if (!teamA || !teamB) return null;
                  const anyDone = tie.legs.some((l) => l.finalizada);
                  const nextPendingLeg = tie.legs.find((l) => !l.finalizada);
                  const targetLeg = nextPendingLeg ?? tie.legs[tie.legs.length - 1]!;

                  return (
                    <div
                      key={tie.key}
                      onClick={() => onSelectMatch(targetLeg)}
                      className="cursor-pointer rounded-lg border bg-card p-2.5 shadow-xs transition-colors hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="space-y-1.5">
                        <div
                          className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            tie.winnerId === teamA.id ? 'bg-emerald-500/15 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ClubBadge team={teamA} size="xs" />
                            <span className="truncate">{teamA.nome}</span>
                          </div>
                          <span className="font-mono font-semibold">
                            {anyDone ? tie.goalsA : '-'}
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                            tie.winnerId === teamB.id ? 'bg-emerald-500/15 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ClubBadge team={teamB} size="xs" />
                            <span className="truncate">{teamB.nome}</span>
                          </div>
                          <span className="font-mono font-semibold">
                            {anyDone ? tie.goalsB : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t pt-1 text-[10px] text-muted-foreground">
                        {tie.legs.length > 1 ? (
                          <div className="flex items-center gap-1">
                            {tie.legs.map((leg, i) => (
                              <button
                                key={leg.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectMatch(leg);
                                }}
                                className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                                  leg.finalizada
                                    ? 'bg-muted text-foreground hover:bg-muted/80'
                                    : 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                                }`}
                              >
                                {i === 0 ? 'Ida' : 'Volta'}:{' '}
                                {leg.finalizada ? `${leg.gols_casa}x${leg.gols_fora}` : 'Simular'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span>Jogo único</span>
                        )}
                        {tie.penaltiesText && (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {tie.penaltiesText}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
