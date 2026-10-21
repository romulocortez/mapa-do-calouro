import { test, expect, abrirMapa, FIXTURES } from "./_base.mjs";

// Login só quando precisa (Supabase). Só na beta por enquanto.
test.skip(process.env.PAGINA !== "/beta/", "login ainda só na versão beta");

const chamadas = page => page.evaluate(() => window.__supaChamadas || []);
async function aparecer(page){
  await page.locator("#tab-eu").click();
  await page.locator("#f-name").fill("Teste Calouro");
  await page.locator("#goVisible").click();
}

test("sem o Supabase configurado, nada muda: aparecer no mapa não pede login", async ({ page }) => {
  await abrirMapa(page);
  await aparecer(page);
  await expect(page.locator("#contaDlg")).toBeHidden();
  await expect(page.locator("#goHide")).toBeVisible();
});

test("o mapa e a busca não pedem login; só a ação social abre o termo", async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-supabase.js" });
  await abrirMapa(page);
  await expect(page.locator("#contaDlg")).toBeHidden();
  expect((await chamadas(page)).length, "nenhuma chamada ao Supabase só por abrir o mapa").toBe(0);
  await aparecer(page);
  await expect(page.locator("#contaDlg")).toBeVisible();
  await expect(page.locator("#contaPasso")).toContainText("Não guardamos");
  await page.locator("#contaPasso .linkbtn").first().click();
  await expect(page.locator(".termo-completo")).toContainText("LGPD");
});

test("quem tem menos de 18 anos não cria conta, e o mapa continua livre", async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-supabase.js" });
  await abrirMapa(page);
  await aparecer(page);
  await page.locator('input[name="idade"][value="menor"]').check();
  await page.locator("#termoContinuar").click();
  await expect(page.locator("#contaPasso")).toContainText("maiores de 18");
  await page.locator("#contaPasso button", { hasText: "Entendi" }).click();
  await expect(page.locator("#contaDlg")).toBeHidden();
  expect((await chamadas(page)).filter(c => c[0] === "otp")).toHaveLength(0);
  await expect(page.locator("#goHide")).toBeHidden();
});

test("entrar: termo → e-mail @ufpi.edu.br → código; o aceite é gravado e a ação continua", async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-supabase.js" });
  await abrirMapa(page);
  await aparecer(page);
  await page.locator('input[name="idade"][value="18"]').check();
  await page.locator("#termoContinuar").click();
  await expect(page.locator("#contaPasso .erro")).toContainText("aceitar o termo");
  await page.locator("#termoOk").check();
  await page.locator("#termoContinuar").click();
  await page.locator("#contaEmail").fill("aluno.teste@gmail.com");
  await page.locator("#contaEnviar").click();
  await expect(page.locator("#contaPasso .erro")).toContainText("@ufpi.edu.br");
  await page.locator("#contaEmail").fill("aluno.teste@ufpi.edu.br");
  await page.locator("#contaEnviar").click();
  await page.locator("#contaCodigo").fill("000000");
  await page.locator("#contaEntrar").click();
  await expect(page.locator("#contaPasso .erro")).toContainText("Código inválido");
  await page.locator("#contaCodigo").fill("123456");
  await page.locator("#contaEntrar").click();
  await expect(page.locator("#contaDlg")).toBeHidden();
  const c = await chamadas(page);
  expect(c.find(x => x[0] === "otp")[1]).toEqual({ email: "aluno.teste@ufpi.edu.br", options: { shouldCreateUser: true } });
  expect(c.find(x => x[0] === "upsert")).toEqual(["upsert", "consentimentos", { versao: "2026-10-21", adulto: true }]);
  await expect(page.locator("#goHide")).toBeVisible();                      // a ação pedida continuou sozinha
  await expect(page.locator("#contaSt")).toContainText("aluno.teste@ufpi.edu.br");
});

test("apagar meus dados: pede confirmação, apaga as fotos, a conta e sai", async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-supabase.js" });
  await abrirMapa(page);
  await page.locator("#tab-eu").click();
  await page.locator("#contaAcoes button", { hasText: "Entrar" }).click();
  await page.locator('input[name="idade"][value="18"]').check(); await page.locator("#termoOk").check();
  await page.locator("#termoContinuar").click();
  await page.locator("#contaEmail").fill("aluna.teste@ufpi.edu.br"); await page.locator("#contaEnviar").click();
  await page.locator("#contaCodigo").fill("123456"); await page.locator("#contaEntrar").click();
  await page.locator("#contaApagar").click();
  expect((await chamadas(page)).filter(c => c[0] === "rpc")).toHaveLength(0);   // primeiro toque só arma
  await page.locator("#contaApagar").click();
  await expect(page.locator("#contaSt")).toContainText("funciona sem conta");
  const c = await chamadas(page);
  expect(c.find(x => x[0] === "remove")).toEqual(["remove", "contribuicoes", ["00000000-0000-4000-8000-000000000001/foto-teste.jpg"]]);
  expect(c.some(x => x[0] === "rpc" && x[1] === "apagar_minha_conta")).toBe(true);
  expect(c.some(x => x[0] === "signOut")).toBe(true);
});

test("a biblioteca do Supabase vem do próprio site e só carrega quando a pessoa pede o código", async ({ page }) => {
  await page.addInitScript(() => { window.__SUPA_TESTE__ = { url: "https://teste.supabase.co", anonKey: "chave-publica-de-teste", versaoTermo: "2026-10-21" }; });
  const pedidos = [];
  await page.route("https://teste.supabase.co/**", r => { pedidos.push(r.request().method() + " " + new URL(r.request().url()).pathname); r.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  const scripts = []; page.on("request", r => { if (r.resourceType() === "script") scripts.push(r.url()); });
  await abrirMapa(page);
  expect(scripts.some(u => u.includes("supabase"))).toBe(false);
  await page.locator("#tab-eu").click();
  await page.locator("#contaAcoes button", { hasText: "Entrar" }).click();
  await page.locator('input[name="idade"][value="18"]').check(); await page.locator("#termoOk").check();
  await page.locator("#termoContinuar").click();
  await page.locator("#contaEmail").fill("aluno.teste@ufpi.edu.br"); await page.locator("#contaEnviar").click();
  await expect(page.locator("#contaCodigo")).toBeVisible();
  expect(scripts.some(u => /\/vendor\/supabase-js-2\.117\.2\.js$/.test(u))).toBe(true);
  expect(pedidos).toContain("POST /auth/v1/otp");
});
