// Acessibilidade (Lei Brasileira de Inclusão, art. 63): auditoria automática com o axe nas telas principais.
// Falha com problemas de nível "grave" ou "crítico" (WCAG 2.1 A e AA).
// Exceção registrada: "meta-viewport". O zoom de pinça da página foi desligado de propósito (V29, a pedido do
// coordenador) para a pinça aproximar o mapa; a alternativa acessível (aumentar o texto dentro do app) está nas
// pendências do docs/CHECKLIST-SEGURANCA-LGPD.md.
import AxeBuilder from "@axe-core/playwright";
import { test, expect, abrirMapa } from "./_base.mjs";
test.skip(process.env.PAGINA !== "/beta/", "correções de acessibilidade ainda só na versão beta (V37)");

const auditar = async (page, onde, todos) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).disableRules(["meta-viewport"]).analyze();
  const graves = r.violations.filter(v => ["serious", "critical"].includes(v.impact));
  const resumo = graves.map(v => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 4).map(n => n.target.join(" ")).join(", ")}${v.nodes.length > 4 ? ` e mais ${v.nodes.length - 4}` : ""}`);
  if (process.env.AXE_TUDO) console.log(onde, JSON.stringify(r.violations.map(v => [v.id, v.impact, v.nodes.length, v.nodes.slice(0,6).map(n => n.target.join(" "))]), null, 1));
  if (process.env.AXE_COR) for (const v of r.violations.filter(v => v.id === 'color-contrast')) for (const n of v.nodes) console.log('COR', onde, n.target.join(' '), JSON.stringify(n.any[0] && n.any[0].data));
  if (todos) todos.push(...resumo.map(t => `${onde}: ${t}`));
  else expect(resumo, `problemas de acessibilidade em: ${onde}`).toEqual([]);
};

test("capa sem problemas graves de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(600);
  await auditar(page, "capa");
});

test("mapa e abas sem problemas graves de acessibilidade", async ({ page }) => {
  await abrirMapa(page);
  const todos = [];
  await auditar(page, "mapa", todos);
  for (const aba of ["eu", "ajuda", "pass", "gente", "lugares", "report"]){
    const b = page.locator(`#tab-${aba}`);
    if (await b.count() && await b.isVisible()){ await b.click(); await page.waitForTimeout(400); await auditar(page, `aba ${aba}`, todos); }
  }
  expect(todos, "problemas de acessibilidade").toEqual([]);
});

test.describe("modo escuro", () => {
  test.use({ colorScheme: "dark" });
  test("abas sem problemas graves de acessibilidade no modo escuro", async ({ page }) => {
    await abrirMapa(page);
    const todos = [];
    for (const aba of ["eu", "ajuda", "pass", "gente", "lugares", "report"]){
      const b = page.locator(`#tab-${aba}`);
      if (await b.count() && await b.isVisible()){ await b.click(); await page.waitForTimeout(400); await auditar(page, `escuro, aba ${aba}`, todos); }
    }
    expect(todos, "problemas de acessibilidade no modo escuro").toEqual([]);
  });
});
