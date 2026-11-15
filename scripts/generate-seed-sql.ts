import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildInitialSimulatorDataset } from '../src/data/seed-builder';

const esc = (v: string | null | undefined): string => {
  if (v === null || v === undefined) return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
};

const dataset = buildInitialSimulatorDataset();
const lines: string[] = [];

lines.push('-- ============================================================================');
lines.push('-- Football Simulator Seed SQL (auto-generated from src/data/seed-builder.ts)');
lines.push(`-- Countries: ${dataset.paises.length} | Competitions: ${dataset.competicoes.length} | Clubs: ${dataset.times.length} | Players: ${dataset.jogadores.length}`);
lines.push('-- ============================================================================');
lines.push('BEGIN;');
lines.push('');

lines.push('-- 1. Paises');
for (const p of dataset.paises) {
  lines.push(
    `INSERT INTO public.paises (id, nome, continente, codigo_iso) VALUES (${esc(p.id)}, ${esc(p.nome)}, ${esc(p.continente)}, ${esc(p.codigo_iso)}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 2. Competicoes');
for (const c of dataset.competicoes) {
  lines.push(
    `INSERT INTO public.competicoes (id, nome, pais_id, tipo, divisao, formato) VALUES (${esc(c.id)}, ${esc(c.nome)}, ${esc(c.pais_id)}, ${esc(c.tipo)}, ${c.divisao ?? 'NULL'}, ${esc(c.formato)}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 3. Temporadas');
for (const t of dataset.temporadas) {
  lines.push(
    `INSERT INTO public.temporadas (id, competicao_id, ano_inicio, ano_fim, ativa) VALUES (${esc(t.id)}, ${esc(t.competicao_id)}, ${t.ano_inicio}, ${t.ano_fim}, ${t.ativa}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 4. Times');
for (const tm of dataset.times) {
  lines.push(
    `INSERT INTO public.times (id, nome, sigla, pais_id, cidade, estadio, logo_url, elo_rating) VALUES (${esc(tm.id)}, ${esc(tm.nome)}, ${esc(tm.sigla)}, ${esc(tm.pais_id)}, ${esc(tm.cidade)}, ${esc(tm.estadio)}, ${esc(tm.logo_url)}, ${tm.elo_rating}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 5. Tecnicos');
for (const tec of dataset.tecnicos) {
  lines.push(
    `INSERT INTO public.tecnicos (id, time_id, nome, nacionalidade) VALUES (${esc(tec.id)}, ${esc(tec.time_id)}, ${esc(tec.nome)}, ${esc(tec.nacionalidade)}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 6. Times x Competicao');
for (const tc of dataset.timesCompeticao) {
  lines.push(
    `INSERT INTO public.times_competicao (time_id, competicao_id, temporada_id, grupo) VALUES (${esc(tc.time_id)}, ${esc(tc.competicao_id)}, ${esc(tc.temporada_id)}, ${esc(tc.grupo ?? null)}) ON CONFLICT (time_id, competicao_id, temporada_id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 7. Classificacao inicial');
for (const cl of dataset.classificacao) {
  lines.push(
    `INSERT INTO public.classificacao (competicao_id, temporada_id, time_id, grupo, pontos, vitorias, empates, derrotas, gols_pro, gols_contra) VALUES (${esc(cl.competicao_id)}, ${esc(cl.temporada_id)}, ${esc(cl.time_id)}, ${esc(cl.grupo ?? null)}, 0, 0, 0, 0, 0, 0) ON CONFLICT (competicao_id, temporada_id, time_id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('-- 8. Jogadores');
for (const j of dataset.jogadores) {
  lines.push(
    `INSERT INTO public.jogadores (id, time_id, nome, posicao, numero, nacionalidade, idade, overall, perna_dominante) VALUES (${esc(j.id)}, ${esc(j.time_id)}, ${esc(j.nome)}, ${esc(j.posicao)}, ${j.numero}, ${esc(j.nacionalidade)}, ${j.idade}, ${j.overall}, ${esc(j.perna_dominante)}) ON CONFLICT (id) DO NOTHING;`,
  );
}
lines.push('');

lines.push('COMMIT;');

const outPath = resolve(process.cwd(), 'supabase/seed.sql');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(
  `Generated ${outPath}: ${dataset.paises.length} countries, ${dataset.competicoes.length} competitions, ${dataset.times.length} clubs, ${dataset.jogadores.length} players.`,
);
