import { describe, it, expect } from 'vitest';

// Opt-in: creates isolated real Auth accounts and always removes them.
// Run: RUN_BACKEND_TESTS=1 bunx vitest run src/test/backend.integration.test.ts
const enabled = process.env['RUN_BACKEND_TESTS'] === '1';
describe.skipIf(!enabled)('Live backend ownership rules', () => {
  it('auto-creates profiles and enforces SELECT, INSERT, UPDATE and DELETE ownership', async () => {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const admin = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key || !admin) throw new Error('Backend test environment missing');
    const ids: string[] = [];
    const request = async (path: string, token: string, method = 'GET', body?: unknown, privileged = false) => {
      const headers: Record<string, string> = { apikey: privileged ? admin : key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      if (!token.startsWith('sb_')) headers['Authorization'] = `Bearer ${token}`;
      return fetch(url + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    };
    try {
      const accounts: { id: string; token: string; email: string }[] = [];
      for (let i = 0; i < 2; i++) {
        const email = `backend-check-${crypto.randomUUID()}@example.com`;
        const password = `${crypto.randomUUID()}Aa9!`;
        const created = await request('/auth/v1/admin/users', admin, 'POST', { email, password, email_confirm: true }, true);
        expect(created.status).toBe(200);
        const user = await created.json(); ids.push(user.id);
        const login = await request('/auth/v1/token?grant_type=password', key, 'POST', { email, password });
        expect(login.status).toBe(200);
        const session = await login.json();
        accounts.push({ id: user.id, token: session.access_token, email });
      }
      const [a, b] = accounts;
      if (!a || !b) throw new Error('Test accounts missing');
      const own = await (await request('/rest/v1/profiles?select=*', a.token)).json();
      expect(own).toHaveLength(1);
      expect(own[0].user_id).toBe(a.id);
      expect(own[0].email).toBe(a.email);
      expect(own[0].nome).toBeNull();
      expect(await (await request(`/rest/v1/profiles?user_id=eq.${b.id}`, a.token)).json()).toEqual([]);
      const foreignInsert = await request('/rest/v1/profiles', a.token, 'POST', { user_id: b.id, email: b.email });
      expect(foreignInsert.status).toBe(403);
      expect((await foreignInsert.json()).code).toBe('42501');
      const update = await request(`/rest/v1/profiles?user_id=eq.${a.id}`, a.token, 'PATCH', { nome: 'Ownership test' });
      const updated = await update.json();
      expect(updated[0].nome).toBe('Ownership test');
      expect(Date.parse(updated[0].updated_at)).toBeGreaterThan(Date.parse(own[0].updated_at));
      const transfer = await request(`/rest/v1/profiles?user_id=eq.${a.id}`, a.token, 'PATCH', { user_id: crypto.randomUUID() });
      expect(transfer.status).toBe(403);
      const foreignUpdate = await request(`/rest/v1/profiles?user_id=eq.${b.id}`, a.token, 'PATCH', { nome: 'Forbidden' });
      expect(await foreignUpdate.json()).toEqual([]);
      const foreignDelete = await request(`/rest/v1/profiles?user_id=eq.${b.id}`, a.token, 'DELETE');
      expect(await foreignDelete.json()).toEqual([]);
      const ownDelete = await request(`/rest/v1/profiles?user_id=eq.${a.id}`, a.token, 'DELETE');
      expect((await ownDelete.json())[0].user_id).toBe(a.id);
      const ownInsert = await request('/rest/v1/profiles', a.token, 'POST', { user_id: a.id, email: a.email });
      expect(ownInsert.status).toBe(201);
    } finally {
      for (const id of ids) {
        const removed = await request(`/auth/v1/admin/users/${id}`, admin, 'DELETE', undefined, true);
        if (!removed.ok) throw new Error('Test account cleanup failed');
      }
    }
  }, 60_000);
});
