import { Link } from '@tanstack/react-router';
import {
  Award,
  Calendar,
  Database,
  FastForward,
  GitBranch,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useSimulator } from '@/lib/simulator-store';
import type { Partida } from '@/types/simulator';
import { AdminPanel } from './AdminPanel';
import { ClubBadge } from './ClubBadge';
import { KnockoutBracket } from './KnockoutBracket';
import { MatchDetailModal } from './MatchDetailModal';
import { StandingsTable } from './StandingsTable';
import { TeamDetailModal } from './TeamDetailModal';
import { TopScorersTable } from './TopScorersTable';

type TabKey = 'classificacao' | 'jogos' | 'chaveamento' | 'artilharia' | 'clubes' | 'admin';

export function SimulatorDashboard() {
  const {
    dataset,
    dataSource,
    simularPartida,
    simularRodada,
    simularTemporada,
    resetarTemporada,
  } = useSimulator();
  const { user } = useAuth();

  const [selectedCountryId, setSelectedCountryId] = useState<string>('bra');
  const [selectedCompId, setSelectedCompId] = useState<string>('bra-serie-a');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabKey>('classificacao');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const timesMap = useMemo(() => new Map(dataset.times.map((t) => [t.id, t])), [dataset.times]);
  const jogadoresMap = useMemo(
    () => new Map(dataset.jogadores.map((j) => [j.id, j])),
    [dataset.jogadores],
  );
  const tecnicosMap = useMemo(
    () => new Map(dataset.tecnicos.map((tec) => [tec.time_id, tec])),
    [dataset.tecnicos],
  );

  const countryComps = useMemo(
    () => dataset.competicoes.filter((c) => c.pais_id === selectedCountryId),
    [dataset.competicoes, selectedCountryId],
  );

  const selectedComp = useMemo(
    () => dataset.competicoes.find((c) => c.id === selectedCompId) ?? dataset.competicoes[0]!,
    [dataset.competicoes, selectedCompId],
  );

  const selectedTemp = useMemo(
    () => dataset.temporadas.find((t) => t.competicao_id === selectedComp.id)!,
    [dataset.temporadas, selectedComp.id],
  );

  const compMatches = useMemo(
    () =>
      dataset.partidas.filter(
        (m) => m.competicao_id === selectedComp.id && m.temporada_id === selectedTemp.id,
      ),
    [dataset.partidas, selectedComp.id, selectedTemp.id],
  );

  const availableRounds = useMemo(
    () => Array.from(new Set(compMatches.map((m) => m.rodada))).sort((a, b) => a - b),
    [compMatches],
  );

  const nextPendingRound = useMemo(() => {
    const pending = compMatches.filter((m) => !m.finalizada).sort((a, b) => a.rodada - b.rodada);
    return pending[0]?.rodada ?? null;
  }, [compMatches]);

  const effectiveRound = availableRounds.includes(selectedRound)
    ? selectedRound
    : (availableRounds[0] ?? 1);

  const roundMatches = useMemo(
    () => compMatches.filter((m) => m.rodada === effectiveRound),
    [compMatches, effectiveRound],
  );

  const compStandings = useMemo(
    () =>
      dataset.classificacao.filter(
        (c) => c.competicao_id === selectedComp.id && c.temporada_id === selectedTemp.id,
      ),
    [dataset.classificacao, selectedComp.id, selectedTemp.id],
  );

  const compScorers = useMemo(
    () =>
      dataset.artilharia.filter(
        (a) => a.competicao_id === selectedComp.id && a.temporada_id === selectedTemp.id,
      ),
    [dataset.artilharia, selectedComp.id, selectedTemp.id],
  );

  const compTeams = useMemo(() => {
    const ids = new Set(
      dataset.timesCompeticao
        .filter((tc) => tc.competicao_id === selectedComp.id && tc.temporada_id === selectedTemp.id)
        .map((tc) => tc.time_id),
    );
    return dataset.times.filter((t) => ids.has(t.id));
  }, [dataset.timesCompeticao, dataset.times, selectedComp.id, selectedTemp.id]);

  const selectedMatch: Partida | null = selectedMatchId
    ? (dataset.partidas.find((p) => p.id === selectedMatchId) ?? null)
    : null;

  const selectedTeam = selectedTeamId ? (timesMap.get(selectedTeamId) ?? null) : null;

  const handleSelectCountry = (paisId: string) => {
    setSelectedCountryId(paisId);
    const firstComp = dataset.competicoes.find((c) => c.pais_id === paisId);
    if (firstComp) {
      handleSelectComp(firstComp.id);
    }
  };

  const handleSelectComp = (compId: string) => {
    setSelectedCompId(compId);
    setSelectedRound(1);
    const comp = dataset.competicoes.find((c) => c.id === compId);
    if (comp?.formato === 'mata-mata' && activeTab === 'classificacao') {
      setActiveTab('chaveamento');
    } else if (comp?.formato !== 'mata-mata' && activeTab === 'chaveamento' && comp?.formato === 'pontos-corridos') {
      setActiveTab('classificacao');
    }
  };

  const handleSimulateNextRound = () => {
    if (nextPendingRound === null) return;
    simularRodada(selectedComp.id, selectedTemp.id, nextPendingRound);
    setSelectedRound(nextPendingRound);
  };

  const finishedCount = compMatches.filter((m) => m.finalizada).length;
  const seasonLabel =
    selectedTemp.ano_inicio === selectedTemp.ano_fim
      ? `${selectedTemp.ano_inicio}`
      : `${selectedTemp.ano_inicio}/${String(selectedTemp.ano_fim).slice(-2)}`;

  const leader = compStandings[0] ? timesMap.get(compStandings[0].time_id) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight sm:text-lg">
                Futebol Manager Simulator
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {dataset.times.length} clubes • {dataset.jogadores.length.toLocaleString('pt-BR')} jogadores •{' '}
                {dataset.competicoes.length} competições
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                dataSource === 'supabase'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              }`}
            >
              <Database className="h-3 w-3" />
              {dataSource === 'supabase' ? 'Supabase Cloud' : 'Seed Local (Memória)'}
            </span>

            <Button
              variant={activeTab === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'admin' ? 'classificacao' : 'admin')}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Admin
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link to="/login">{user ? user.email?.split('@')[0] : 'Login'}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        {/* Country & Competition Selector */}
        <section className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {dataset.paises.map((pais) => (
              <button
                key={pais.id}
                type="button"
                onClick={() => handleSelectCountry(pais.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedCountryId === pais.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {pais.nome}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              {countryComps.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleSelectComp(comp.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedComp.id === comp.id
                      ? 'border-emerald-600 bg-emerald-600/10 font-bold text-emerald-700 dark:text-emerald-300'
                      : 'bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  <span>{comp.nome}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                    {comp.formato}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Temporada <strong className="text-foreground">{seasonLabel}</strong>
              </span>
              <span>•</span>
              <span className="font-mono">
                {finishedCount}/{compMatches.length} jogos
              </span>
            </div>
          </div>
        </section>

        {/* Simulation Control Bar */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-sm font-bold">{selectedComp.nome}</div>
              <div className="text-xs text-muted-foreground">
                {nextPendingRound !== null
                  ? `Próxima rodada pendente: Rodada ${nextPendingRound}`
                  : leader
                    ? `Temporada concluída • Líder: ${leader.nome}`
                    : 'Temporada concluída'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleSimulateNextRound}
              disabled={nextPendingRound === null}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Simular Rodada {nextPendingRound ?? ''}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => simularTemporada(selectedComp.id, selectedTemp.id)}
              disabled={nextPendingRound === null}
            >
              <FastForward className="mr-1.5 h-3.5 w-3.5" />
              Simular Temporada Inteira
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetarTemporada(selectedComp.id, selectedTemp.id);
                setSelectedRound(1);
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reiniciar
            </Button>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b pb-2">
          {selectedComp.formato !== 'mata-mata' && (
            <Button
              size="sm"
              variant={activeTab === 'classificacao' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('classificacao')}
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Classificação
            </Button>
          )}
          <Button
            size="sm"
            variant={activeTab === 'jogos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('jogos')}
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Jogos & Súmulas
          </Button>
          {selectedComp.formato !== 'pontos-corridos' && (
            <Button
              size="sm"
              variant={activeTab === 'chaveamento' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('chaveamento')}
            >
              <GitBranch className="mr-1.5 h-3.5 w-3.5" />
              Chaveamento
            </Button>
          )}
          <Button
            size="sm"
            variant={activeTab === 'artilharia' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('artilharia')}
          >
            <Award className="mr-1.5 h-3.5 w-3.5" />
            Artilharia & Assist.
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'clubes' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('clubes')}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Clubes & Elencos ({compTeams.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'admin' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('admin')}
          >
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Painel Admin
          </Button>
        </div>

        {/* Active View */}
        {activeTab === 'classificacao' && selectedComp.formato !== 'mata-mata' && (
          <StandingsTable
            competicao={selectedComp}
            standings={compStandings}
            timesMap={timesMap}
            onSelectTeam={(id) => setSelectedTeamId(id)}
          />
        )}

        {activeTab === 'jogos' && (
          <div className="space-y-4">
            {/* Round selector */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {availableRounds.map((r) => {
                  const rMatches = compMatches.filter((m) => m.rodada === r);
                  const allDone = rMatches.every((m) => m.finalizada);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRound(r)}
                      className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                        effectiveRound === r
                          ? 'bg-primary text-primary-foreground'
                          : allDone
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      R{r}
                    </button>
                  );
                })}
              </div>

              {roundMatches.some((m) => !m.finalizada) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simularRodada(selectedComp.id, selectedTemp.id, effectiveRound)}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Simular Rodada {effectiveRound}
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {roundMatches.map((m) => {
                const home = timesMap.get(m.time_casa_id);
                const away = timesMap.get(m.time_fora_id);
                if (!home || !away) return null;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                      <span className="truncate text-xs font-semibold sm:text-sm">{home.nome}</span>
                      <ClubBadge team={home} size="sm" />
                    </div>

                    <div className="mx-3 flex min-w-[76px] flex-col items-center">
                      {m.finalizada ? (
                        <>
                          <span className="rounded bg-muted px-2.5 py-1 font-mono text-sm font-black">
                            {m.gols_casa} - {m.gols_fora}
                          </span>
                          {m.penaltis_casa !== null && m.penaltis_fora !== null && (
                            <span className="mt-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              ({m.penaltis_casa}x{m.penaltis_fora} pên.)
                            </span>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            simularPartida(m.id);
                          }}
                        >
                          Simular
                        </Button>
                      )}
                      <span className="mt-0.5 text-[10px] text-muted-foreground">{m.fase}</span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ClubBadge team={away} size="sm" />
                      <span className="truncate text-xs font-semibold sm:text-sm">{away.nome}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'chaveamento' && (
          <KnockoutBracket
            partidas={compMatches}
            timesMap={timesMap}
            onSelectMatch={(m) => setSelectedMatchId(m.id)}
          />
        )}

        {activeTab === 'artilharia' && (
          <TopScorersTable
            artilharia={compScorers}
            jogadoresMap={jogadoresMap}
            timesMap={timesMap}
            onSelectTeam={(id) => setSelectedTeamId(id)}
          />
        )}

        {activeTab === 'clubes' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {compTeams.map((team) => {
              const coach = tecnicosMap.get(team.id);
              const squadCount = dataset.jogadores.filter((j) => j.time_id === team.id).length;
              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-3.5 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ClubBadge team={team} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{team.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {team.estadio} • {team.cidade}
                      </div>
                      {coach && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          Téc: {coach.nome}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-1 text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-bold">
                      <Shield className="h-3 w-3 text-sky-500" />
                      {team.elo_rating}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{squadCount} jog.</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          homeTeam={timesMap.get(selectedMatch.time_casa_id)!}
          awayTeam={timesMap.get(selectedMatch.time_fora_id)!}
          onClose={() => setSelectedMatchId(null)}
          onSimulate={(id) => simularPartida(id)}
          onSelectTeam={(id) => {
            setSelectedMatchId(null);
            setSelectedTeamId(id);
          }}
        />
      )}

      {/* Team Detail Modal */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          tecnico={tecnicosMap.get(selectedTeam.id)}
          jogadores={dataset.jogadores.filter((j) => j.time_id === selectedTeam.id)}
          onClose={() => setSelectedTeamId(null)}
        />
      )}
    </div>
  );
}
