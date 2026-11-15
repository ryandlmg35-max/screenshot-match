import { useEffect } from 'react';
import { Award, Shield, Sparkles, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fireConfetti } from '@/lib/confetti';
import type { Competicao, Jogador, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface ChampionCelebrationModalProps {
  competition: Competicao;
  seasonLabel: string;
  champion: Time;
  runnerUp?: Time | undefined;
  topScorer?: { player: Jogador; goals: number } | undefined;
  onClose: () => void;
}

export function ChampionCelebrationModal({
  competition,
  seasonLabel,
  champion,
  runnerUp,
  topScorer,
  onClose,
}: ChampionCelebrationModalProps) {
  useEffect(() => {
    fireConfetti({ particleCount: 150, durationMs: 3200 });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/20 text-amber-400 shadow-lg">
          <Trophy className="h-7 w-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
          <Sparkles className="h-3.5 w-3.5" /> Campeão • {competition.nome} {seasonLabel}
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <ClubBadge team={champion} size="lg" />
          <h2 className="text-2xl font-black text-white">{champion.nome}</h2>
          <p className="text-xs text-slate-400">
            {champion.cidade} • {champion.estadio}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
              <Shield className="h-3.5 w-3.5 text-sky-400" /> Vice-Campeão
            </div>
            <div className="mt-1 font-bold text-slate-200">{runnerUp?.nome ?? '—'}</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
              <Award className="h-3.5 w-3.5 text-amber-400" /> Artilheiro
            </div>
            <div className="mt-1 truncate font-bold text-slate-200">
              {topScorer ? `${topScorer.player.nome} (${topScorer.goals}G)` : '—'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fireConfetti({ particleCount: 120, durationMs: 2500 })}
          >
            🎉 Mais Confetes
          </Button>
          <Button size="sm" onClick={onClose} className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400">
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
