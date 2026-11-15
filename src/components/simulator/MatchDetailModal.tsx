import { Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubBadge } from './ClubBadge';
import type { Partida, Time } from '@/types/simulator';

interface MatchDetailModalProps {
  match: Partida;
  homeTeam: Time;
  awayTeam: Time;
  onClose: () => void;
  onSimulate: (matchId: string) => void;
  onSelectTeam: (teamId: string) => void;
}

export function OverallBadge({ overall }: { overall: number }) {
  const color =
    overall >= 85
      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
      : overall >= 78
        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40'
        : overall >= 70
          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
          : 'bg-muted text-muted-foreground border-border';

  return (
    <span className={`inline-flex min-w-[28px] items-center justify-center rounded border px-1.5 py-0.5 font-mono text-xs font-bold ${color}`}>
      {overall}
    </span>
  );
}

export function MatchDetailModal({
  match,
  homeTeam,
  awayTeam,
  onClose,
  onSimulate,
  onSelectTeam,
}: MatchDetailModalProps) {
  const sumula = match.sumula;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-xs">
          <div className="text-xs font-medium text-muted-foreground">
            {match.fase} • Rodada {match.rodada} • {homeTeam.estadio} ({homeTeam.cidade})
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Placar */}
        <div className="border-b bg-muted/20 px-6 py-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <button
              type="button"
              onClick={() => onSelectTeam(homeTeam.id)}
              className="flex flex-col items-center gap-2 text-center hover:opacity-80"
            >
              <ClubBadge team={homeTeam} size="lg" />
              <div className="text-sm font-bold sm:text-base">{homeTeam.nome}</div>
              {sumula && (
                <div className="text-xs text-muted-foreground">
                  OVR Titular: <span className="font-mono font-semibold">{sumula.overall_casa}</span>
                </div>
              )}
            </button>

            <div className="flex flex-col items-center">
              {match.finalizada ? (
                <>
                  <div className="flex items-center gap-3 font-mono text-3xl font-black sm:text-4xl">
                    <span>{match.gols_casa}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{match.gols_fora}</span>
                  </div>
                  {match.penaltis_casa !== null && match.penaltis_fora !== null && (
                    <div className="mt-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Pênaltis: {match.penaltis_casa} x {match.penaltis_fora}
                    </div>
                  )}
                  <span className="mt-1 text-[11px] font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    Encerrada
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-mono text-xl font-bold text-muted-foreground">vs</span>
                  <Button size="sm" onClick={() => onSimulate(match.id)}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Simular Partida
                  </Button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectTeam(awayTeam.id)}
              className="flex flex-col items-center gap-2 text-center hover:opacity-80"
            >
              <ClubBadge team={awayTeam} size="lg" />
              <div className="text-sm font-bold sm:text-base">{awayTeam.nome}</div>
              {sumula && (
                <div className="text-xs text-muted-foreground">
                  OVR Titular: <span className="font-mono font-semibold">{sumula.overall_fora}</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {sumula && (
          <div className="space-y-6 p-6">
            {/* Eventos / Súmula */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Súmula da Partida
              </h3>
              {sumula.eventos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
              ) : (
                <div className="space-y-1.5">
                  {sumula.eventos.map((ev, idx) => {
                    const isHome = ev.time_id === homeTeam.id;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs ${
                          ev.tipo === 'gol' ? 'bg-emerald-500/10 font-medium' : 'bg-muted/30'
                        }`}
                      >
                        <span className="w-8 font-mono font-bold text-muted-foreground">
                          {ev.minuto}&apos;
                        </span>
                        <span className="w-10 font-semibold">
                          {isHome ? homeTeam.sigla : awayTeam.sigla}
                        </span>
                        <span>{ev.tipo === 'gol' ? '⚽' : '🟨'}</span>
                        <span className="font-semibold text-foreground">{ev.jogador_nome}</span>
                        {ev.assistencia_nome && (
                          <span className="text-muted-foreground">
                            (Assist: {ev.assistencia_nome})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Estatísticas
              </h3>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Posse de Bola', c: `${sumula.estatisticas.posse_casa}%`, f: `${sumula.estatisticas.posse_fora}%`, pct: sumula.estatisticas.posse_casa },
                  { label: 'Finalizações', c: sumula.estatisticas.finalizacoes_casa, f: sumula.estatisticas.finalizacoes_fora, pct: (sumula.estatisticas.finalizacoes_casa / Math.max(1, sumula.estatisticas.finalizacoes_casa + sumula.estatisticas.finalizacoes_fora)) * 100 },
                  { label: 'Finalizações no Gol', c: sumula.estatisticas.finalizacoes_gol_casa, f: sumula.estatisticas.finalizacoes_gol_fora, pct: (sumula.estatisticas.finalizacoes_gol_casa / Math.max(1, sumula.estatisticas.finalizacoes_gol_casa + sumula.estatisticas.finalizacoes_gol_fora)) * 100 },
                  { label: 'Gols Esperados (xG)', c: sumula.estatisticas.xg_casa.toFixed(2), f: sumula.estatisticas.xg_fora.toFixed(2), pct: (sumula.estatisticas.xg_casa / Math.max(0.1, sumula.estatisticas.xg_casa + sumula.estatisticas.xg_fora)) * 100 },
                  { label: 'Escanteios', c: sumula.estatisticas.escanteios_casa, f: sumula.estatisticas.escanteios_fora, pct: (sumula.estatisticas.escanteios_casa / Math.max(1, sumula.estatisticas.escanteios_casa + sumula.estatisticas.escanteios_fora)) * 100 },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="font-semibold">{stat.c}</span>
                      <span className="font-sans text-muted-foreground">{stat.label}</span>
                      <span className="font-semibold">{stat.f}</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${stat.pct}%` }} />
                      <div className="flex-1 bg-sky-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Escalações */}
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { team: homeTeam, xi: sumula.titulares_casa },
                { team: awayTeam, xi: sumula.titulares_fora },
              ].map(({ team, xi }) => (
                <div key={team.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ClubBadge team={team} size="xs" />
                    <h3 className="text-xs font-bold tracking-wider uppercase">
                      Escalação • {team.nome}
                    </h3>
                  </div>
                  <div className="divide-y text-xs">
                    {xi.map((j) => (
                      <div key={j.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono text-muted-foreground">{j.numero}</span>
                          <span className="w-8 rounded bg-muted px-1 py-0.5 text-center font-mono text-[10px] font-semibold">
                            {j.posicao}
                          </span>
                          <span className="font-medium">{j.nome}</span>
                        </div>
                        <OverallBadge overall={j.overall} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
