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

- Migration SQL: [`supabase/migrations/20261115180000_football_simulator.sql`](supabase/migrations/20261115180000_football_simulator.sql)
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
