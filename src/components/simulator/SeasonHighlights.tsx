import { Award, Flame, ShieldAlert, TrendingDown, Trophy } from 'lucide-react';
import type { Artilharia, Classificacao, Jogador, Partida, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface SeasonHighlightsProps {
  standings: Classificacao[];
  partidas: Partida[];
  artilharia: Artilharia[];
  timesMap: Map<string, Time>;
  jogadoresMap: Map<string, Jogador>;
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (player: Jogador) => void;
}

export function SeasonHighlights({
  standings,
  partidas,
  artilharia,
  timesMap,
  jogadoresMap,
  onSelectTeam,
  onSelectPlayer,
}: SeasonHighlightsProps) {
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    return b.gols_pro - a.gols_pro;
  });

  const leaderRow = sortedStandings[0];
  const bottomRow = sortedStandings.length > 1 ? sortedStandings[sortedStandings.length - 1] : undefined;
  const leaderTeam = leaderRow ? timesMap.get(leaderRow.time_id) : undefined;
  const bottomTeam = bottomRow ? timesMap.get(bottomRow.time_id) : undefined;

  const topScorerRow = [...artilharia].sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias)[0];
  const topScorer = topScorerRow ? jogadoresMap.get(topScorerRow.jogador_id) : undefined;
  const topScorerTeam = topScorer ? timesMap.get(topScorer.time_id) : undefined;

  const finishedMatches = partidas.filter((m) => m.finalizada);
  const lastRound = finishedMatches.length > 0 ? Math.max(...finishedMatches.map((m) => m.rodada)) : null;
  const lastRoundMatches = lastRound !== null ? finishedMatches.filter((m) => m.rodada === lastRound) : [];

  // Melhor time da rodada (maior saldo de gols na última rodada)
  let bestTeamOfRound: { team: Time; scoreText: string } | null = null;
  let bestDiff = -99;
  for (const m of lastRoundMatches) {
    const gc = m.gols_casa ?? 0;
    const gf = m.gols_fora ?? 0;
    if (gc > gf && gc - gf > bestDiff) {
      const t = timesMap.get(m.time_casa_id);
      if (t) {
        bestDiff = gc - gf;
        bestTeamOfRound = { team: t, scoreText: `${gc}x${gf} (casa)` };
      }
    } else if (gf > gc && gf - gc > bestDiff) {
      const t = timesMap.get(m.time_fora_id);
      if (t) {
        bestDiff = gf - gc;
        bestTeamOfRound = { team: t, scoreText: `${gf}x${gc} (fora)` };
      }
    }
  }

  // Zebra da rodada (maior diferença de OVR/Elo onde o azarão venceu)
  let upset: { winner: Time; loser: Time; score: string; gap: number } | null = null;
  for (const m of lastRoundMatches) {
    const home = timesMap.get(m.time_casa_id);
    const away = timesMap.get(m.time_fora_id);
    if (!home || !away) continue;
    const gc = m.gols_casa ?? 0;
    const gf = m.gols_fora ?? 0;
    if (gc === gf) continue;
    const winner = gc > gf ? home : away;
    const loser = gc > gf ? away : home;
    const eloGap = loser.elo_rating - winner.elo_rating;
    if (eloGap > 30 && (!upset || eloGap > upset.gap)) {
      upset = {
        winner,
        loser,
        score: gc > gf ? `${gc}x${gf}` : `${gf}x${gc}`,
        gap: Math.round(eloGap),
      };
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* Líder */}
      <div
        onClick={() => leaderTeam && onSelectTeam(leaderTeam.id)}
        className="cursor-pointer rounded-xl border border-emerald-500/25 bg-slate-900/70 p-3.5 transition hover:border-emerald-400/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-400">
          <Trophy className="h-3.5 w-3.5" /> Líder
        </div>
        {leaderTeam && leaderRow ? (
          <div className="mt-2 flex items-center gap-2.5">
            <ClubBadge team={leaderTeam} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{leaderTeam.nome}</div>
              <div className="text-[11px] text-slate-400">
                {leaderRow.pontos} pts • {leaderRow.vitorias}V
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Sem dados</div>
        )}
      </div>

      {/* Artilheiro */}
      <div
        onClick={() => topScorer && onSelectPlayer(topScorer)}
        className="cursor-pointer rounded-xl border border-amber-500/25 bg-slate-900/70 p-3.5 transition hover:border-amber-400/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-400">
          <Award className="h-3.5 w-3.5" /> Artilheiro
        </div>
        {topScorer && topScorerRow ? (
          <div className="mt-2 flex items-center gap-2.5">
            {topScorerTeam && (
              <ClubBadge
                team={topScorerTeam}
                size="sm"
              />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{topScorer.nome}</div>
              <div className="text-[11px] text-slate-400">
                {topScorerRow.gols} gol(s) • {topScorerRow.assistencias} assist.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Nenhum gol marcado</div>
        )}
      </div>

      {/* Melhor Time da Rodada */}
      <div
        onClick={() => bestTeamOfRound && onSelectTeam(bestTeamOfRound.team.id)}
        className="cursor-pointer rounded-xl border border-sky-500/25 bg-slate-900/70 p-3.5 transition hover:border-sky-400/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-sky-400">
          <Flame className="h-3.5 w-3.5" /> Destaque R{lastRound ?? '-'}
        </div>
        {bestTeamOfRound ? (
          <div className="mt-2 flex items-center gap-2.5">
            <ClubBadge
              team={bestTeamOfRound.team}
              size="sm"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{bestTeamOfRound.team.nome}</div>
              <div className="text-[11px] text-slate-400">Vitória por {bestTeamOfRound.scoreText}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Simule uma rodada</div>
        )}
      </div>

      {/* Zebra da Rodada */}
      <div
        onClick={() => upset && onSelectTeam(upset.winner.id)}
        className="cursor-pointer rounded-xl border border-purple-500/25 bg-slate-900/70 p-3.5 transition hover:border-purple-400/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-purple-400">
          <ShieldAlert className="h-3.5 w-3.5" /> Zebra da Rodada
        </div>
        {upset ? (
          <div className="mt-2 flex items-center gap-2.5">
            <ClubBadge
              team={upset.winner}
              size="sm"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{upset.winner.nome}</div>
              <div className="truncate text-[11px] text-slate-400">
                {upset.score} vs {upset.loser.sigla} (-{upset.gap} Elo)
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Sem surpresas na rodada</div>
        )}
      </div>

      {/* Lanterna */}
      <div
        onClick={() => bottomTeam && onSelectTeam(bottomTeam.id)}
        className="cursor-pointer rounded-xl border border-rose-500/25 bg-slate-900/70 p-3.5 transition hover:border-rose-400/50"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-rose-400">
          <TrendingDown className="h-3.5 w-3.5" /> Lanterna
        </div>
        {bottomTeam && bottomRow ? (
          <div className="mt-2 flex items-center gap-2.5">
            <ClubBadge team={bottomTeam} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{bottomTeam.nome}</div>
              <div className="text-[11px] text-slate-400">
                {bottomRow.pontos} pts • {bottomRow.saldo >= 0 ? `+${bottomRow.saldo}` : bottomRow.saldo} SG
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Sem dados</div>
        )}
      </div>
    </div>
  );
}
