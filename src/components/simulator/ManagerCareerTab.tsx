import { useMemo, useState } from 'react';
import {
  Briefcase,
  Target,
  Play,
  Mic,
  Swords,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSimulator } from '@/lib/simulator-store';
import { ClubBadge } from './ClubBadge';
import type { EstiloTatico, Jogador, Partida } from '@/types/simulator';

interface ManagerCareerTabProps {
  selectedCompId: string;
  onSelectPlayer: (player: Jogador) => void;
  onSelectTeam: (teamId: string) => void;
  onOpenPressConference: (teamId: string) => void;
}

const TACTIC_OPTIONS: Array<{ value: EstiloTatico; label: string; desc: string }> = [
  { value: 'posse', label: 'Posse de Bola', desc: 'Controle de meio-campo e passes curtos' },
  { value: 'contra-ataque', label: 'Contra-Ataque', desc: 'Bloco sólido e transição rápida' },
  { value: 'pressao-alta', label: 'Pressão Alta', desc: 'Marcação adiantada e ritmo intenso' },
  { value: 'retranca', label: 'Retranca', desc: 'Compactação defensiva máxima' },
];

export function ManagerCareerTab({
  selectedCompId,
  onSelectPlayer,
  onSelectTeam,
  onOpenPressConference,
}: ManagerCareerTabProps) {
  const { dataset, simularPartida, atualizarTime } = useSimulator();
  const [managedTeamId, setManagedTeamId] = useState<string>(() => {
    const firstCompTeam = dataset.timesCompeticao.find((tc) => tc.competicao_id === selectedCompId);
    return firstCompTeam?.time_id ?? dataset.times[0]?.id ?? '';
  });

  const sortedTeams = useMemo(
    () => [...dataset.times].sort((a, b) => b.elo_rating - a.elo_rating),
    [dataset.times]
  );

  const managedTeam = useMemo(
    () => dataset.times.find((t) => t.id === managedTeamId) ?? sortedTeams[0],
    [dataset.times, managedTeamId, sortedTeams]
  );

  const teamById = useMemo(() => {
    const m = new Map<string, (typeof dataset.times)[number]>();
    for (const t of dataset.times) m.set(t.id, t);
    return m;
  }, [dataset.times]);

  const squad = useMemo(() => {
    if (!managedTeam) return [];
    return dataset.jogadores
      .filter((j) => j.time_id === managedTeam.id)
      .sort((a, b) => b.overall - a.overall);
  }, [dataset.jogadores, managedTeam]);

  const myMatches = useMemo(() => {
    if (!managedTeam) return [];
    return dataset.partidas
      .filter((p) => p.time_casa_id === managedTeam.id || p.time_fora_id === managedTeam.id)
      .sort((a, b) => a.rodada - b.rodada);
  }, [dataset.partidas, managedTeam]);

  const playedMatches = useMemo(() => myMatches.filter((m) => m.finalizada), [myMatches]);
  const nextMatch: Partida | undefined = useMemo(
    () => myMatches.find((m) => !m.finalizada),
    [myMatches]
  );

  const record = useMemo(() => {
    if (!managedTeam) return { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    let w = 0;
    let d = 0;
    let l = 0;
    let gf = 0;
    let ga = 0;
    for (const m of playedMatches) {
      const isHome = m.time_casa_id === managedTeam.id;
      const myGoals = (isHome ? m.gols_casa : m.gols_fora) ?? 0;
      const oppGoals = (isHome ? m.gols_fora : m.gols_casa) ?? 0;
      gf += myGoals;
      ga += oppGoals;
      if (myGoals > oppGoals) w++;
      else if (myGoals === oppGoals) d++;
      else l++;
    }
    return { w, d, l, gf, ga };
  }, [playedMatches, managedTeam]);

  const boardExpectation = useMemo(() => {
    if (!managedTeam) return 'Consolidar elenco';
    if (managedTeam.elo_rating >= 1820) return 'Título / Top 2 na liga';
    if (managedTeam.elo_rating >= 1700) return 'Vaga Continental (Top 4)';
    if (managedTeam.elo_rating >= 1580) return 'Meio de Tabela Seguro';
    return 'Permanência na Divisão';
  }, [managedTeam]);

  const upcomingClassicOpponents = useMemo(() => {
    if (!managedTeam) return [];
    const seen = new Set<string>();
    const list: Array<(typeof dataset.times)[number]> = [];
    for (const m of myMatches) {
      if (!m.classico) continue;
      const oppId = m.time_casa_id === managedTeam.id ? m.time_fora_id : m.time_casa_id;
      if (seen.has(oppId)) continue;
      seen.add(oppId);
      const opp = teamById.get(oppId);
      if (opp) list.push(opp);
    }
    return list;
  }, [managedTeam, myMatches, teamById]);

  if (!managedTeam) {
    return null;
  }

  const nextHome = nextMatch ? teamById.get(nextMatch.time_casa_id) : undefined;
  const nextAway = nextMatch ? teamById.get(nextMatch.time_fora_id) : undefined;
  const nextComp = nextMatch
    ? dataset.competicoes.find((c) => c.id === nextMatch.competicao_id)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Club selector + Manager Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <ClubBadge team={managedTeam} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                  Modo Carreira — Meu Clube
                </span>
              </div>
              <h2 className="text-lg font-bold">{managedTeam.nome}</h2>
              <p className="text-xs text-muted-foreground">
                Elo {managedTeam.elo_rating} • Moral {managedTeam.moral_elenco ?? 70} • Orçamento{' '}
                {((managedTeam.orcamento ?? 15_000_000) / 1_000_000).toFixed(1)}M
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Selecionar clube para comandar"
              value={managedTeam.id}
              onChange={(e) => setManagedTeamId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-xs font-medium"
            >
              {sortedTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} (Elo {t.elo_rating})
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => onSelectTeam(managedTeam.id)}>
              Ver Página do Clube
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenPressConference(managedTeam.id)}
              className="gap-1.5"
            >
              <Mic className="h-3.5 w-3.5" />
              Coletiva
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs + Next Match */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Meta da Diretoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-sm font-semibold">{boardExpectation}</p>
            <div className="flex items-center justify-between text-muted-foreground pt-1 border-t">
              <span>Histórico na Temporada</span>
              <span className="font-bold text-foreground">
                {record.w}V - {record.d}E - {record.l}D ({record.gf}:{record.ga})
              </span>
            </div>
            {upcomingClassicOpponents.length > 0 && (
              <div className="pt-1 border-t">
                <span className="text-muted-foreground flex items-center gap-1 mb-1">
                  <Swords className="h-3 w-3 text-rose-500" /> Clássicos:
                </span>
                <div className="flex flex-wrap gap-1">
                  {upcomingClassicOpponents.map((r) => (
                    <Badge key={r.id} variant="outline" className="text-[10px]">
                      {r.sigla}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Próximo Compromisso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextMatch && nextHome && nextAway ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {nextComp?.nome ?? nextMatch.competicao_id} • Rodada {nextMatch.rodada}
                  </p>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <div className="flex items-center gap-1.5">
                      <ClubBadge team={nextHome} size="xs" />
                      <span>{nextHome.nome}</span>
                    </div>
                    <span className="text-muted-foreground">x</span>
                    <div className="flex items-center gap-1.5">
                      <ClubBadge team={nextAway} size="xs" />
                      <span>{nextAway.nome}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => simularPartida(nextMatch.id)}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  Simular Meu Próximo Jogo
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Todas as partidas do seu clube na temporada atual já foram disputadas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tactical Style Switcher */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            Plano Tático do Treinador
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {TACTIC_OPTIONS.map((opt) => {
            const active = (managedTeam.estilo_tatico ?? 'posse') === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => atualizarTime({ id: managedTeam.id, estilo_tatico: opt.value })}
                className={`rounded-md border p-3 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{opt.label}</span>
                  {active && <Badge className="text-[10px]">Ativo</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Top Squad Players */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            Elenco Principal ({squad.length} jogadores)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {squad.slice(0, 18).map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onSelectPlayer(player)}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {player.posicao}
                    </Badge>
                    <span className="font-medium truncate">{player.nome}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {player.idade}a • Forma {player.forma_fisica ?? 80} • Moral {player.moral ?? 75}
                  </p>
                </div>
                <span className="font-bold text-sm ml-2">{player.overall}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
