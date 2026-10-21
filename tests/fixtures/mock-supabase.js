// Supabase de mentira para os testes de navegador: registra cada chamada em window.__supaChamadas.
// Dados inventados (regra 15). O código 123456 é o único aceito.
(() => {
  window.__SUPA_TESTE__ = { url: "https://teste.supabase.co", anonKey: "chave-publica-de-teste", versaoTermo: "2026-10-21" };
  const ch = window.__supaChamadas = [];
  let sessao = null;
  const tabela = nome => {
    const api = {
      select(){ ch.push(["select", nome]); return api; }, eq(){ return api; },
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async v => { ch.push(["upsert", nome, v]); return { error: null }; },
    };
    return api;
  };
  window.__SUPA_MOCK__ = {
    createClient: (url, chave) => {
      ch.push(["createClient", url, chave]);
      return {
        auth: {
          getSession: async () => ({ data: { session: sessao } }),
          signInWithOtp: async a => { ch.push(["otp", a]); return { error: null }; },
          verifyOtp: async a => {
            ch.push(["verify", a]);
            if (a.token !== "123456") return { data: {}, error: { message: "código inválido" } };
            sessao = { user: { id: "00000000-0000-4000-8000-000000000001", email: a.email } };
            return { data: { session: sessao }, error: null };
          },
          signOut: async () => { ch.push(["signOut"]); sessao = null; return { error: null }; },
        },
        from: tabela,
        rpc: async n => { ch.push(["rpc", n]); return { error: null }; },
        storage: { from: b => ({
          list: async p => { ch.push(["list", b, p]); return { data: [{ name: "foto-teste.jpg" }] }; },
          remove: async a => { ch.push(["remove", b, a]); return { error: null }; },
        }) },
      };
    },
  };
})();
