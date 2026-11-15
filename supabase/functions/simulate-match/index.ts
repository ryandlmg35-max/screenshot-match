// Supabase Edge Function: simulate-match
// Simula uma partida ou rodada usando distribuição de Poisson + Overall titular + Fator Casa + Elo Rating.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PlayerRow {
  id: string;
  time_id: string;
  nome: string;
  posicao: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PON' | 'ATA';
  numero: number;
  overall: number;
}

const GOAL_WEIGHTS: Record<PlayerRow['posicao'], number> = {
  ATA: 4.4,
  PON: 3.3,
  MEI: 2.4,
  VOL: 0.9,
  LAT: 0.65,
  ZAG: 0.45,
  GOL: 0.005,
};

function poisson(lambda: number): number {
  const safe = Math.max(0.15, Math.min(5.5, lambda));
  const L = Math.exp(-safe);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { partidaId } = await req.json();
    if (!partidaId) {
      return new Response(JSON.stringify({ error: 'partidaId is required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: partida, error: pErr } = await supabase
      .from('partidas')
      .select('*')
      .eq('id', partidaId)
      .single();

    if (pErr || !partida) {
      return new Response(JSON.stringify({ error: 'Partida não encontrada' }), { status: 404 });
    }

    const [{ data: homeTeam }, { data: awayTeam }, { data: homePlayers }, { data: awayPlayers }] =
      await Promise.all([
        supabase.from('times').select('*').eq('id', partida.time_casa_id).single(),
        supabase.from('times').select('*').eq('id', partida.time_fora_id).single(),
        supabase
          .from('jogadores')
          .select('id, time_id, nome, posicao, numero, overall')
          .eq('time_id', partida.time_casa_id)
          .order('overall', { ascending: false })
          .limit(11),
        supabase
          .from('jogadores')
          .select('id, time_id, nome, posicao, numero, overall')
          .eq('time_id', partida.time_fora_id)
          .order('overall', { ascending: false })
          .limit(11),
      ]);

    const hXI = (homePlayers ?? []) as PlayerRow[];
    const aXI = (awayPlayers ?? []) as PlayerRow[];
    const ovrCasa = hXI.length ? hXI.reduce((s, p) => s + p.overall, 0) / hXI.length : 72;
    const ovrFora = aXI.length ? aXI.reduce((s, p) => s + p.overall, 0) / aXI.length : 72;

    const eloCasa = homeTeam?.elo_rating ?? 1500;
    const eloFora = awayTeam?.elo_rating ?? 1500;

    const powerCasa = ovrCasa * 0.65 + (55 + ((eloCasa - 1200) / 800) * 35) * 0.35;
    const powerFora = ovrFora * 0.65 + (55 + ((eloFora - 1200) / 800) * 35) * 0.35;
    const diff = powerCasa + 2.8 - powerFora;

    const lambdaCasa = Math.max(0.28, Math.min(3.8, 1.32 * Math.exp(diff * 0.052)));
    const lambdaFora = Math.max(0.22, Math.min(3.4, 1.18 * Math.exp(-diff * 0.052)));

    const golsCasa = poisson(lambdaCasa);
    const golsFora = poisson(lambdaFora);

    const eventos: Array<Record<string, unknown>> = [];
    for (let i = 0; i < golsCasa && hXI.length > 0; i++) {
      const scorer = pickWeighted(
        hXI,
        hXI.map((p) => GOAL_WEIGHTS[p.posicao] * Math.pow(p.overall / 70, 2.2)),
      );
      eventos.push({
        minuto: Math.floor(Math.random() * 90) + 1,
        tipo: 'gol',
        time_id: partida.time_casa_id,
        jogador_id: scorer.id,
        jogador_nome: scorer.nome,
      });
    }
    for (let i = 0; i < golsFora && aXI.length > 0; i++) {
      const scorer = pickWeighted(
        aXI,
        aXI.map((p) => GOAL_WEIGHTS[p.posicao] * Math.pow(p.overall / 70, 2.2)),
      );
      eventos.push({
        minuto: Math.floor(Math.random() * 90) + 1,
        tipo: 'gol',
        time_id: partida.time_fora_id,
        jogador_id: scorer.id,
        jogador_nome: scorer.nome,
      });
    }

    const { data: updated, error: uErr } = await supabase
      .from('partidas')
      .update({
        gols_casa: golsCasa,
        gols_fora: golsFora,
        finalizada: true,
        sumula: {
          overall_casa: Math.round(ovrCasa * 10) / 10,
          overall_fora: Math.round(ovrFora * 10) / 10,
          titulares_casa: hXI,
          titulares_fora: aXI,
          eventos: eventos.sort((a, b) => Number(a.minuto) - Number(b.minuto)),
        },
      })
      .eq('id', partidaId)
      .select()
      .single();

    if (uErr) throw uErr;

    return new Response(JSON.stringify({ partida: updated }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
