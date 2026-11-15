import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [
    { title: 'Login e cadastro | Base Web' },
    { name: 'description', content: 'Entre ou cadastre uma conta na Base Web com email e senha.' },
    { property: 'og:title', content: 'Login e cadastro | Base Web' },
    { property: 'og:description', content: 'Autenticação por email e senha da Base Web.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Login,
});
function Login() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setMessage(data.session ? 'Cadastro concluído. Você está conectado.' : 'Confira seu email para confirmar o cadastro antes de entrar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setMessage('Login realizado com sucesso.');
      }
      setPassword('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setMessage('');
    try {
      await queryClient.cancelQueries(); queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await navigate({ to: '/login', replace: true });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível sair.'); }
    finally { setBusy(false); }
  }
  return <main className="base-page">
    <h1>{user ? 'Minha sessão' : signup ? 'Cadastro' : 'Login'}</h1>
    {loading ? <p role="status">Verificando sessão…</p> : user ? <>
      <p className="base-status">Conectado como {user.email}</p>
      <Button disabled={busy} onClick={() => void logout()}>Sair</Button>
    </> : <form className="base-form" onSubmit={submit}>
      <label className="base-field" htmlFor="email">Email<Input id="email" type="email" autoComplete="email" value={email} required onChange={e => setEmail(e.target.value)} /></label>
      <label className="base-field" htmlFor="password">Senha<Input id="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} required onChange={e => setPassword(e.target.value)} /></label>
      <Button type="submit" disabled={busy}>{busy ? 'Aguarde…' : signup ? 'Cadastrar' : 'Entrar'}</Button>
      <Button type="button" variant="link" disabled={busy} onClick={() => { setSignup(!signup); setMessage(''); }}>{signup ? 'Já tenho conta' : 'Criar conta'}</Button>
    </form>}
    {message && <p role="status" className="base-status">{message}</p>}
    <div className="base-actions"><Button asChild variant="outline"><Link to="/">Início</Link></Button></div>
  </main>;
}
