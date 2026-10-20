// Lê o bloco <regras-xp> direto do index.html publicado e devolve as funções para os testes.
// Assim o teste confere exatamente o código que vai para o ar, sem cópia.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
// PAGINA=/beta/ lê a versão beta; o padrão é o index.html principal
export const ARQUIVO = (process.env.PAGINA || "/").replace(/^\//, "") + "index.html";
export const HTML = readFileSync(RAIZ + ARQUIVO, "utf8");

const ini = HTML.indexOf("/* <regras-xp>"), fim = HTML.indexOf("/* </regras-xp> */");
if (ini < 0 || fim < 0) throw new Error("Bloco <regras-xp> não encontrado no index.html");
const codigo = HTML.slice(ini, fim);
// roda o bloco dentro de uma função (escopo isolado), no mesmo "mundo" de objetos dos testes
const exporta = "\nreturn {REGRAS, TITLES, titleFor, calcularXP, CONTRIB_XP, dadosPessoaisNoTexto, podarConversas, diaDe, monthKey};";
export const R = vm.runInThisContext("(function(){\n" + codigo + exporta + "\n})")();

// Horário de Teresina (UTC−3) para escrever os cenários de forma legível
export const em = (ano, mes, dia, hora = 12, min = 0) => Date.UTC(ano, mes - 1, dia, hora + 3, min);
export const H = 3600e3;

// Monta o "banco" de um cenário: cada ajuda vira pedido resolvido + oferta + confirmação, como no app
export function cenario(){
  const confirm = new Map(), pedidos = new Map(), ajudando = new Map();
  const mod = { suspensos: {}, ocultos: {}, contrib: {} };
  let n = 0;
  const api = {
    confirm, pedidos, ajudando, mod,
    ajuda(quemAjudou, quemPediu, quando, { util = false, status = "resolvido", ofertaEm = quando - 10*60e3, semOferta = false } = {}){
      const id = "p" + (++n);
      (pedidos.get(quemPediu) || pedidos.set(quemPediu, {}).get(quemPediu))[id] = { status, texto: "dúvida", atualizado: quando };
      if (!semOferta) (ajudando.get(quemAjudou) || ajudando.set(quemAjudou, {}).get(quemAjudou))[quemPediu + ":" + id] = { at: ofertaEm, msgs: [] };
      const doc = confirm.get(quemPediu) || confirm.set(quemPediu, { itens: {} }).get(quemPediu);
      doc.itens[id] = { helper: quemAjudou, util: util ? true : null, at: quando };
      return id;
    },
    contrib(quem, id, { ok = true, novo = false, foto = false, quando = em(2026, 3, 10) } = {}){
      mod.contrib[quem + ":" + id] = { ok, novo, foto, at: quando };
    },
    xp(){ return R.calcularXP({ confirm, pedidos, ajudando, mod }); },
  };
  return api;
}
export const xpDe = (res, quem) => (res.by[quem] ? res.by[quem].xp : 0);
