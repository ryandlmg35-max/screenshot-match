import { ClubBadge } from './ClubBadge';
import type { Classificacao, Competicao, Time } from '@/types/simulator';

interface StandingsTableProps {
  competicao: Competicao;
  standings: Classificacao[];
  timesMap: Map<string, Time>;
  onSelectTeam: (teamId: string) => void;
}

function getZoneClass(comp: Competicao, pos: number, total: number): string {
  if (comp.formato === 'grupos') {
    return pos <= 2 ? 'border-l-4 border-l-emerald-500' : '';
  }
  if (comp.divisao === 1) {
    if (pos <= 4) return 'border-l-4 border-l-emerald-500';
    if (pos <= 6) return 'border-l-4 border-l-sky-500';
    if (pos > total - 4) return 'border-l-4 border-l-rose-500';
  }
  if (comp.divisao === 2) {
    if (pos <= 4) return 'border-l-4 border-l-emerald-500';
    if (pos > total - 4) return 'border-l-4 border-l-rose-500';
  }
  return '';
}

export function StandingsTable({
  competicao,
  standings,
  timesMap,
  onSelectTeam,
}: StandingsTableProps) {
  const groups = Array.from(new Set(standings.map((s) => s.grupo).filter(Boolean))) as string[];

  const renderTable = (rows: Classificacao[], title?: string) => (
    <div key={title ?? 'main'} className="overflow-hidden rounded-lg border bg-card">
      {title && (
        <div className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="w-10 px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">Clube</th>
              <th className="w-12 px-2 py-2.5 text-center font-bold text-foreground">P</th>
              <th className="w-10 px-2 py-2.5 text-center">J</th>
              <th className="w-10 px-2 py-2.5 text-center">V</th>
              <th className="w-10 px-2 py-2.5 text-center">E</th>
              <th className="w-10 px-2 py-2.5 text-center">D</th>
              <th className="w-10 px-2 py-2.5 text-center">GP</th>
              <th className="w-10 px-2 py-2.5 text-center">GC</th>
              <th className="w-12 px-2 py-2.5 text-center">SG</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const team = timesMap.get(row.time_id);
              if (!team) return null;
              const jogos = row.vitorias + row.empates + row.derrotas;
              const pos = idx + 1;
              return (
                <tr
                  key={row.time_id}
                  onClick={() => onSelectTeam(team.id)}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${getZoneClass(competicao, pos, rows.length)}`}
                >
                  <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                    {pos}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <ClubBadge team={team} size="sm" />
                      <span className="font-medium text-foreground">{team.nome}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        ({team.sigla})
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-foreground">
                    {row.pontos}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{jogos}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {row.vitorias}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">
                    {row.empates}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs text-rose-600 dark:text-rose-400">
                    {row.derrotas}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{row.gols_pro}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs">{row.gols_contra}</td>
                  <td className="px-2 py-2 text-center font-mono text-xs font-medium">
                    {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (groups.length > 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {groups.sort().map((g) =>
          renderTable(
            standings.filter((s) => s.grupo === g),
            g,
          ),
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderTable(standings)}
      <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
        {competicao.divisao === 1 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
              {competicao.pais_id === 'bra' ? 'Libertadores (G4)' : 'Champions League (G4)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-sky-500" />
              {competicao.pais_id === 'bra' ? 'Pré-Libertadores / Sula' : 'Europa League'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
              Rebaixamento (Z4)
            </span>
          </>
        )}
        {competicao.divisao === 2 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Acesso à 1ª Divisão
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" /> Rebaixamento
            </span>
          </>
        )}
      </div>
    </div>
  );
}
