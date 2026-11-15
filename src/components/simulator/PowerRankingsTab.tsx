import { useMemo, useState } from 'react';
import { Award, Crown, Flame, Globe, Snowflake, Trophy } from 'lucide-react';
import { useSimulator } from '@/lib/simulator-store';
import type { Jogador, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface PowerRankingsTabProps {
  compTeamIds: string[];
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (player: Jogador) => void;
}

export function PowerRankingsTab({
  compTeamIds,
  onSelectTeam,
  onSelectPlayer,
}: PowerRankingsTabProps) {
  const { dataset } = useSimulator();
  const [subView, setSubView] = useState<'global' | 'momentum' | 'hall'>('global');

  const timesMap = useMemo(() => new Map(dataset.times.map((t) => [t.id, t])), [dataset.times]);
  const paisMap = useMemo(() => new Map(dataset.paises.map((p) => [p.id, p])), [dataset.paises]);

  // Global club power ranking
  const globalTopClubs = useMemo(
    () => [...dataset.times].sort((a, b) => b.elo_rating - a.elo_rating).slice(0, 30),
    [dataset.times],
  );

  // League power ranking (average Elo of division 1 leagues)
  const leagueRankings = useMemo(() => {
    const leagues = dataset.competicoes.filter((c) => c.tipo === 'liga' && c.divisao === 1);
    return leagues
      .map((comp) => {
        const ids = new Set(
          dataset.timesCompeticao.filter((tc) => tc.competicao_id === comp.id).map((tc) => tc.time_id),
        );
        const clubs = dataset.times.filter((t) => ids.has(t.id));
        const avgElo =
          clubs.length > 0 ? Math.round(clubs.reduce((s, c) => s + c.elo_rating, 0) / clubs.length) : 1500;
        const topClub = [...clubs].sort((a, b) => b.elo_rating - a.elo_rating)[0];
        return { comp, avgElo, count: clubs.length, topClub };
      })
      .sort((a, b) => b.avgElo - a.avgElo);
  }, [dataset.competicoes, dataset.timesCompeticao, dataset.times]);

  // Momentum in selected competition
  const { hotClubs, coldClubs } = useMemo(() => {
    const compSet = new Set(compTeamIds);
    const clubs = dataset.times.filter((t) => compSet.has(t.id));
    const scored = clubs.map((t) => {
      const form = t.forma_recente ?? [];
      const wins = form.filter((f) => f === 'V').length;
      const losses = form.filter((f) => f === 'D').length;
      const score = (t.moral_elenco ?? 75) + wins * 5 - losses * 5;
      return { team: t, score, wins, losses };
    });
    const hot = [...scored].sort((a, b) => b.score - a.score).slice(0, 6);
    const cold = [...scored].sort((a, b) => a.score - b.score).slice(0, 6);
    return { hotClubs: hot, coldClubs: cold };
  }, [dataset.times, compTeamIds]);

  // Hall of Fame: Top clubs by trophies + Top players by OVR & season contributions
  const hallClubs = useMemo(() => {
    return [...dataset.times]
      .map((t) => {
        const totalTitles = (t.titulos_historicos ?? []).reduce((s, th) => s + th.quantidade, 0);
        return { team: t, totalTitles };
      })
      .filter((x) => x.totalTitles > 0)
      .sort((a, b) => b.totalTitles - a.totalTitles || b.team.elo_rating - a.team.elo_rating)
      .slice(0, 15);
  }, [dataset.times]);

  const hallPlayers = useMemo(() => {
    const goalsMap = new Map<string, { g: number; a: number }>();
    for (const row of dataset.artilharia) {
      const prev = goalsMap.get(row.jogador_id) ?? { g: 0, a: 0 };
      goalsMap.set(row.jogador_id, { g: prev.g + row.gols, a: prev.a + row.assistencias });
    }
    return [...dataset.jogadores]
      .map((j) => {
        const ga = goalsMap.get(j.id) ?? { g: 0, a: 0 };
        const goatScore = j.overall * 10 + ga.g * 3 + ga.a * 2;
        return { player: j, goals: ga.g, assists: ga.a, goatScore };
      })
      .sort((a, b) => b.goatScore - a.goatScore)
      .slice(0, 15);
  }, [dataset.jogadores, dataset.artilharia]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSubView('global')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            subView === 'global'
              ? 'bg-emerald-500 text-slate-950'
              : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> Power Ranking Global & Ligas
        </button>
        <button
          onClick={() => setSubView('momentum')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            subView === 'momentum'
              ? 'bg-emerald-500 text-slate-950'
              : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Flame className="h-3.5 w-3.5" /> Momentum & Fase Atual
        </button>
        <button
          onClick={() => setSubView('hall')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            subView === 'hall'
              ? 'bg-emerald-500 text-slate-950'
              : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Crown className="h-3.5 w-3.5" /> Hall da Fama (GOATs)
        </button>
      </div>

      {subView === 'global' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Top 30 Clubes do Mundo (Elo Rating)
            </h3>
            <div className="divide-y divide-slate-800/70">
              {globalTopClubs.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTeam(t.id)}
                  className="flex cursor-pointer items-center justify-between py-2.5 text-xs hover:bg-slate-800/40 px-2 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-mono font-bold text-slate-400">#{i + 1}</span>
                    <ClubBadge team={t} size="sm" />
                    <div>
                      <div className="font-bold text-white">{t.nome}</div>
                      <div className="text-[11px] text-slate-400">
                        {paisMap.get(t.pais_id)?.nome ?? t.pais_id} • Moral {t.moral_elenco}%
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono font-bold text-emerald-400">
                    {t.elo_rating}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Força das 1ªs Divisões
            </h3>
            <div className="space-y-2.5">
              {leagueRankings.map((l, i) => (
                <div
                  key={l.comp.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {i + 1}. {l.comp.nome}
                    </span>
                    <span className="font-mono font-bold text-sky-400">{l.avgElo}</span>
                  </div>
                  {l.topClub && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      Líder técnico: {l.topClub.nome} ({l.topClub.elo_rating})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subView === 'momentum' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Flame className="h-4 w-4" /> Pegando Fogo (Melhor Momento)
            </h3>
            <div className="space-y-2">
              {hotClubs.map(({ team }) => (
                <div
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs hover:border-emerald-500/50"
                >
                  <div className="flex items-center gap-2.5">
                    <ClubBadge team={team} size="sm" />
                    <div>
                      <div className="font-bold text-white">{team.nome}</div>
                      <div className="text-[11px] text-slate-400">Moral {team.moral_elenco}%</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(team.forma_recente ?? []).map((f, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                          f === 'V'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : f === 'E'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-slate-900/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <Snowflake className="h-4 w-4" /> Em Crise / Pressão
            </h3>
            <div className="space-y-2">
              {coldClubs.map(({ team }) => (
                <div
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs hover:border-sky-500/50"
                >
                  <div className="flex items-center gap-2.5">
                    <ClubBadge team={team} size="sm" />
                    <div>
                      <div className="font-bold text-white">{team.nome}</div>
                      <div className="text-[11px] text-slate-400">Moral {team.moral_elenco}%</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(team.forma_recente ?? []).map((f, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                          f === 'V'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : f === 'E'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subView === 'hall' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-amber-500/30 bg-slate-900/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Trophy className="h-4 w-4" /> Maiores Clubes (Títulos Históricos)
            </h3>
            <div className="divide-y divide-slate-800/70">
              {hallClubs.map(({ team, totalTitles }, i) => (
                <div
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  className="flex cursor-pointer items-center justify-between py-2.5 text-xs hover:bg-slate-800/40 px-2 rounded"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 font-mono font-bold text-amber-400">#{i + 1}</span>
                    <ClubBadge team={team} size="sm" />
                    <span className="font-bold text-white">{team.nome}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">🏆 {totalTitles}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-slate-900/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Award className="h-4 w-4" /> Maiores Jogadores (OVR + Gols/Assist.)
            </h3>
            <div className="divide-y divide-slate-800/70">
              {hallPlayers.map(({ player, goals, assists }, i) => {
                const club = timesMap.get(player.time_id);
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer(player)}
                    className="flex cursor-pointer items-center justify-between py-2.5 text-xs hover:bg-slate-800/40 px-2 rounded"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 font-mono font-bold text-emerald-400">#{i + 1}</span>
                      {club && <ClubBadge team={club} size="xs" />}
                      <div>
                        <div className="font-bold text-white">{player.nome}</div>
                        <div className="text-[11px] text-slate-400">
                          {club?.sigla} • {player.posicao} • {goals}G / {assists}A
                        </div>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono font-bold text-emerald-300">
                      OVR {player.overall}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
