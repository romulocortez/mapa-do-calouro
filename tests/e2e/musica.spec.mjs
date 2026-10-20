import { test, expect, abrirMapa } from "./_base.mjs";

// Trilha sonora: a 1ª música, depois a 2ª, e as duas em loop para sempre. Botão para silenciar, lembrado no aparelho.
test.skip(process.env.PAGINA !== "/beta/", "trilha sonora ainda só na versão beta");

const estado = page => page.evaluate(() => { const a = window.__musica; return a ? {src: a.src.split("/").pop(), pausada: a.paused} : null; });
const terminar = page => page.evaluate(() => window.__musica.dispatchEvent(new Event("ended")));

test("as duas trilhas tocam em sequência e depois repetem para sempre", async ({ page }) => {
  await abrirMapa(page);   // começa no toque em "Juro solenemente…" (o navegador só deixa tocar depois de um toque)
  expect((await estado(page)).src).toBe("trilha-1.m4a");
  await terminar(page); expect((await estado(page)).src).toBe("trilha-2.m4a");
  await terminar(page); expect((await estado(page)).src).toBe("trilha-1.m4a");
  await terminar(page); expect((await estado(page)).src).toBe("trilha-2.m4a");
});

test("os arquivos das trilhas existem no site", async ({ page, request }) => {
  await page.goto("/");
  for (const n of ["trilha-1.m4a", "trilha-2.m4a"]){
    const r = await request.get(new URL("audio/" + n, page.url()).href);
    expect(r.status(), n).toBe(200);
    expect((await r.body()).length).toBeGreaterThan(100000);
  }
});

test("o botão de som silencia e a escolha é lembrada ao voltar", async ({ page }) => {
  await abrirMapa(page);
  const bt = page.locator("#zsom");
  await expect(bt).toHaveAttribute("aria-pressed", "true");
  await bt.click();
  await expect(bt).toHaveAttribute("aria-pressed", "false");
  expect((await estado(page)).pausada).toBe(true);
  await page.reload(); await page.locator("#openMap").click(); await page.waitForTimeout(500);
  await expect(page.locator("#zsom")).toHaveAttribute("aria-pressed", "false");
  expect((await estado(page)).pausada).toBe(true);
});
