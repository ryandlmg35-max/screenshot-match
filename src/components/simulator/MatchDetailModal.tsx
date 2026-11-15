import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, CloudRain, Flame, Pause, Play, Radio, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubBadge } from './ClubBadge';
import type { EventoPartida, Partida, Time } from '@/types/simulator';

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

function playMatchTone(type: 'goal' | 'card') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'goal') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      osc.start();
      osc.stop(ctx.currentTime + 0.43);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    }
  } catch {
    // Ignora caso áudio esteja bloqueado
  }
}

function getEventIcon(tipo: EventoPartida['tipo']) {
  switch (tipo) {
    case 'gol':
    case 'penalti_convertido':
      return '⚽';
    case 'cartao_amarelo':
      return '🟨';
    case 'cartao_vermelho':
      return '🟥';
    case 'substituicao':
      return '🔄';
    case 'defesa_goleiro':
      return '🧤';
    case 'lesao':
      return '🏥';
    default:
      return '•';
  }
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
  const [liveMode, setLiveMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveMinute, setLiveMinute] = useState(90);
  const [speed, setSpeed] = useState<1 | 4>(4);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [goalPulse, setGoalPulse] = useState(false);
  const prevMinuteRef = useRef(0);

  useEffect(() => {
    if (!liveMode || !isPlaying) return;
    const intervalMs = speed === 4 ? 120 : 420;
    const timer = window.setInterval(() => {
      setLiveMinute((m) => {
        if (m >= 90) {
          setIsPlaying(false);
          return 90;
        }
        return m + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [liveMode, isPlaying, speed]);

  useEffect(() => {
    if (!liveMode || !sumula) {
      prevMinuteRef.current = liveMinute;
      return;
    }
    const newlyReached = sumula.eventos.filter(
      (ev) => ev.minuto > prevMinuteRef.current && ev.minuto <= liveMinute,
    );
    if (newlyReached.some((e) => e.tipo === 'gol')) {
      setGoalPulse(true);
      if (soundEnabled) playMatchTone('goal');
      const t = window.setTimeout(() => setGoalPulse(false), 700);
      prevMinuteRef.current = liveMinute;
      return () => window.clearTimeout(t);
    }
    if (newlyReached.some((e) => e.tipo === 'cartao_amarelo' || e.tipo === 'cartao_vermelho')) {
      if (soundEnabled) playMatchTone('card');
    }
    prevMinuteRef.current = liveMinute;
    return undefined;
  }, [liveMinute, liveMode, sumula, soundEnabled]);

  const startLiveReplay = () => {
    setLiveMode(true);
    setLiveMinute(0);
    prevMinuteRef.current = 0;
    setIsPlaying(true);
  };

  const visibleEvents = useMemo(() => {
    if (!sumula) return [];
    if (!liveMode) return sumula.eventos;
    return sumula.eventos.filter((ev) => ev.minuto <= liveMinute);
  }, [sumula, liveMode, liveMinute]);

  const displayedHomeGoals = useMemo(() => {
    if (!match.finalizada) return 0;
    if (!liveMode || liveMinute >= 90) return match.gols_casa ?? 0;
    return visibleEvents.filter((e) => e.tipo === 'gol' && e.time_id === homeTeam.id).length;
  }, [match, liveMode, liveMinute, visibleEvents, homeTeam.id]);

  const displayedAwayGoals = useMemo(() => {
    if (!match.finalizada) return 0;
    if (!liveMode || liveMinute >= 90) return match.gols_fora ?? 0;
    return visibleEvents.filter((e) => e.tipo === 'gol' && e.time_id === awayTeam.id).length;
  }, [match, liveMode, liveMinute, visibleEvents, awayTeam.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-5 py-3 backdrop-blur-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>
              {match.fase} • Rodada {match.rodada} • {homeTeam.estadio}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px]">
              <CloudRain className="h-3 w-3" /> {match.clima} • Gramado {match.gramado}
            </span>
            {match.classico && (
              <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                <Flame className="h-3 w-3" /> CLÁSSICO
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Placar */}
        <div
          className={`border-b px-6 py-6 transition-colors duration-500 ${
            goalPulse ? 'bg-emerald-500/20' : 'bg-muted/20'
          }`}
        >
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
                    <span>{displayedHomeGoals}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{displayedAwayGoals}</span>
                  </div>
                  {(!liveMode || liveMinute >= 90) &&
                    match.penaltis_casa !== null &&
                    match.penaltis_fora !== null && (
                      <div className="mt-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Pênaltis: {match.penaltis_casa} x {match.penaltis_fora}
                      </div>
                    )}
                  <span className="mt-1 text-[11px] font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    {liveMode && liveMinute < 90 ? `Ao Vivo • ${liveMinute}'` : 'Encerrada'}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-mono text-xl font-bold text-muted-foreground">vs</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSimulate(match.id);
                      startLiveReplay();
                    }}
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Simular ao Vivo
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

          {/* Controles de Replay Ao Vivo */}
          {match.finalizada && sumula && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {!liveMode ? (
                <Button size="sm" variant="outline" onClick={startLiveReplay}>
                  <Radio className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
                  Assistir Replay Minuto a Minuto
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsPlaying((p) => !p)}>
                    {isPlaying ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                    {isPlaying ? 'Pausar' : 'Continuar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeed((s) => (s === 4 ? 1 : 4))}
                  >
                    Velocidade {speed}x
                  </Button>
                  <Button size="sm" variant="outline" onClick={startLiveReplay}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reiniciar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsPlaying(false);
                      setLiveMinute(90);
                      setLiveMode(false);
                    }}
                  >
                    Ver Fim (90&apos;)
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSoundEnabled((v) => !v)}
                    title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {sumula && (
          <div className="space-y-6 p-6">
            {/* Melhor em Campo */}
            {sumula.melhor_em_campo && (!liveMode || liveMinute >= 90) && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-500">
                  <Award className="h-4 w-4" /> Melhor em Campo (MVP):
                </div>
                <span className="font-bold text-foreground">{sumula.melhor_em_campo.nome}</span>
              </div>
            )}

            {/* Eventos / Narração */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Narração & Eventos da Partida
              </h3>
              {visibleEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {liveMode ? 'Aguardando os primeiros lances...' : 'Sem eventos registrados.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {visibleEvents.map((ev, idx) => {
                    const isHome = ev.time_id === homeTeam.id;
                    const isGoal = ev.tipo === 'gol';
                    const isRed = ev.tipo === 'cartao_vermelho';
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-xs transition-all ${
                          isGoal
                            ? 'border border-emerald-500/30 bg-emerald-500/10 font-medium'
                            : isRed
                              ? 'border border-rose-500/30 bg-rose-500/10'
                              : 'bg-muted/30'
                        }`}
                      >
                        <span className="w-8 shrink-0 font-mono font-bold text-muted-foreground">
                          {ev.minuto}&apos;
                        </span>
                        <span className="w-10 shrink-0 font-semibold">
                          {isHome ? homeTeam.sigla : awayTeam.sigla}
                        </span>
                        <span className="shrink-0">{getEventIcon(ev.tipo)}</span>
                        <div className="flex-1">
                          <div className="text-foreground">{ev.narracao}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Estatísticas */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Estatísticas da Partida
              </h3>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    label: 'Posse de Bola',
                    c: `${sumula.estatisticas.posse_casa}%`,
                    f: `${sumula.estatisticas.posse_fora}%`,
                    pct: sumula.estatisticas.posse_casa,
                  },
                  {
                    label: 'Finalizações (Totais)',
                    c: sumula.estatisticas.finalizacoes_casa,
                    f: sumula.estatisticas.finalizacoes_fora,
                    pct:
                      (sumula.estatisticas.finalizacoes_casa /
                        Math.max(1, sumula.estatisticas.finalizacoes_casa + sumula.estatisticas.finalizacoes_fora)) *
                      100,
                  },
                  {
                    label: 'Finalizações no Gol',
                    c: sumula.estatisticas.finalizacoes_gol_casa,
                    f: sumula.estatisticas.finalizacoes_gol_fora,
                    pct:
                      (sumula.estatisticas.finalizacoes_gol_casa /
                        Math.max(
                          1,
                          sumula.estatisticas.finalizacoes_gol_casa + sumula.estatisticas.finalizacoes_gol_fora,
                        )) *
                      100,
                  },
                  {
                    label: 'Finalizações para Fora',
                    c: sumula.estatisticas.finalizacoes_fora_casa ?? 0,
                    f: sumula.estatisticas.finalizacoes_fora_fora ?? 0,
                    pct:
                      ((sumula.estatisticas.finalizacoes_fora_casa ?? 0) /
                        Math.max(
                          1,
                          (sumula.estatisticas.finalizacoes_fora_casa ?? 0) +
                            (sumula.estatisticas.finalizacoes_fora_fora ?? 0),
                        )) *
                      100,
                  },
                  {
                    label: 'Defesas do Goleiro',
                    c: sumula.estatisticas.defesas_casa ?? 0,
                    f: sumula.estatisticas.defesas_fora ?? 0,
                    pct:
                      ((sumula.estatisticas.defesas_casa ?? 0) /
                        Math.max(
                          1,
                          (sumula.estatisticas.defesas_casa ?? 0) + (sumula.estatisticas.defesas_fora ?? 0),
                        )) *
                      100,
                  },
                  {
                    label: 'Gols Esperados (xG)',
                    c: sumula.estatisticas.xg_casa.toFixed(2),
                    f: sumula.estatisticas.xg_fora.toFixed(2),
                    pct:
                      (sumula.estatisticas.xg_casa /
                        Math.max(0.1, sumula.estatisticas.xg_casa + sumula.estatisticas.xg_fora)) *
                      100,
                  },
                  {
                    label: 'Escanteios',
                    c: sumula.estatisticas.escanteios_casa,
                    f: sumula.estatisticas.escanteios_fora,
                    pct:
                      (sumula.estatisticas.escanteios_casa /
                        Math.max(1, sumula.estatisticas.escanteios_casa + sumula.estatisticas.escanteios_fora)) *
                      100,
                  },
                  {
                    label: 'Faltas Cometidas',
                    c: sumula.estatisticas.faltas_casa,
                    f: sumula.estatisticas.faltas_fora,
                    pct:
                      (sumula.estatisticas.faltas_casa /
                        Math.max(1, sumula.estatisticas.faltas_casa + sumula.estatisticas.faltas_fora)) *
                      100,
                  },
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
