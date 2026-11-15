import { useState } from 'react';
import { ClubBadge } from './ClubBadge';
import type { Artilharia, Jogador, Time } from '@/types/simulator';

interface TopScorersTableProps {
  artilharia: Artilharia[];
  jogadoresMap: Map<string, Jogador>;
  timesMap: Map<string, Time>;
  onSelectTeam: (teamId: string) => void;
}

export function TopScorersTable({
  artilharia,
  jogadoresMap,
  timesMap,
  onSelectTeam,
}: TopScorersTableProps) {
  const [sortBy, setSortBy] = useState<'gols' | 'assistencias' | 'participacoes'>('gols');

  if (artilharia.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Nenhuma partida simulada ainda nesta competição. Simule uma rodada para gerar artilheiros e assistências.
      </div>
    );
  }

  const sorted = [...artilharia]
    .sort((a, b) => {
      if (sortBy === 'assistencias') {
        return b.assistencias - a.assistencias || b.gols - a.gols;
      }
      if (sortBy === 'participacoes') {
        return b.gols + b.assistencias - (a.gols + a.assistencias) || b.gols - a.gols;
      }
      return b.gols - a.gols || b.assistencias - a.assistencias;
    })
    .slice(0, 30);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Ordenar por:</span>
        {(
          [
            ['gols', 'Artilharia (Gols)'],
            ['assistencias', 'Assistências'],
            ['participacoes', 'Gols + Assist.'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              sortBy === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="w-10 px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">Jogador</th>
              <th className="px-3 py-2.5">Clube</th>
              <th className="w-14 px-2 py-2.5 text-center">Pos</th>
              <th className="w-16 px-2 py-2.5 text-center font-bold text-foreground">Gols</th>
              <th className="w-16 px-2 py-2.5 text-center">Assist.</th>
              <th className="w-16 px-2 py-2.5 text-center">G+A</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((row, idx) => {
              const player = jogadoresMap.get(row.jogador_id);
              if (!player) return null;
              const team = timesMap.get(player.time_id);
              return (
                <tr key={row.jogador_id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">{player.nome}</td>
                  <td className="px-3 py-2">
                    {team && (
                      <button
                        type="button"
                        onClick={() => onSelectTeam(team.id)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ClubBadge team={team} size="xs" />
                        <span>{team.nome}</span>
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                      {player.posicao}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {row.gols}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-sky-600 dark:text-sky-400">
                    {row.assistencias}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-semibold">
                    {row.gols + row.assistencias}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
