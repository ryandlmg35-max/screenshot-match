-- Football Manager Depth Upgrade Migration
-- Adds detailed player attributes, morale/fitness, injuries, suspensions, contracts,
-- club tactics/budget/titles/rivalries, match weather/narration, and transfer/history tables.

-- 1. Expandir tabela jogadores
ALTER TABLE public.jogadores
  ADD COLUMN IF NOT EXISTS finalizacao integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS passe integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS drible integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS velocidade integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS forca_fisica integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS marcacao integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS visao_jogo integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS posicionamento integer NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS reflexos integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS forma_fisica integer NOT NULL DEFAULT 92 CHECK (forma_fisica BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS moral integer NOT NULL DEFAULT 75 CHECK (moral BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS amarelos_acumulados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vermelhos_temporada integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspenso_jogos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lesionado_jogos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lesao_descricao text,
  ADD COLUMN IF NOT EXISTS salario_semanal integer NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS valor_mercado integer NOT NULL DEFAULT 1500000,
  ADD COLUMN IF NOT EXISTS contrato_fim_ano integer NOT NULL DEFAULT 2028;

-- 2. Expandir tabela times
ALTER TABLE public.times
  ADD COLUMN IF NOT EXISTS estilo_tatico text NOT NULL DEFAULT 'posse'
    CHECK (estilo_tatico IN ('posse', 'contra-ataque', 'pressao-alta', 'retranca')),
  ADD COLUMN IF NOT EXISTS moral_elenco integer NOT NULL DEFAULT 75 CHECK (moral_elenco BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS home_bonus numeric(4,2) NOT NULL DEFAULT 2.80,
  ADD COLUMN IF NOT EXISTS orcamento integer NOT NULL DEFAULT 20000000,
  ADD COLUMN IF NOT EXISTS titulos_historicos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Expandir tabela partidas
ALTER TABLE public.partidas
  ADD COLUMN IF NOT EXISTS clima text DEFAULT 'Ensolarado',
  ADD COLUMN IF NOT EXISTS gramado text DEFAULT 'Bom',
  ADD COLUMN IF NOT EXISTS classico boolean NOT NULL DEFAULT false;

-- 4. Histórico de estatísticas de jogador por temporada
CREATE TABLE IF NOT EXISTS public.historico_jogador_temporada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_id text NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  time_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  competicao_id text NOT NULL REFERENCES public.competicoes(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  jogos integer NOT NULL DEFAULT 0,
  gols integer NOT NULL DEFAULT 0,
  assistencias integer NOT NULL DEFAULT 0,
  amarelos integer NOT NULL DEFAULT 0,
  vermelhos integer NOT NULL DEFAULT 0,
  nota_media numeric(3,1) NOT NULL DEFAULT 6.5
);

-- 5. Histórico de lesões e cartões (timeline do jogador)
CREATE TABLE IF NOT EXISTS public.lesoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_id text NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('lesao', 'suspensao_amarelo', 'suspensao_vermelho')),
  descricao text NOT NULL,
  jogos_fora integer NOT NULL DEFAULT 1,
  data_ocorrencia timestamptz NOT NULL DEFAULT now()
);

-- 6. Registro de transferências
CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_id text NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  time_origem_id text REFERENCES public.times(id) ON DELETE SET NULL,
  time_destino_id text NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
  valor integer NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('compra', 'livre', 'base')),
  temporada_ano integer NOT NULL,
  data_transferencia timestamptz NOT NULL DEFAULT now()
);

-- RLS e permissões
ALTER TABLE public.historico_jogador_temporada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.historico_jogador_temporada, public.lesoes_historico, public.transferencias TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.historico_jogador_temporada, public.lesoes_historico, public.transferencias TO authenticated;
GRANT ALL ON public.historico_jogador_temporada, public.lesoes_historico, public.transferencias TO service_role;

CREATE POLICY hist_jog_public_read ON public.historico_jogador_temporada FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY lesoes_public_read ON public.lesoes_historico FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY transf_public_read ON public.transferencias FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY hist_jog_admin_write ON public.historico_jogador_temporada FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY lesoes_admin_write ON public.lesoes_historico FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
CREATE POLICY transf_admin_write ON public.transferencias FOR ALL TO authenticated USING (public.is_simulator_admin()) WITH CHECK (public.is_simulator_admin());
