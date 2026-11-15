import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { checkConnection } from '@/lib/connection.functions';
import { useAuth } from '@/lib/auth-context';

const connectionQuery = queryOptions({ queryKey: ['connection'], queryFn: () => checkConnection(), staleTime: 30_000 });
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Base Web | Conexão' },
    { name: 'description', content: 'Validação da conexão e autenticação da Base Web.' },
    { property: 'og:title', content: 'Base Web | Conexão' },
    { property: 'og:description', content: 'Validação da conexão e autenticação da Base Web.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(connectionQuery),
  component: Index,
});
function Index() {
  const { data, refetch, isFetching } = useSuspenseQuery(connectionQuery);
  const { user, loading } = useAuth();
  return <main className="base-page">
    <h1>Base Web</h1>
    <p role="status" className="base-status">{data.connected ? 'Conectado ao backend ✅' : 'Conectado ao backend ❌'}</p>
    {user && <p className="base-status">Conectado como {user.email}</p>}
    <div className="base-actions">
      <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? 'Verificando…' : 'Testar conexão'}</Button>
      <Button asChild disabled={loading}><Link to="/login">{user ? 'Minha sessão' : 'Login / Cadastro'}</Link></Button>
    </div>
  </main>;
}
