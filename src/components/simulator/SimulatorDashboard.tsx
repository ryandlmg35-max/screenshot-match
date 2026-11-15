import { Link } from '@tanstack/react-router';
import {
  ArrowRightLeft,
  Award,
  Briefcase,
  Calendar,
  CalendarCheck2,
  Crown,
  Database,
  FastForward,
  GitBranch,
  Globe,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useSimulator } from '@/lib/simulator-store';
import type { Jogador, Partida } from '@/types/simulator';
import { AdminPanel } from './AdminPanel';
import { ChampionCelebrationModal } from './ChampionCelebrationModal';
import { ClubBadge } from './ClubBadge';
import { HeadToHeadModal } from './HeadToHeadModal';
import { KnockoutBracket } from './KnockoutBracket';
import { ManagerCareerTab } from './ManagerCareerTab';
import { MatchDetailModal } from './MatchDetailModal';
import { PlayerDetailModal } from './PlayerDetailModal';
import { PowerRankingsTab } from './PowerRankingsTab';
import { PressConferenceModal } from './PressConferenceModal';
import { SeasonHighlights } from './SeasonHighlights';
import { StandingsTable } from './StandingsTable';
import { TeamDetailModal } from './TeamDetailModal';
import { TopScorersTable } from './TopScorersTable';
import { TransferMarketTab } from './TransferMarketTab';
import { WorldCupTab } from './WorldCupTab';

type TabKey =
  | 'classificacao'
  | 'jogos'
  | 'chaveamento'
  | 'artilharia'
  | 'clubes'
  | 'mercado'
  | 'rankings'
  | 'copa'
  | 'carreira'
  | 'admin';

export function SimulatorDashboard() {
  const {
    dataset,
    dataSource,
    simularPartida,
    simularRodada,
    simularTemporada,
    simularTodasPendentes,
    resetarTemporada,
    avancarTemporada,
  } = useSimulator();
  const { user } = useAuth();

  const [selectedCountryId, setSelectedCountryId] = useState<string>('bra');
  const [selectedCompId, setSelectedCompId] = useState<string>('bra-serie-a');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabKey>('classificacao');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Jogador | null>(null);
  const [showH2H, setShowH2H] = useState(false);
  const [pressMatchId, setPressMatchId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

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

  const compStatusMap = useMemo(() => {
    const map = new Map<string, 'done' | 'in_progress' | 'pending'>();
    for (const comp of dataset.competicoes) {
      const matches = dataset.partidas.filter((m) => m.competicao_id === comp.id);
      if (matches.length === 0) {
        map.set(comp.id, 'pending');
        continue;
      }
      const done = matches.filter((m) => m.finalizada).length;
      if (done === matches.length) map.set(comp.id, 'done');
      else if (done > 0) map.set(comp.id, 'in_progress');
      else map.set(comp.id, 'pending');
    }
    return map;
  }, [dataset.competicoes, dataset.partidas]);

  const countryStatusMap = useMemo(() => {
    const map = new Map<string, 'done' | 'in_progress' | 'pending'>();
    for (const pais of dataset.paises) {
      const comps = dataset.competicoes.filter((c) => c.pais_id === pais.id);
      const statuses = comps.map((c) => compStatusMap.get(c.id) ?? 'pending');
      if (statuses.length > 0 && statuses.every((s) => s === 'done')) map.set(pais.id, 'done');
      else if (statuses.some((s) => s === 'done' || s === 'in_progress')) map.set(pais.id, 'in_progress');
      else map.set(pais.id, 'pending');
    }
    return map;
  }, [dataset.paises, dataset.competicoes, compStatusMap]);

  const completedCompsCount = useMemo(
    () => Array.from(compStatusMap.values()).filter((s) => s === 'done').length,
    [compStatusMap],
  );
  const totalCompsCount = dataset.competicoes.length;
  const pendingCompsCount = totalCompsCount - completedCompsCount;

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
            {dataset.paises.map((pais) => {
              const st = countryStatusMap.get(pais.id) ?? 'pending';
              return (
                <button
                  key={pais.id}
                  type="button"
                  onClick={() => handleSelectCountry(pais.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedCountryId === pais.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{pais.nome}</span>
                  {st === 'done' && (
                    <span className="text-[10px] text-emerald-400" title="Todas competições concluídas">
                      ✓
                    </span>
                  )}
                  {st === 'in_progress' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Em andamento" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              {countryComps.map((comp) => {
                const st = compStatusMap.get(comp.id) ?? 'pending';
                return (
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
                    {st === 'done' && (
                      <span className="text-[11px] font-bold text-emerald-500" title="Concluída">
                        ✓
                      </span>
                    )}
                    {st === 'in_progress' && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" title="Em andamento" />
                    )}
                  </button>
                );
              })}
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

        {/* Season Flow Guide + One-Click World Sim */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold text-foreground">
              Temporada {dataset.anoAtual}: {completedCompsCount}/{totalCompsCount} competições concluídas
            </div>
            <p className="text-muted-foreground">
              Copas nacionais e internacionais (Copa do Brasil, Libertadores, Champions e Mundial) já estão criadas na temporada.
              Simule na ordem que quiser e clique em <strong>Avançar p/ {dataset.anoAtual + 1}</strong> quando terminar o ano.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCountryId !== 'intl' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectCountry('intl')}
                className="h-8 text-xs"
              >
                <Globe className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                Ir p/ Internacionais
              </Button>
            )}
            {pendingCompsCount > 0 && (
              <Button
                size="sm"
                onClick={simularTodasPendentes}
                className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <FastForward className="mr-1.5 h-3.5 w-3.5" />
                Simular Mundo Inteiro ({pendingCompsCount} restantes)
              </Button>
            )}
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
              onClick={() => {
                simularTemporada(selectedComp.id, selectedTemp.id);
                setShowCelebration(true);
              }}
              disabled={nextPendingRound === null}
            >
              <FastForward className="mr-1.5 h-3.5 w-3.5" />
              Simular Temporada Inteira
            </Button>

            {nextPendingRound === null && finishedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCelebration(true)}
                className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              >
                <Trophy className="mr-1.5 h-3.5 w-3.5" />
                Ver Campeão
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowH2H(true)}
            >
              <Swords className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
              Comparar (H2H)
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

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                avancarTemporada();
                setSelectedRound(1);
              }}
              title="Executa acesso/rebaixamento, vagas continentais, evolução/aposentadoria e janela de transferências"
            >
              <CalendarCheck2 className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Avançar p/ {dataset.anoAtual + 1}
            </Button>
          </div>
        </section>

        {/* Season Highlights */}
        {activeTab !== 'mercado' && activeTab !== 'admin' && (
          <SeasonHighlights
            standings={compStandings}
            partidas={compMatches}
            artilharia={compScorers}
            timesMap={timesMap}
            jogadoresMap={jogadoresMap}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

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
            variant={activeTab === 'mercado' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('mercado')}
          >
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
            Mercado
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'rankings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('rankings')}
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Rankings & GOATs
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'carreira' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('carreira')}
          >
            <Briefcase className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Carreira
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'copa' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('copa')}
          >
            <Globe className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            Copa Seleções
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

        {activeTab === 'mercado' && (
          <TransferMarketTab onSelectPlayer={(p) => setSelectedPlayer(p)} />
        )}

        {activeTab === 'rankings' && (
          <PowerRankingsTab
            compTeamIds={compTeams.map((t) => t.id)}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'carreira' && (
          <ManagerCareerTab
            selectedCompId={selectedComp.id}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onOpenPressConference={(teamId) => {
              const targetMatch =
                dataset.partidas.find(
                  (p) => (p.time_casa_id === teamId || p.time_fora_id === teamId) && p.finalizada,
                ) ??
                dataset.partidas.find(
                  (p) => p.time_casa_id === teamId || p.time_fora_id === teamId,
                );
              if (targetMatch) setPressMatchId(targetMatch.id);
            }}
          />
        )}

        {activeTab === 'copa' && <WorldCupTab onSelectPlayer={(p) => setSelectedPlayer(p)} />}

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
          onOpenPressConference={() => {
            const id = selectedMatch.id;
            setSelectedMatchId(null);
            setPressMatchId(id);
          }}
        />
      )}

      {/* Press Conference Modal */}
      {pressMatchId && (() => {
        const pm = dataset.partidas.find((p) => p.id === pressMatchId);
        if (!pm) return null;
        const h = timesMap.get(pm.time_casa_id);
        const a = timesMap.get(pm.time_fora_id);
        if (!h || !a) return null;
        const cName = dataset.competicoes.find((c) => c.id === pm.competicao_id)?.nome ?? pm.competicao_id;
        return (
          <PressConferenceModal
            match={pm}
            homeTeam={h}
            awayTeam={a}
            homeCoach={tecnicosMap.get(h.id)}
            awayCoach={tecnicosMap.get(a.id)}
            compName={cName}
            onClose={() => setPressMatchId(null)}
          />
        );
      })()}

      {/* Head-to-Head Modal */}
      {showH2H && (
        <HeadToHeadModal
          times={dataset.times}
          jogadores={dataset.jogadores}
          partidas={dataset.partidas}
          competicoes={dataset.competicoes}
          onClose={() => setShowH2H(false)}
        />
      )}

      {/* Champion Celebration Modal */}
      {showCelebration && (() => {
        // Determina campeão: vencedor da Final (se copa/grupos) ou 1º colocado (pontos corridos)
        const finalMatch = compMatches.find((m) => m.fase === 'Final' && m.finalizada);
        let champTeam = leader ?? undefined;
        let runnerTeam: typeof champTeam = undefined;
        if (finalMatch) {
          const gc = finalMatch.gols_casa ?? 0;
          const gf = finalMatch.gols_fora ?? 0;
          const winId =
            finalMatch.sumula?.vencedor_penaltis_id ??
            (gc >= gf ? finalMatch.time_casa_id : finalMatch.time_fora_id);
          const loseId =
            winId === finalMatch.time_casa_id ? finalMatch.time_fora_id : finalMatch.time_casa_id;
          champTeam = timesMap.get(winId);
          runnerTeam = timesMap.get(loseId);
        } else if (compStandings.length >= 2) {
          const sorted = [...compStandings].sort(
            (a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo,
          );
          champTeam = timesMap.get(sorted[0]!.time_id);
          runnerTeam = timesMap.get(sorted[1]!.time_id);
        }
        if (!champTeam) return null;
        const topRow = [...compScorers].sort((a, b) => b.gols - a.gols)[0];
        const topP = topRow ? jogadoresMap.get(topRow.jogador_id) : undefined;
        return (
          <ChampionCelebrationModal
            competition={selectedComp}
            seasonLabel={seasonLabel}
            champion={champTeam}
            runnerUp={runnerTeam}
            topScorer={topP && topRow ? { player: topP, goals: topRow.gols } : undefined}
            onClose={() => setShowCelebration(false)}
          />
        );
      })()}

      {/* Team Detail Modal */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          tecnico={tecnicosMap.get(selectedTeam.id)}
          jogadores={dataset.jogadores.filter((j) => j.time_id === selectedTeam.id)}
          partidas={dataset.partidas}
          timesMap={timesMap}
          onSelectPlayer={(p) => setSelectedPlayer(p)}
          onClose={() => setSelectedTeamId(null)}
        />
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          team={timesMap.get(selectedPlayer.time_id)}
          artilharia={dataset.artilharia}
          anoAtual={dataset.anoAtual}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
