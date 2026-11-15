# Futebol Manager Simulator

Simulador de futebol estilo **Football Manager de texto**, construído com React 19, TypeScript, TanStack Start, Tailwind CSS e Supabase. Inclui motor de simulação baseado em **distribuição de Poisson**, overall médio do elenco titular, fator casa e Elo Rating, gerando súmulas completas, artilharia, assistências, tabela de classificação e chaveamento visual de mata-mata.

---

## Como rodar localmente

```sh
bun install
bun run dev
```

### Testes e Build

```sh
bun run test
bun run build
```

### Banco de Dados (Supabase)

O schema completo do simulador (com RLS ativado, leitura pública e escrita restrita a admin/`service_role`) está em:

- Migration SQL (Base): [`supabase/migrations/20261115180000_football_simulator.sql`](supabase/migrations/20261115180000_football_simulator.sql)
- Migration SQL (Profundidade FM): [`supabase/migrations/20261115190000_fm_depth_upgrade.sql`](supabase/migrations/20261115190000_fm_depth_upgrade.sql)
- Seed SQL (8 países, 20 competições, 289 clubes, 4.646 jogadores): [`supabase/seed.sql`](supabase/seed.sql)
- Gerador de seed: [`scripts/generate-seed-sql.ts`](scripts/generate-seed-sql.ts) (`bun run scripts/generate-seed-sql.ts`)
- Edge Function de simulação: [`supabase/functions/simulate-match/index.ts`](supabase/functions/simulate-match/index.ts)

> **Modo Local Automático:** Caso o banco remoto ainda não tenha as tabelas do simulador aplicadas, o app inicializa automaticamente em memória usando o mesmo dataset real do seed, permitindo simular rodadas, temporadas, consultar elencos e usar o Painel Admin imediatamente.

---

## Fórmula de Overall Estimado

Implementada em [`src/lib/overall-formula.ts`](src/lib/overall-formula.ts):

- **Base por reputação (1 a 5):** `1 → 62`, `2 → 68`, `3 → 74`, `4 → 80`, `5 → 86`
- **Modificador do clube (Elo):** `(clubeElo - 1500) / 70` (limitado entre `-4` e `+6`)
- **Curva de idade:** pico de `+2` entre 24–29 anos (ou 25–32 para GOL/ZAG), `-2` para sub-20 ou veteranos acima de 33/35
- **Ajuste posicional:** `+1` para atacantes/meias/pontas de reputação 4 ou 5
- **Resultado final:** limitado entre `50` e `95`

---

## Progresso dos Dados (Clubes, Técnicos, Logos e Elencos)

Todas as **20 competições** possuem seus clubes reais, siglas, cidades, estádios, URLs de escudo (Wikimedia Commons com fallback SVG) e técnicos cadastrados. Abaixo está o status detalhado dos **elencos**:

### 1ªs Divisões & Clubes Continentais (Elencos Reais Curados)

| País / Âmbito | Competição | Clubes | Status do Elenco |
| :--- | :--- | :---: | :--- |
| 🇧🇷 Brasil | Brasileirão Série A (2026) | 20 | ✅ Completo (jogadores reais + fórmula de OVR) |
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra | Premier League (2026/27) | 20 | ✅ Completo (jogadores reais + fórmula de OVR) |
| 🇪🇸 Espanha | La Liga (2026/27) | 20 | ✅ Completo (jogadores reais + fórmula de OVR) |
| 🇮🇹 Itália | Serie A (2026/27) | 20 | ✅ Completo (jogadores reais + fórmula de OVR) |
| 🇩🇪 Alemanha | Bundesliga (2026/27) | 18 | 🟡 Parcial (Bayern, Leverkusen e Dortmund curados; demais com base gerada) |
| 🇫🇷 França | Ligue 1 (2026/27) | 18 | 🟡 Parcial (PSG curado; demais com base gerada) |
| 🇵🇹 Portugal | Primeira Liga (2026/27) | 18 | 🟡 Parcial (Sporting, Benfica e Porto curados; demais com base gerada) |
| 🌎 Continental | Libertadores / Sul-Americana / Mundial | 15 convidados | 🟡 Parcial (River, Boca, Al-Hilal e Inter Miami curados; demais com base gerada) |

### 2ªs Divisões & Copas (Base de Clubes Completa, Elencos Reais Pendentes)

| País | Competição | Clubes | Status do Elenco |
| :--- | :--- | :---: | :--- |
| 🇧🇷 Brasil | Brasileirão Série B (2026) | 20 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇧🇷 Brasil | Copa do Brasil (2026) | 32 | ✅ Utiliza os elencos dos clubes das Séries A e B |
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra | EFL Championship (2026/27) | 24 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇪🇸 Espanha | La Liga 2 / Segunda División (2026/27) | 22 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇮🇹 Itália | Serie B (2026/27) | 20 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇩🇪 Alemanha | 2. Bundesliga (2026/27) | 18 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇫🇷 França | Ligue 2 (2026/27) | 18 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🇵🇹 Portugal | Liga Portugal 2 (2026/27) | 18 | ⏳ Clubes/estádios/logos/técnicos reais; elenco gerado automaticamente (18 jog.) |
| 🌍 Europa | UEFA Champions League / Europa League | — | ✅ Utiliza os clubes reais classificados das ligas europeias |

### Atualizações Futuras (Transferências e Novos Elencos)

Use a aba **Painel Admin** diretamente na interface para adicionar jogadores, editar overalls, alterar técnicos ou realizar transferências entre clubes, e clique em **Exportar SQL do Clube** para gerar os comandos incrementais para o Supabase.

---

## Sistemas Avançados (Profundidade Football Manager)

A camada de profundidade implementada em [`src/data/club-metadata.ts`](src/data/club-metadata.ts), [`src/lib/simulation-engine.ts`](src/lib/simulation-engine.ts) e [`src/lib/season-lifecycle.ts`](src/lib/season-lifecycle.ts) adiciona:

1. **Atributos Detalhados, Forma Física, Moral e Contratos**
   - Cada jogador possui `finalizacao`, `passe`, `drible`, `velocidade`, `forca_fisica`, `marcacao`, `visao_jogo`, `posicionamento` e `reflexos`, exibidos em um **gráfico radar** na ficha do jogador ([`PlayerDetailModal.tsx`](src/components/simulator/PlayerDetailModal.tsx)).
   - `forma_fisica` (0–100) e `moral` (0–100) oscilam após cada partida e impactam diretamente o desempenho em campo.
   - Contratos (`salario_semanal`, `valor_mercado`, `contrato_fim_ano`) permitem contratações pagas ou em passe livre ao fim do vínculo.

2. **Lesões, Cartões, Evolução e Aposentadoria**
   - **Suspensões automáticas:** 3 cartões amarelos acumulados ou 1 cartão vermelho suspendem o atleta para a partida seguinte.
   - **Lesões:** risco proporcional à idade e baixa forma física, com tempo de recuperação em partidas.
   - **Ciclo de carreira:** jovens sub-21 evoluem ao virar a temporada, veteranos (34+) perdem ritmo gradualmente e jogadores acima de 37–38 anos se aposentam, dando lugar a promessas da base.

3. **Táticas, Moral do Elenco, Rivalidades (Clássicos) e Títulos**
   - Clubes possuem estilo tático (`posse`, `contra-ataque`, `pressao-alta`, `retranca`), `home_bonus` variável por estádio/torcida, `orcamento`, `moral_elenco`, sequência recente (`forma_recente`) e sala de troféus (`titulos_historicos`).
   - **Clássicos** reais (ex.: Fla-Flu, Flamengo x Vasco, El Clásico, Derby della Madonnina) recebem maior imprevisibilidade na simulação e histórico de confrontos diretos na ficha do clube.

4. **Simulação Minuto a Minuto, Narração e Modo Ao Vivo**
   - Partidas geram eventos cronológicos com narração automática em português (gols, assistências, cartões, defesas de goleiro, substituições e lesões), clima, condição do gramado e Melhor em Campo (MVP).
   - O modal de partida ([`MatchDetailModal.tsx`](src/components/simulator/MatchDetailModal.tsx)) oferece **Replay Ao Vivo** (1x / 4x / pausar) com microanimações de gol e efeitos sonoros leves via Web Audio API.

5. **Calendário Real, Acesso/Rebaixamento, Vagas Continentais e Mercado**
   - Calendários seguem as datas de abertura reais de cada competição (Brasil em abril, Libertadores em fevereiro, Europa em agosto/setembro).
   - Ao clicar em **Avançar para o próximo ano**, o motor executa acesso/rebaixamento automático entre 1ª e 2ª divisões de cada país, atualiza classificados para Libertadores/Sul-Americana/Champions/Europa League, realiza sorteios com cabeças de chave por Elo e roda a janela de transferências.
   - A aba **Mercado** ([`TransferMarketTab.tsx`](src/components/simulator/TransferMarketTab.tsx)) permite contratações manuais ou simulação automática pela IA, e o painel **Destaques da Temporada** ([`SeasonHighlights.tsx`](src/components/simulator/SeasonHighlights.tsx)) exibe Líder, Lanterna, Artilheiro, Destaque e Zebra da Rodada.
