import { MessageSquareQuote, Mic, Newspaper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePressConference } from '@/lib/press-conference';
import type { Partida, Tecnico, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface PressConferenceModalProps {
  match: Partida;
  homeTeam: Time;
  awayTeam: Time;
  homeCoach?: Tecnico | undefined;
  awayCoach?: Tecnico | undefined;
  compName: string;
  onClose: () => void;
}

export function PressConferenceModal({
  match,
  homeTeam,
  awayTeam,
  homeCoach,
  awayCoach,
  compName,
  onClose,
}: PressConferenceModalProps) {
  const report = generatePressConference(match, homeTeam, awayTeam, homeCoach, awayCoach, compName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Mic className="h-4 w-4" /> Coletiva de Imprensa • {compName}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-slate-300" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Manchete */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-950 to-slate-900 p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              <Newspaper className="h-3.5 w-3.5" /> {report.storylineBadge}
            </div>
            <h2 className="text-xl font-black leading-snug text-white">{report.headline}</h2>
            <p className="mt-1.5 text-xs text-slate-300">{report.subheadline}</p>

            <div className="mt-4 flex items-center justify-center gap-6 rounded-lg bg-slate-950/70 py-3">
              <div className="flex items-center gap-2">
                <ClubBadge team={homeTeam} size="sm" />
                <span className="text-sm font-bold text-white">{homeTeam.sigla}</span>
              </div>
              <span className="font-mono text-2xl font-black text-emerald-400">
                {match.gols_casa} - {match.gols_fora}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{awayTeam.sigla}</span>
                <ClubBadge team={awayTeam} size="sm" />
              </div>
            </div>
          </div>

          {/* Fatores-Chave */}
          {report.factors.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Raio-X Tático da Imprensa
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {report.factors.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs"
                  >
                    <span
                      className={`font-mono font-bold ${
                        f.advantage === 'home' ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {f.homeVal}
                    </span>
                    <span className="text-[11px] text-slate-400">{f.label}</span>
                    <span
                      className={`font-mono font-bold ${
                        f.advantage === 'away' ? 'text-sky-400' : 'text-slate-300'
                      }`}
                    >
                      {f.awayVal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Perguntas e Respostas */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MessageSquareQuote className="h-4 w-4 text-emerald-400" /> Entrevistas Pós-Jogo
            </h3>
            {report.questions.map((q, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    <strong className="text-slate-200">{q.journalist}</strong> • {q.outlet}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-semibold text-emerald-300">
                    {q.speakerName} ({q.speakerTeam})
                  </span>
                </div>
                <p className="text-xs italic text-slate-300">&ldquo;{q.question}&rdquo;</p>
                <div className="rounded-lg border-l-2 border-emerald-500 bg-slate-900/80 px-3 py-2 text-xs text-slate-100">
                  {q.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
