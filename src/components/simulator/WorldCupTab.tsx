import { useMemo, useState } from 'react';
import { Globe, Play, FastForward, RotateCcw, Trophy, Users, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSimulator } from '@/lib/simulator-store';
import {
  buildWorldCupTournament,
  simulateWorldCupStep,
  type WorldCupState,
} from '@/lib/world-cup';
import { fireConfetti } from '@/lib/confetti';
import type { Jogador } from '@/types/simulator';

interface WorldCupTabProps {
  onSelectPlayer: (player: Jogador) => void;
}

export function WorldCupTab({ onSelectPlayer }: WorldCupTabProps) {
  const { dataset } = useSimulator();
  const [wcState, setWcState] = useState<WorldCupState | null>(null);
  const [selectedNationId, setSelectedNationId] = useState<string | null>(null);

  const teamById = useMemo(() => {
    const map = new Map<string, (typeof wcState extends null ? never : NonNullable<typeof wcState>['teams'][number])>();
    if (!wcState) return map;
    for (const t of wcState.teams) map.set(t.id, t);
    return map;
  }, [wcState]);

  const handleStart = () => {
    const next = buildWorldCupTournament(dataset.jogadores);
    setWcState(next);
    setSelectedNationId(next.teams[0]?.id ?? null);
  };

  const handleSimulateStep = () => {
    if (!wcState || wcState.championId) return;
    const next = simulateWorldCupStep(wcState);
    setWcState(next);
    if (next.championId && !wcState.championId) {
      fireConfetti();
    }
  };

  const handleSimulateAll = () => {
    if (!wcState || wcState.championId) return;
    let cur = wcState;
    for (let i = 0; i < 8 && !cur.championId; i++) {
      cur = simulateWorldCupStep(cur);
    }
    setWcState(cur);
    if (cur.championId) {
      fireConfetti();
    }
  };

  if (!wcState) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-amber-500/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="rounded-full bg-emerald-500/15 p-4 text-emerald-500">
            <Globe className="h-10 w-10" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold">Copa do Mundo de Seleções</h3>
            <p className="text-sm text-muted-foreground">
              Convoque automaticamente os 23 melhores jogadores de 16 seleções a partir da base ativa
              (mais de {dataset.jogadores.length.toLocaleString('pt-BR')} atletas) e dispute a fase de grupos
              e o mata-mata até a taça.
            </p>
          </div>
          <Button size="lg" onClick={handleStart} className="gap-2">
            <Play className="h-4 w-4" />
            Convocar Seleções & Gerar Copa
          </Button>
        </CardContent>
      </Card>
    );
  }

  const champion = wcState.championId ? teamById.get(wcState.championId) : undefined;
  const activeNation = selectedNationId ? teamById.get(selectedNationId) : wcState.teams[0];
  const activeCallup = activeNation ? (wcState.callups[activeNation.id] ?? []) : [];

  const knockoutMatches = wcState.partidas.filter((p) => !p.fase.startsWith('Grupo'));
  const qfMatches = knockoutMatches.filter((p) => p.fase === 'Quartas de Final');
  const sfMatches = knockoutMatches.filter((p) => p.fase === 'Semifinal');
  const finalMatch = knockoutMatches.find((p) => p.fase === 'Final');

  const groupKeys = Object.keys(wcState.groups).sort();
  const finishedCount = wcState.partidas.filter((p) => p.finalizada).length;

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold">Copa do Mundo de Seleções (16 Seleções)</h2>
              <p className="text-xs text-muted-foreground">
                {finishedCount} de {wcState.partidas.length} jogos disputados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!wcState.championId && (
              <>
                <Button size="sm" onClick={handleSimulateStep} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Simular Próxima Fase
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSimulateAll} className="gap-1.5">
                  <FastForward className="h-3.5 w-3.5" />
                  Simular Copa Completa
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={handleStart} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Nova Copa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Champion Banner */}
      {champion && (
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              <Trophy className="h-9 w-9 text-amber-500" />
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-500 font-semibold">
                  Campeão Mundial
                </p>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>{champion.flag}</span>
                  <span>{champion.nome}</span>
                </h3>
              </div>
            </div>
            <Badge className="bg-amber-500 text-black font-bold">
              Elo {champion.elo_rating}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupKeys.map((gKey) => {
          const ids = wcState.groups[gKey] ?? [];
          const rows = wcState.standings
            .filter((s) => ids.includes(s.time_id))
            .sort((a, b) => b.pontos - a.pontos || b.saldo - a.saldo || b.gols_pro - a.gols_pro);

          return (
            <Card key={gKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>{gKey}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Top 2 avançam</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 px-3 text-left">#</th>
                        <th className="py-2 px-2 text-left">Seleção</th>
                        <th className="py-2 px-1.5 text-center">J</th>
                        <th className="py-2 px-1.5 text-center">V</th>
                        <th className="py-2 px-1.5 text-center">SG</th>
                        <th className="py-2 px-3 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const team = teamById.get(row.time_id);
                        const qualifies = idx < 2;
                        return (
                          <tr
                            key={row.time_id}
                            onClick={() => setSelectedNationId(row.time_id)}
                            className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                              qualifies ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-medium">
                              <span className={qualifies ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-medium">
                              <span className="mr-1.5">{team?.flag}</span>
                              {team?.nome ?? row.time_id}
                            </td>
                            <td className="py-2 px-1.5 text-center">{row.vitorias + row.empates + row.derrotas}</td>
                            <td className="py-2 px-1.5 text-center">{row.vitorias}</td>
                            <td className="py-2 px-1.5 text-center">{row.saldo}</td>
                            <td className="py-2 px-3 text-right font-bold">{row.pontos}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Knockout */}
      {knockoutMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Mata-Mata
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Quartas de Final', list: qfMatches },
              { label: 'Semifinais', list: sfMatches },
              { label: 'Final', list: finalMatch ? [finalMatch] : [] },
            ].map((stage) => (
              <div key={stage.label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.label}
                </p>
                {stage.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aguardando fase anterior</p>
                ) : (
                  stage.list.map((m) => {
                    const home = teamById.get(m.time_casa_id);
                    const away = teamById.get(m.time_fora_id);
                    const penWinnerId = m.sumula?.vencedor_penaltis_id;
                    const penWinner = penWinnerId ? teamById.get(penWinnerId) : undefined;
                    return (
                      <div key={m.id} className="rounded-md border p-2.5 text-xs space-y-1 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {home?.flag} {home?.sigla ?? m.time_casa_id}
                          </span>
                          <span className="font-bold">
                            {m.finalizada ? (m.gols_casa ?? 0) : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {away?.flag} {away?.sigla ?? m.time_fora_id}
                          </span>
                          <span className="font-bold">
                            {m.finalizada ? (m.gols_fora ?? 0) : '-'}
                          </span>
                        </div>
                        {m.finalizada && penWinner && (
                          <p className="text-[11px] text-amber-500 font-medium text-right">
                            Pênaltis: vence {penWinner.sigla}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 23-Man Callup Viewer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Convocação ({activeNation ? `${activeNation.flag} ${activeNation.nome}` : 'Selecione'})
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              {wcState.teams.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={activeNation?.id === t.id ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedNationId(t.id)}
                >
                  {t.flag} {t.sigla}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeCallup.map((player) => (
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
                    {player.idade} anos • {player.nacionalidade}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="font-bold text-sm">{player.overall}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
