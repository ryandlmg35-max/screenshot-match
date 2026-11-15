-- Football Manager Text Simulator Schema
-- Tables: paises, competicoes, temporadas, times, times_competicao,
--         jogadores, tecnicos, partidas, classificacao, artilharia

-- 1. paises
CREATE TABLE IF NOT EXISTS public.paises (
  id text PRIMARY KEY,
  nome text NOT NULL,
  continente text NOT NULL,
  codigo_iso text
);

-- 2. competicoes
CREATE TABLE IF NOT EXISTS public.competicoes (
  id text PRIMARY KEY,
  nome text NOT NULL,
  pais_id text REFERENCES public.paises(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('liga', 'copa', 'continental')),
  divisao integer,
  formato text NOT NULL CHECK (formato IN ('pontos-corridos', 'mata-mata', 'grupos'))
);

-- 3. temporadas
CREATE TABLE IF NOT EXISTS public.temporadas (
  id text PRIMARY KEY,
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  ano_inicio integer NOT NULL,
  ano_fim integer NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  UNIQUE (competicao_id, ano_inicio, ano_fim)
);

-- 4. times
CREATE TABLE IF NOT EXISTS public.times (
  id text PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL,
  pais_id text NOT NULL REFERENCES public.paises(id) ON DELETE RESTRICT,
  cidade text,
  estadio text NOT NULL,
  logo_url text,
  elo_rating integer NOT NULL DEFAULT 1500
);

-- 5. times_competicao
CREATE TABLE IF NOT EXISTS public.times_competicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  temporada_id text NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  grupo text,
  UNIQUE (time_id, competicao_id, temporada_id)
);

-- 6. jogadores
CREATE TABLE IF NOT EXISTS public.jogadores (
  id text PRIMARY KEY,
  time_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  nome text NOT NULL,
  posicao text NOT NULL CHECK (posicao IN ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA')),
  numero integer NOT NULL,
  nacionalidade text NOT NULL,
  idade integer NOT NULL CHECK (idade BETWEEN 15 AND 50),
  overall integer NOT NULL CHECK (overall BETWEEN 40 AND 99),
  perna_dominante text NOT NULL DEFAULT 'Direita' CHECK (perna_dominante IN ('Direita', 'Esquerda', 'Ambas'))
);

-- 7. tecnicos
CREATE TABLE IF NOT EXISTS public.tecnicos (
  id text PRIMARY KEY,
  time_id text NOT NULL UNIQUE REFERENCES public.times(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nacionalidade text NOT NULL
);

-- 8. partidas
CREATE TABLE IF NOT EXISTS public.partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  temporada_id text NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  time_casa_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  time_fora_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  gols_casa integer,
  gols_fora integer,
  penaltis_casa integer,
  penaltis_fora integer,
  rodada integer NOT NULL DEFAULT 1,
  fase text NOT NULL DEFAULT 'Temporada Regular',
  data timestamptz NOT NULL DEFAULT now(),
  finalizada boolean NOT NULL DEFAULT false,
  sumula jsonb
);

-- 9. classificacao
CREATE TABLE IF NOT EXISTS public.classificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  temporada_id text NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  time_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  grupo text,
  pontos integer NOT NULL DEFAULT 0,
  vitorias integer NOT NULL DEFAULT 0,
  empates integer NOT NULL DEFAULT 0,
  derrotas integer NOT NULL DEFAULT 0,
  gols_pro integer NOT NULL DEFAULT 0,
  gols_contra integer NOT NULL DEFAULT 0,
  saldo integer GENERATED ALWAYS AS (gols_pro - gols_contra) STORED,
  UNIQUE (competicao_id, temporada_id, time_id)
);

-- 10. artilharia
CREATE TABLE IF NOT EXISTS public.artilharia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_id text NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  temporada_id text NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  gols integer NOT NULL DEFAULT 0,
  assistencias integer NOT NULL DEFAULT 0,
  UNIQUE (jogador_id, competicao_id, temporada_id)
);

-- Admin role mapping for controlled write access from admin panel
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_simulator_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_competicoes_pais ON public.competicoes(pais_id);
CREATE INDEX IF NOT EXISTS idx_times_pais ON public.times(pais_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_time ON public.jogadores(time_id);
CREATE INDEX IF NOT EXISTS idx_partidas_comp_temp ON public.partidas(competicao_id, temporada_id, rodada);
CREATE INDEX IF NOT EXISTS idx_classificacao_comp_temp ON public.classificacao(competicao_id, temporada_id, pontos DESC);
CREATE INDEX IF NOT EXISTS idx_artilharia_comp_temp ON public.artilharia(competicao_id, temporada_id, gols DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.paises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times_competicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artilharia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Grants: public read for anon & authenticated, full access for service_role
GRANT SELECT ON public.paises, public.competicoes, public.temporadas, public.times,
  public.times_competicao, public.jogadores, public.tecnicos, public.partidas,
  public.classificacao, public.artilharia TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.paises, public.competicoes, public.temporadas, public.times,
  public.times_competicao, public.jogadores, public.tecnicos, public.partidas,
  public.classificacao, public.artilharia TO authenticated;

GRANT ALL ON public.paises, public.competicoes, public.temporadas, public.times,
  public.times_competicao, public.jogadores, public.tecnicos, public.partidas,
  public.classificacao, public.artilharia, public.admin_users TO service_role;

-- Public read policies (simulator data is non-sensitive)
CREATE POLICY paises_public_read ON public.paises FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY competicoes_public_read ON public.competicoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY temporadas_public_read ON public.temporadas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY times_public_read ON public.times FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY times_competicao_public_read ON public.times_competicao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY jogadores_public_read ON public.jogadores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tecnicos_public_read ON public.tecnicos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY partidas_public_read ON public.partidas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY classificacao_public_read ON public.classificacao FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY artilharia_public_read ON public.artilharia FOR SELECT TO anon, authenticated USING (true);

-- Admin write policies (service_role bypasses RLS; authenticated users require admin_users entry)
CREATE POLICY paises_admin_write ON public.paises FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY competicoes_admin_write ON public.competicoes FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY temporadas_admin_write ON public.temporadas FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY times_admin_write ON public.times FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY times_competicao_admin_write ON public.times_competicao FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY jogadores_admin_write ON public.jogadores FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY tecnicos_admin_write ON public.tecnicos FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY partidas_admin_write ON public.partidas FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY classificacao_admin_write ON public.classificacao FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY artilharia_admin_write ON public.artilharia FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY admin_users_self_read ON public.admin_users FOR SELECT TO authenticated USING (auth.uid() = user_id);
