import { MapPin, Shield, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateAverageOverall, selectStartingXI } from '@/lib/simulation-engine';
import type { Jogador, Posicao, Tecnico, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';
import { OverallBadge } from './MatchDetailModal';

interface TeamDetailModalProps {
  team: Time;
  tecnico?: Tecnico | undefined;
  jogadores: Jogador[];
  onClose: () => void;
}

const POS_ORDER: Record<Posicao, number> = {
  GOL: 1,
  ZAG: 2,
  LAT: 3,
  VOL: 4,
  MEI: 5,
  PON: 6,
  ATA: 7,
};

export function TeamDetailModal({ team, tecnico, jogadores, onClose }: TeamDetailModalProps) {
  const xi = selectStartingXI(jogadores);
  const avgStarter = calculateAverageOverall(xi);
  const sortedSquad = [...jogadores].sort((a, b) => {
    const posDiff = POS_ORDER[a.posicao] - POS_ORDER[b.posicao];
    if (posDiff !== 0) return posDiff;
    return b.overall - a.overall;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-xs">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Ficha do Clube
          </span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Club Header */}
        <div className="flex flex-col gap-4 border-b bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ClubBadge team={team} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{team.nome}</h2>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                  {team.sigla}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {team.cidade} • {team.estadio}
                </span>
                {tecnico && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    Téc: <strong className="text-foreground">{tecnico.nome}</strong> ({tecnico.nacionalidade})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-lg border bg-card px-3.5 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                OVR Titular
              </div>
              <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                {avgStarter}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-3.5 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                Elo Rating
              </div>
              <div className="flex items-center justify-center gap-1 font-mono text-xl font-black">
                <Shield className="h-4 w-4 text-sky-500" />
                {team.elo_rating}
              </div>
            </div>
          </div>
        </div>

        {/* Full Squad */}
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Elenco Completo ({sortedSquad.length} jogadores)
            </h3>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="w-12 px-3 py-2 text-center">#</th>
                    <th className="w-16 px-2 py-2 text-center">Pos</th>
                    <th className="px-3 py-2">Jogador</th>
                    <th className="px-3 py-2">Nacionalidade</th>
                    <th className="w-14 px-2 py-2 text-center">Idade</th>
                    <th className="w-24 px-3 py-2">Perna</th>
                    <th className="w-16 px-3 py-2 text-center">OVR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedSquad.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                        {p.numero}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                          {p.posicao}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{p.nome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.nacionalidade}</td>
                      <td className="px-2 py-2 text-center font-mono">{p.idade}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.perna_dominante}</td>
                      <td className="px-3 py-2 text-center">
                        <OverallBadge overall={p.overall} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
