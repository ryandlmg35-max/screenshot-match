import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  DollarSign,
  HeartPulse,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Artilharia, Jogador, Time } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';

interface PlayerDetailModalProps {
  player: Jogador;
  team?: Time | undefined;
  artilharia: Artilharia[];
  anoAtual: number;
  onClose: () => void;
}

export function PlayerDetailModal({
  player,
  team,
  artilharia,
  anoAtual,
  onClose,
}: PlayerDetailModalProps) {
  const playerStats = artilharia.filter((a) => a.jogador_id === player.id);
  const seasonGoals = playerStats.reduce((s, a) => s + a.gols, 0);
  const seasonAssists = playerStats.reduce((s, a) => s + a.assistencias, 0);

  const radarData =
    player.posicao === 'GOL'
      ? [
          { attr: 'Reflexos', value: player.reflexos },
          { attr: 'Posicion.', value: player.posicionamento },
          { attr: 'Físico', value: player.forca_fisica },
          { attr: 'Passe', value: player.passe },
          { attr: 'Visão', value: player.visao_jogo },
          { attr: 'Velocidade', value: player.velocidade },
        ]
      : [
          { attr: 'Finaliz.', value: player.finalizacao },
          { attr: 'Passe', value: player.passe },
          { attr: 'Drible', value: player.drible },
          { attr: 'Velocidade', value: player.velocidade },
          { attr: 'Físico', value: player.forca_fisica },
          { attr: 'Marcação', value: player.marcacao },
          { attr: 'Visão', value: player.visao_jogo },
          { attr: 'Posicion.', value: player.posicionamento },
        ];

  const isFreeAgentSoon = player.contrato_fim_ano <= anoAtual;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-5">
          <div className="flex items-center gap-4">
            {team && <ClubBadge team={team} size="md" />}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  {player.posicao}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-400">#{player.numero}</span>
                <h2 className="text-xl font-bold text-white">{player.nome}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {team?.nome ?? 'Sem clube'} • {player.nacionalidade} • {player.idade} anos • Perna{' '}
                {player.perna_dominante}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-emerald-300">OVR</div>
              <div className="font-mono text-2xl font-black text-white">{player.overall}</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Status alerts */}
          {(player.lesionado_jogos > 0 || player.suspenso_jogos > 0) && (
            <div className="flex flex-wrap gap-3">
              {player.lesionado_jogos > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  <HeartPulse className="h-4 w-4 text-rose-400" />
                  <span>
                    <strong>Lesionado:</strong> {player.lesao_descricao ?? 'Departamento médico'} (
                    {player.lesionado_jogos} jogo(s) fora)
                  </span>
                </div>
              )}
              {player.suspenso_jogos > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>
                    <strong>Suspenso:</strong> Indisponível por {player.suspenso_jogos} partida(s)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Radar + Physical/Contract cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Radar de Atributos
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="74%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="attr" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[30, 99]} tick={false} axisLine={false} />
                    <Radar
                      name={player.nome}
                      dataKey="value"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              {/* Forma e Moral */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" /> Condição & Disciplina
                </h3>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300">Forma Física</span>
                    <span className="font-mono font-bold text-emerald-400">{player.forma_fisica}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${player.forma_fisica}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300">Moral</span>
                    <span className="font-mono font-bold text-sky-400">{player.moral}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${player.moral}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="rounded-lg bg-slate-900 p-2">
                    <div className="text-[10px] text-slate-400">Amarelos</div>
                    <div className="font-mono font-bold text-amber-400">{player.amarelos_acumulados}/3</div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2">
                    <div className="text-[10px] text-slate-400">Vermelhos</div>
                    <div className="font-mono font-bold text-rose-400">{player.vermelhos_temporada}</div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2">
                    <div className="text-[10px] text-slate-400">Gols / Assist.</div>
                    <div className="font-mono font-bold text-white">
                      {seasonGoals} / {seasonAssists}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contrato */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Contrato & Valor
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-900 p-2.5">
                    <div className="text-[10px] text-slate-400">Valor Mercado</div>
                    <div className="font-mono font-bold text-emerald-400">
                      € {(player.valor_mercado / 1_000_000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2.5">
                    <div className="text-[10px] text-slate-400">Salário/sem</div>
                    <div className="font-mono font-bold text-slate-200">
                      € {Math.round(player.salario_semanal / 1000)}k
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2.5">
                    <div className="text-[10px] text-slate-400">Contrato até</div>
                    <div
                      className={`font-mono font-bold ${
                        isFreeAgentSoon ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {player.contrato_fim_ano}
                      {isFreeAgentSoon && ' (Livre)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de temporadas */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Award className="h-3.5 w-3.5 text-amber-400" /> Histórico por Temporada
            </h3>
            {player.historico_temporadas.length === 0 ? (
              <p className="text-xs text-slate-500">
                Temporada atual ({anoAtual}): {seasonGoals} gol(s) e {seasonAssists} assistência(s) registrados até o momento. Avance a temporada para consolidar o histórico anual.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="py-2 pr-3">Ano</th>
                      <th className="py-2 pr-3">Clube</th>
                      <th className="py-2 pr-3">Competição</th>
                      <th className="py-2 text-center">J</th>
                      <th className="py-2 text-center">G</th>
                      <th className="py-2 text-center">A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {player.historico_temporadas.map((h, i) => (
                      <tr key={i} className="text-slate-200">
                        <td className="py-2 pr-3 font-mono">{h.ano}</td>
                        <td className="py-2 pr-3">{h.time_nome}</td>
                        <td className="py-2 pr-3 text-slate-400">{h.competicao_nome}</td>
                        <td className="py-2 text-center font-mono">{h.jogos}</td>
                        <td className="py-2 text-center font-mono font-bold text-emerald-400">{h.gols}</td>
                        <td className="py-2 text-center font-mono text-sky-400">{h.assistencias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timeline de Lesões e Cartões */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-rose-400" /> Timeline de Lesões e Suspensões
            </h3>
            {player.timeline_ocorrencias.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma lesão ou suspensão registrada nesta temporada.</p>
            ) : (
              <div className="space-y-2">
                {player.timeline_ocorrencias.slice(0, 12).map((occ) => (
                  <div
                    key={occ.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {occ.tipo === 'lesao' ? (
                        <HeartPulse className="h-4 w-4 text-rose-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <div>
                        <div className="font-medium text-slate-100">{occ.descricao}</div>
                        <div className="text-[11px] text-slate-400">
                          {occ.competicao_nome} • Rodada {occ.rodada}
                        </div>
                      </div>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                      {occ.jogos_fora} jogo(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
