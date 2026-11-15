import { useMemo, useState } from 'react';
import { ArrowRightLeft, Coins, Search, Sparkles, UserCheck } from 'lucide-react';
import { useSimulator } from '@/lib/simulator-store';
import type { Jogador, Posicao } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface TransferMarketTabProps {
  onSelectPlayer: (player: Jogador) => void;
}

const POSITIONS: Array<'TODAS' | Posicao> = ['TODAS', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];

export function TransferMarketTab({ onSelectPlayer }: TransferMarketTabProps) {
  const { dataset, comprarJogador, simularJanela } = useSimulator();
  const [destTeamId, setDestTeamId] = useState<string>('bra-flamengo');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<'TODAS' | Posicao>('TODAS');
  const [onlyFreeAgents, setOnlyFreeAgents] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const timesMap = useMemo(() => new Map(dataset.times.map((t) => [t.id, t])), [dataset.times]);
  const destTeam = timesMap.get(destTeamId) ?? dataset.times[0]!;

  const sortedTeams = useMemo(
    () => [...dataset.times].sort((a, b) => a.nome.localeCompare(b.nome)),
    [dataset.times],
  );

  const marketPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.jogadores
      .filter((j) => {
        if (j.time_id === destTeam.id) return false;
        if (posFilter !== 'TODAS' && j.posicao !== posFilter) return false;
        if (onlyFreeAgents && j.contrato_fim_ano > dataset.anoAtual) return false;
        if (q) {
          const teamName = timesMap.get(j.time_id)?.nome.toLowerCase() ?? '';
          if (!j.nome.toLowerCase().includes(q) && !teamName.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 60);
  }, [dataset.jogadores, dataset.anoAtual, destTeam.id, posFilter, onlyFreeAgents, search, timesMap]);

  const handleBuy = (player: Jogador) => {
    const res = comprarJogador(player.id, destTeam.id);
    if (res.ok) {
      const isFree = player.contrato_fim_ano <= dataset.anoAtual;
      setFeedback({
        ok: true,
        msg: `${player.nome} contratado por ${destTeam.nome} (${isFree ? 'Passe Livre' : `€ ${(player.valor_mercado / 1_000_000).toFixed(1)}M`})!`,
      });
    } else {
      setFeedback({ ok: false, msg: res.error ?? 'Erro ao concluir transferência.' });
    }
  };

  const handleSimulateWindow = () => {
    const count = simularJanela();
    setFeedback({
      ok: true,
      msg: `Janela simulada pela IA: ${count} transferência(s) concluída(s) entre clubes.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Club selector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
              Mercado de Transferências ({dataset.anoAtual})
            </h2>
            <p className="text-xs text-slate-400">
              Os clubes negociam automaticamente no meio e na virada de temporada conforme o orçamento, ou você pode contratar e simular janelas extras abaixo.
            </p>
          </div>
          <button
            onClick={handleSimulateWindow}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <Sparkles className="h-4 w-4" />
            Simular Janela (IA)
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
              Clube Comprador
            </label>
            <select
              value={destTeam.id}
              onChange={(e) => setDestTeamId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {sortedTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} (€ {(t.orcamento / 1_000_000).toFixed(1)}M)
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-400">
              <Coins className="h-3.5 w-3.5 text-amber-400" /> Orçamento Disponível
            </div>
            <div className="mt-0.5 font-mono text-lg font-black text-emerald-400">
              € {(destTeam.orcamento / 1_000_000).toFixed(1)}M
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Elenco Atual</div>
            <div className="mt-0.5 font-mono text-lg font-black text-white">
              {dataset.jogadores.filter((j) => j.time_id === destTeam.id).length} jogadores
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
              feedback.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jogador ou clube atual..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                posFilter === pos
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOnlyFreeAgents((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            onlyFreeAgents
              ? 'border-amber-500 bg-amber-500/20 text-amber-300'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Passe Livre ({dataset.anoAtual})
        </button>
      </div>

      {/* Players table + Recent transfers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 lg:col-span-2">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Jogador</th>
                <th className="px-3 py-2.5">Clube</th>
                <th className="px-3 py-2.5 text-center">Pos</th>
                <th className="px-3 py-2.5 text-center">Idade</th>
                <th className="px-3 py-2.5 text-center">OVR</th>
                <th className="px-3 py-2.5 text-right">Custo</th>
                <th className="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {marketPlayers.map((p) => {
                const origin = timesMap.get(p.time_id);
                const isFree = p.contrato_fim_ano <= dataset.anoAtual;
                const cost = isFree ? 0 : p.valor_mercado;
                const canAfford = destTeam.orcamento >= cost;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onSelectPlayer(p)}
                        className="font-semibold text-white hover:text-emerald-400 hover:underline text-left"
                      >
                        {p.nome}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      {origin && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <ClubBadge team={origin} size="xs" />
                          <span className="truncate max-w-[110px]">{origin.sigla}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                        {p.posicao}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-300">{p.idade}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-400">
                      {p.overall}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {isFree ? (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          Livre
                        </span>
                      ) : (
                        <span className="text-slate-200">€ {(cost / 1_000_000).toFixed(1)}M</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => handleBuy(p)}
                        disabled={!canAfford}
                        className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Contratar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Recent transfers feed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Movimentações Recentes
          </h3>
          {dataset.transferencias.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhuma transferência registrada ainda. Contrate um atleta ou simule a janela com a IA.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {dataset.transferencias.slice(0, 30).map((tr) => {
                const origin = tr.time_origem_id ? timesMap.get(tr.time_origem_id) : null;
                const dest = timesMap.get(tr.time_destino_id);
                return (
                  <div
                    key={tr.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{tr.jogador_nome}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        OVR {tr.overall}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {origin ? origin.sigla : 'Base'} →{' '}
                        <strong className="text-slate-200">{dest?.sigla ?? tr.time_destino_id}</strong>
                      </span>
                      <span className="font-mono text-amber-300">
                        {tr.tipo === 'livre'
                          ? 'Passe Livre'
                          : tr.tipo === 'base'
                            ? 'Base'
                            : `€ ${(tr.valor / 1_000_000).toFixed(1)}M`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
