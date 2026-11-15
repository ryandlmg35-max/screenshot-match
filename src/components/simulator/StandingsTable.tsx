import { ClubBadge } from './ClubBadge';
import type { Classificacao, Competicao, Time } from '@/types/simulator';

interface StandingsTableProps {
  competicao: Competicao;
  standings: Classificacao[];
  timesMap: Map<string, Time>;
  onSelectTeam: (teamId: string) => void;
}

const CONMEBOL_COUNTRIES = new Set(['bra', 'arg', 'col', 'uru']);
const NON_EURO_WORLD_CUP_COUNTRIES = new Set(['usa', 'ksa']);
const TWO_DIV_COUNTRIES = new Set(['bra', 'eng', 'esp', 'ita', 'ger', 'fra', 'por']);

function getZoneConfig(comp: Competicao): {
  topCount: number;
  midCount: number;
  relegationCount: number;
  topLabel: string;
  midLabel: string;
} {
  if (comp.pais_id === 'bra') {
    return { topCount: 5, midCount: 4, relegationCount: 4, topLabel: 'Libertadores (G5)', midLabel: 'Sul-Americana' };
  }
  if (comp.pais_id === 'arg') {
    return { topCount: 4, midCount: 3, relegationCount: 0, topLabel: 'Libertadores (G4)', midLabel: 'Sul-Americana' };
  }
  if (comp.pais_id === 'col' || comp.pais_id === 'uru') {
    return { topCount: 2, midCount: 2, relegationCount: 0, topLabel: 'Libertadores (G2)', midLabel: 'Sul-Americana' };
  }
  if (comp.pais_id && NON_EURO_WORLD_CUP_COUNTRIES.has(comp.pais_id)) {
    return { topCount: 3, midCount: 0, relegationCount: 0, topLabel: 'Mundial de Clubes (G3)', midLabel: '' };
  }
  return { topCount: 4, midCount: 2, relegationCount: 3, topLabel: 'Champions League (G4)', midLabel: 'Europa League' };
}

function getZoneClass(comp: Competicao, pos: number, total: number): string {
  if (comp.formato === 'grupos') {
    return pos <= 2 ? 'border-l-4 border-l-emerald-500' : '';
  }
  if (comp.divisao === 1) {
    const cfg = getZoneConfig(comp);
    if (pos <= cfg.topCount) return 'border-l-4 border-l-emerald-500';
    if (cfg.midCount > 0 && pos <= cfg.topCount + cfg.midCount) return 'border-l-4 border-l-sky-500';
    if (cfg.relegationCount > 0 && pos > total - cfg.relegationCount) return 'border-l-4 border-l-rose-500';
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
        {competicao.divisao === 1 && (() => {
          const cfg = getZoneConfig(competicao);
          const hasRel = Boolean(competicao.pais_id && TWO_DIV_COUNTRIES.has(competicao.pais_id)) && cfg.relegationCount > 0;
          const isSingleDiv = !hasRel && (CONMEBOL_COUNTRIES.has(competicao.pais_id ?? '') || NON_EURO_WORLD_CUP_COUNTRIES.has(competicao.pais_id ?? ''));
          return (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                {cfg.topLabel}
              </span>
              {cfg.midCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-sky-500" />
                  {cfg.midLabel}
                </span>
              )}
              {hasRel && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                  Rebaixamento (Z{cfg.relegationCount})
                </span>
              )}
              {isSingleDiv && (
                <span className="text-muted-foreground/70">• Liga de divisão única (sem rebaixamento)</span>
              )}
            </>
          );
        })()}
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
