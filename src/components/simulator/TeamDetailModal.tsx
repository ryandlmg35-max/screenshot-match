import { Coins, Flame, HeartPulse, MapPin, Shield, ShieldAlert, Swords, Trophy, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateAverageOverall, selectStartingXI } from '@/lib/simulation-engine';
import type { Jogador, Partida, Posicao, Tecnico, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';
import { OverallBadge } from './MatchDetailModal';

interface TeamDetailModalProps {
  team: Time;
  tecnico?: Tecnico | undefined;
  jogadores: Jogador[];
  partidas?: Partida[];
  timesMap?: Map<string, Time>;
  onSelectPlayer?: (player: Jogador) => void;
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

const TACTIC_LABEL: Record<Time['estilo_tatico'], string> = {
  posse: 'Posse de Bola',
  'contra-ataque': 'Contra-Ataque',
  'pressao-alta': 'Pressão Alta',
  retranca: 'Retranca / Bloco Baixo',
};

export function TeamDetailModal({
  team,
  tecnico,
  jogadores,
  partidas = [],
  timesMap,
  onSelectPlayer,
  onClose,
}: TeamDetailModalProps) {
  const xi = selectStartingXI(jogadores);
  const avgStarter = calculateAverageOverall(xi);
  const sortedSquad = [...jogadores].sort((a, b) => {
    const posDiff = POS_ORDER[a.posicao] - POS_ORDER[b.posicao];
    if (posDiff !== 0) return posDiff;
    return b.overall - a.overall;
  });

  const avgIdade =
    jogadores.length > 0
      ? (jogadores.reduce((s, j) => s + j.idade, 0) / jogadores.length).toFixed(1)
      : '-';
  const totalValue = jogadores.reduce((s, j) => s + (j.valor_mercado ?? 0), 0) / 1_000_000;

  // Confrontos diretos em clássicos / rivais
  const h2hMap = new Map<string, { opponent: Time; v: number; e: number; d: number; gp: number; gc: number }>();
  if (timesMap) {
    for (const m of partidas) {
      if (!m.finalizada) continue;
      if (m.time_casa_id !== team.id && m.time_fora_id !== team.id) continue;
      if (!m.classico) continue;
      const isHome = m.time_casa_id === team.id;
      const oppId = isHome ? m.time_fora_id : m.time_casa_id;
      const opp = timesMap.get(oppId);
      if (!opp) continue;
      const gf = isHome ? (m.gols_casa ?? 0) : (m.gols_fora ?? 0);
      const ga = isHome ? (m.gols_fora ?? 0) : (m.gols_casa ?? 0);
      const rec = h2hMap.get(oppId) ?? { opponent: opp, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
      if (gf > ga) rec.v += 1;
      else if (gf === ga) rec.e += 1;
      else rec.d += 1;
      rec.gp += gf;
      rec.gc += ga;
      h2hMap.set(oppId, rec);
    }
  }
  const h2hList = Array.from(h2hMap.values());

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
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{team.nome}</h2>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                  {team.sigla}
                </span>
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                  {TACTIC_LABEL[team.estilo_tatico ?? 'posse']}
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
              {team.forma_recente && team.forma_recente.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Forma:
                  </span>
                  {team.forma_recente.map((f, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                        f === 'V'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : f === 'E'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-rose-500/20 text-rose-500'
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex">
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">OVR</div>
              <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                {avgStarter}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Elo</div>
              <div className="flex items-center justify-center gap-1 font-mono text-lg font-black">
                <Shield className="h-3.5 w-3.5 text-sky-500" />
                {team.elo_rating}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Moral</div>
              <div className="flex items-center justify-center gap-1 font-mono text-lg font-black text-amber-500">
                <Flame className="h-3.5 w-3.5" />
                {team.moral_elenco ?? 75}%
              </div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Caixa</div>
              <div className="flex items-center justify-center gap-1 font-mono text-lg font-black text-emerald-500">
                <Coins className="h-3.5 w-3.5" />
                €{((team.orcamento ?? 20_000_000) / 1_000_000).toFixed(0)}M
              </div>
            </div>
          </div>
        </div>

        {/* Títulos Históricos & Estatísticas do Elenco */}
        <div className="grid gap-4 border-b p-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Sala de Troféus
            </h3>
            {(!team.titulos_historicos || team.titulos_historicos.length === 0) ? (
              <p className="text-xs text-muted-foreground">
                Estatísticas do elenco: média de {avgIdade} anos • valor total € {totalValue.toFixed(1)}M.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {team.titulos_historicos.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500"
                  >
                    🏆 {t.quantidade}x {t.competicao}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              <Swords className="h-3.5 w-3.5 text-rose-500" /> Clássicos na Temporada
            </h3>
            {h2hList.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum clássico finalizado nesta temporada ainda. Média de idade: {avgIdade} anos • Elenco avaliado em € {totalValue.toFixed(1)}M.
              </p>
            ) : (
              <div className="space-y-1.5">
                {h2hList.map((rec) => (
                  <div
                    key={rec.opponent.id}
                    className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ClubBadge team={rec.opponent} size="xs" />
                      <span className="font-semibold">{rec.opponent.nome}</span>
                    </div>
                    <span className="font-mono text-[11px]">
                      {rec.v}V-{rec.e}E-{rec.d}D ({rec.gp}:{rec.gc})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full Squad */}
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Elenco Completo ({sortedSquad.length} jogadores) — clique no atleta para ver o radar
            </h3>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2">Jogador</th>
                  <th className="px-3 py-2 text-center">Idade</th>
                  <th className="px-3 py-2 text-center">Físico</th>
                  <th className="px-3 py-2 text-center">Moral</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">OVR</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedSquad.map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => onSelectPlayer?.(j)}
                    className={onSelectPlayer ? 'cursor-pointer hover:bg-muted/40' : 'hover:bg-muted/20'}
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground">{j.numero}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                        {j.posicao}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{j.nome}</span>
                        {j.lesionado_jogos > 0 && (
                          <span
                            title={`Lesionado (${j.lesionado_jogos} jogos)`}
                            className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500"
                          >
                            <HeartPulse className="h-3 w-3" /> {j.lesionado_jogos}j
                          </span>
                        )}
                        {j.suspenso_jogos > 0 && (
                          <span
                            title={`Suspenso (${j.suspenso_jogos} jogos)`}
                            className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500"
                          >
                            <ShieldAlert className="h-3 w-3" /> {j.suspenso_jogos}j
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono">{j.idade}</td>
                    <td className="px-3 py-2 text-center font-mono text-emerald-500">
                      {j.forma_fisica ?? 90}%
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-sky-500">
                      {j.moral ?? 75}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      €{((j.valor_mercado ?? 1_000_000) / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-3 py-2 text-center">
                      <OverallBadge overall={j.overall} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
