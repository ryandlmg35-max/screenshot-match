import { useState } from 'react';
import { ArrowRightLeft, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calcularOverallEstimado, type ReputacaoNivel } from '@/lib/overall-formula';
import { useSimulator } from '@/lib/simulator-store';
import type { PernaDominante, Posicao } from '@/types/simulator';
import { ClubBadge } from './ClubBadge';
import { OverallBadge } from './MatchDetailModal';

const POSICOES: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];

export function AdminPanel() {
  const {
    dataset,
    adicionarJogador,
    atualizarJogador,
    removerJogador,
    atualizarTecnico,
    atualizarTime,
  } = useSimulator();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('bra-flamengo');
  const [teamSearch, setTeamSearch] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const selectedTeam = dataset.times.find((t) => t.id === selectedTeamId) ?? dataset.times[0]!;
  const selectedCoach = dataset.tecnicos.find((tec) => tec.time_id === selectedTeam.id);
  const teamPlayers = dataset.jogadores.filter((j) => j.time_id === selectedTeam.id);

  // Coach edit state
  const [coachName, setCoachName] = useState(selectedCoach?.nome ?? '');
  const [coachNat, setCoachNat] = useState(selectedCoach?.nacionalidade ?? '');
  const [clubElo, setClubElo] = useState(String(selectedTeam.elo_rating));

  // New player form state
  const [newName, setNewName] = useState('');
  const [newPos, setNewPos] = useState<Posicao>('MEI');
  const [newNum, setNewNum] = useState('99');
  const [newNat, setNewNat] = useState('Brasil');
  const [newAge, setNewAge] = useState('23');
  const [newRep, setNewRep] = useState<ReputacaoNivel>(3);
  const [newFoot, setNewFoot] = useState<PernaDominante>('Direita');

  // Transfer state
  const [transferPlayerId, setTransferPlayerId] = useState<string>('');
  const [transferTargetTeamId, setTransferTargetTeamId] = useState<string>('bra-palmeiras');

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    const t = dataset.times.find((x) => x.id === id);
    const c = dataset.tecnicos.find((x) => x.time_id === id);
    setCoachName(c?.nome ?? '');
    setCoachNat(c?.nacionalidade ?? '');
    setClubElo(String(t?.elo_rating ?? 1500));
    setTransferPlayerId('');
  };

  const filteredTeams = dataset.times.filter(
    (t) =>
      t.nome.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.sigla.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  const estimatedOverall = calcularOverallEstimado({
    posicao: newPos,
    reputacao: newRep,
    idade: Number(newAge) || 23,
    clubeElo: selectedTeam.elo_rating,
  });

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    adicionarJogador({
      time_id: selectedTeam.id,
      nome: newName.trim(),
      posicao: newPos,
      numero: Number(newNum) || 99,
      nacionalidade: newNat.trim() || 'Brasil',
      idade: Math.max(15, Math.min(45, Number(newAge) || 23)),
      overall: estimatedOverall,
      perna_dominante: newFoot,
    });
    setNewName('');
  };

  const handleTransfer = () => {
    const player = teamPlayers.find((p) => p.id === transferPlayerId);
    if (!player || !transferTargetTeamId || transferTargetTeamId === selectedTeam.id) return;
    atualizarJogador({ ...player, time_id: transferTargetTeamId });
    setTransferPlayerId('');
  };

  const handleCopySql = async () => {
    const sqlLines = [
      `-- Atualização do clube ${selectedTeam.nome}`,
      `UPDATE public.times SET elo_rating = ${Number(clubElo) || selectedTeam.elo_rating} WHERE id = '${selectedTeam.id}';`,
      `INSERT INTO public.tecnicos (id, time_id, nome, nacionalidade) VALUES ('tec-${selectedTeam.id}', '${selectedTeam.id}', '${coachName.replace(/'/g, "''")}', '${coachNat.replace(/'/g, "''")}') ON CONFLICT (time_id) DO UPDATE SET nome = EXCLUDED.nome, nacionalidade = EXCLUDED.nacionalidade;`,
      ...teamPlayers.map(
        (j) =>
          `INSERT INTO public.jogadores (id, time_id, nome, posicao, numero, nacionalidade, idade, overall, perna_dominante) VALUES ('${j.id}', '${j.time_id}', '${j.nome.replace(/'/g, "''")}', '${j.posicao}', ${j.numero}, '${j.nacionalidade.replace(/'/g, "''")}', ${j.idade}, ${j.overall}, '${j.perna_dominante}') ON CONFLICT (id) DO UPDATE SET time_id = EXCLUDED.time_id, overall = EXCLUDED.overall, numero = EXCLUDED.numero, posicao = EXCLUDED.posicao;`,
      ),
    ];
    await navigator.clipboard.writeText(sqlLines.join('\n'));
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Club selector sidebar */}
      <div className="rounded-lg border bg-card p-3">
        <Input
          placeholder="Buscar clube..."
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          className="mb-3 h-8 text-xs"
        />
        <div className="max-h-[540px] space-y-1 overflow-y-auto pr-1">
          {filteredTeams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTeam(t.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                t.id === selectedTeam.id
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <ClubBadge team={t} size="xs" />
              <span className="truncate">{t.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="space-y-6">
        {/* Club & Coach */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ClubBadge team={selectedTeam} size="md" />
              <div>
                <h3 className="text-base font-bold">{selectedTeam.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam.cidade} • {selectedTeam.estadio}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleCopySql()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copiedSql ? 'SQL Copiado!' : 'Exportar SQL do Clube'}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Técnico</label>
              <Input
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nacionalidade</label>
              <Input
                value={coachNat}
                onChange={(e) => setCoachNat(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Elo Rating</label>
              <Input
                type="number"
                value={clubElo}
                onChange={(e) => setClubElo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                atualizarTecnico(selectedTeam.id, coachName, coachNat);
                atualizarTime({ id: selectedTeam.id, elo_rating: Number(clubElo) || 1500 });
              }}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Salvar Clube / Técnico
            </Button>
          </div>
        </div>

        {/* Add Player (with Overall Formula) */}
        <form onSubmit={handleAddPlayer} className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-wider uppercase">
              Adicionar Jogador (Fórmula Automática de Overall)
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Overall calculado:</span>
              <OverallBadge overall={estimatedOverall} />
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-6">
            <Input
              placeholder="Nome do jogador"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-xs sm:col-span-2"
              required
            />
            <select
              value={newPos}
              onChange={(e) => setNewPos(e.target.value as Posicao)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              {POSICOES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Nº"
              value={newNum}
              onChange={(e) => setNewNum(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Nacionalidade"
              value={newNat}
              onChange={(e) => setNewNat(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="number"
              placeholder="Idade"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Reputação:</span>
              <select
                value={newRep}
                onChange={(e) => setNewRep(Number(e.target.value) as ReputacaoNivel)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value={1}>1 - Base / Reserva</option>
                <option value={2}>2 - Rotação</option>
                <option value={3}>3 - Titular Regular</option>
                <option value={4}>4 - Destaque / Seleção</option>
                <option value={5}>5 - Classe Mundial</option>
              </select>
              <select
                value={newFoot}
                onChange={(e) => setNewFoot(e.target.value as PernaDominante)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="Direita">Direita</option>
                <option value="Esquerda">Esquerda</option>
                <option value="Ambas">Ambas</option>
              </select>
            </div>
            <Button type="submit" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar ao Elenco
            </Button>
          </div>
        </form>

        {/* Quick Transfer */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 text-xs font-bold tracking-wider uppercase">
            Transferência Rápida entre Clubes
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={transferPlayerId}
              onChange={(e) => setTransferPlayerId(e.target.value)}
              className="h-8 min-w-[180px] flex-1 rounded-md border bg-background px-2 text-xs"
            >
              <option value="">Selecione um jogador...</option>
              {teamPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.numero} {p.nome} ({p.posicao} • OVR {p.overall})
                </option>
              ))}
            </select>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <select
              value={transferTargetTeamId}
              onChange={(e) => setTransferTargetTeamId(e.target.value)}
              className="h-8 min-w-[180px] flex-1 rounded-md border bg-background px-2 text-xs"
            >
              {dataset.times
                .filter((t) => t.id !== selectedTeam.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
            </select>
            <Button size="sm" variant="secondary" onClick={handleTransfer} disabled={!transferPlayerId}>
              Transferir
            </Button>
          </div>
        </div>

        {/* Squad quick edit */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted/40 px-4 py-2 text-xs font-bold tracking-wider uppercase">
            Elenco Atual ({teamPlayers.length})
          </div>
          <div className="divide-y">
            {teamPlayers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 font-mono text-muted-foreground">#{p.numero}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                    {p.posicao}
                  </span>
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">({p.nacionalidade}, {p.idade}a)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={99}
                    value={p.overall}
                    onChange={(e) =>
                      atualizarJogador({
                        ...p,
                        overall: Math.max(40, Math.min(99, Number(e.target.value) || 70)),
                      })
                    }
                    className="h-7 w-14 rounded border bg-background px-1.5 text-center font-mono text-xs font-bold"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 hover:text-rose-600"
                    onClick={() => removerJogador(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
