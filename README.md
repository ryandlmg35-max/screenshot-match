# Base Web

Base mínima: React 19, TypeScript, Vite, Tailwind e TanStack Start (estrutura nativa do Lovable, mantida em vez de converter para uma SPA). Banco e autenticação por email/senha no Lovable Cloud. Sem dados simulados, telas elaboradas ou formulário de perfil.

## Rodar localmente

```sh
bun install
cp .env.example .env.local
bun run dev
```

Preencha `VITE_SUPABASE_URL` e a chave **pública** em `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` (mesmo valor). A integração nativa usa o nome moderno PUBLISHABLE_KEY; `src/lib/supabase.ts` reexporta esse único cliente, sem criar uma segunda sessão. Encontre URL e chave pública na configuração/conexão do Lovable Cloud. Não use service_role no frontend e não versione arquivos com credenciais.

A página `/` testa Auth e a Data API via função do servidor: também configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no ambiente do servidor local, com os valores correspondentes à mesma conexão. No Lovable esses valores são fornecidos automaticamente. Só variáveis VITE são expostas ao navegador.

```sh
bun run test
bun run build
```

## Páginas

- `/`: título, indicador real de conexão e acesso ao login.
- `/login`: cadastro, login e logout com email/senha. A confirmação por email permanece ativa: cadastro bem-sucedido sem sessão não significa login concluído. A entrega do email depende do serviço de envio.

## Banco

Única tabela de aplicação: `public.profiles`.

| Coluna | Definição |
| --- | --- |
| id | UUID, chave primária, gerada por gen_random_uuid() |
| user_id | UUID único, obrigatório; referencia auth.users(id), ON DELETE CASCADE |
| email | Texto obrigatório |
| nome | Texto opcional, não coletado pelas telas mínimas |
| created_at | Data/hora, now() |
| updated_at | Data/hora, now(); atualizada automaticamente |

A restrição UNIQUE em user_id cria o índice do relacionamento. `on_auth_user_created` cria profiles automaticamente após o cadastro de uma conta; `profiles_updated_at` atualiza updated_at. O nome permanece vazio conforme a opção de não coletar dados adicionais. Email é o valor no momento do cadastro; alterações posteriores de email em Auth não são sincronizadas automaticamente.

### Policies e privilégios

RLS ativo, somente para authenticated:

- `profiles_select_own`: SELECT com auth.uid() = user_id.
- `profiles_insert_own`: INSERT com a mesma condição em WITH CHECK.
- `profiles_update_own`: UPDATE com a mesma condição em USING e WITH CHECK, impedindo transferir propriedade.
- `profiles_delete_own`: DELETE com auth.uid() = user_id.

authenticated recebe SELECT/INSERT/UPDATE/DELETE; service_role recebe ALL somente para ferramentas privilegiadas; anon não recebe acesso à tabela. Não há clientes ou pedidos: eram exemplos no documento.

## Migrations e tipos

Migrations canônicas aplicadas pela integração estão em `drizzle/migrations`. `supabase/migrations` contém cópias SQL idênticas para recriar a estrutura em outro projeto. **Não aplique os dois conjuntos no mesmo banco**. Uma cópia não é uma segunda migration aplicada.

Para recriar em outro projeto com ferramentas de migration compatíveis, aplique os SQL de `supabase/migrations` em ordem em um banco que tenha Auth configurado. Autenticação por email, confirmação e URLs de redirecionamento são configurações do serviço, não parte do SQL: configure-as separadamente.

`src/types/database.ts` exporta os tipos do schema gerados em `src/integrations/supabase/types.ts`. Regere pela integração após mudar o banco, sem editar o arquivo gerado.

## Novo frontend usando o mesmo banco

Não recrie tabelas nem usuários. Use a mesma URL e chave pública, instale `@supabase/supabase-js` e importe Database. Neste projeto importe o cliente de `src/lib/supabase.ts`. Em um frontend Vite independente:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';
const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Leve o arquivo de tipos gerado junto (ou ajuste a reexportação). A chave é pública; a proteção vem das policies. Nunca leve `client.server.ts` nem chaves privilegiadas ao frontend. Cadastre o domínio e URLs locais do novo frontend em More → Users → Auth settings → Advanced para links de confirmação. Use emailRedirectTo igual à origem pública do frontend. Leia somente os próprios registros com `supabase.from('profiles').select('*')`; RLS restringe os resultados.

Dados de aplicação são salvos somente no banco. O cliente de autenticação nativo persiste **a sessão** no armazenamento gerenciado do preview / navegador; isso não é usado como banco de dados. O requisito de não usar localStorage foi interpretado como não salvar dados de aplicação nele, preservando a integração nativa.

## GitHub

O código está preparado para sincronização, mas a conexão e seu status não podem ser confirmados pelo agente. Abra **Configurações do projeto → Git → GitHub** e conecte sua conta: o Lovable cria um novo repositório privado. Depois clone usando a URL exibida ali. Não é possível conectar um repositório já existente pela sincronização nativa. Alterações na branch sincronizada retornam ao Lovable; migrations não são aplicadas automaticamente por um push.
