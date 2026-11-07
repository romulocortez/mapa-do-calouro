// As fontes do site ficam em fonte/ (perderam-se uma vez numa pasta temporária; nunca mais).
// Este teste garante que montar o beta a partir de fonte/ dá exatamente as páginas que estão no ar:
// quem editar beta/index.html à mão, sem passar por fonte/, vê o teste falhar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ } from "./_regras.mjs";

test("fonte/build.py remonta o beta igualzinho ao que está publicado", () => {
  const tmp = mkdtempSync(join(tmpdir(), "mapa-"));
  execFileSync("python3", [join(RAIZ, "fonte", "build.py"), "beta"], { env: { ...process.env, MAPA_DESTINO: tmp }, stdio: "pipe" });
  const campi = JSON.parse(readFileSync(join(RAIZ, "fonte", "campi.json"), "utf8")).filter(c => c.pasta !== null);
  assert.ok(campi.length >= 2);
  for (const c of campi){
    const montado = readFileSync(join(tmp, c.pasta, "index.html"), "utf8");
    const publicado = readFileSync(join(RAIZ, "beta", c.pasta, "index.html"), "utf8");
    assert.ok(montado === publicado, `beta/${c.pasta}index.html não bate com fonte/: rode python3 fonte/build.py beta`);
  }
});

test("cada campus ativo tem todos os arquivos de dados", () => {
  const campi = JSON.parse(readFileSync(join(RAIZ, "fonte", "campi.json"), "utf8")).filter(c => c.pasta !== null);
  for (const c of campi) for (const n of ["geo", "osm", "named", "indoor", "campus"])
    assert.ok(existsSync(join(RAIZ, "fonte", "campi", c.id, n + ".json")), `falta fonte/campi/${c.id}/${n}.json`);
});
