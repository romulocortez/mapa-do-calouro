// Servidor local mínimo (sem dependências) para os testes de navegador: serve a pasta do repositório.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".m4a": "audio/mp4" };
const PORTA = Number(process.env.PORTA || 4173);
createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const arq = normalize(join(RAIZ, caminho.endsWith("/") ? caminho + "index.html" : caminho));
    if (!arq.startsWith(RAIZ)) { res.writeHead(403).end(); return; }      // não sai da pasta do projeto
    const dados = await readFile(arq);
    res.writeHead(200, { "content-type": TIPOS[extname(arq)] || "application/octet-stream" }).end(dados);
  } catch { res.writeHead(404).end("não encontrado"); }
}).listen(PORTA, "127.0.0.1", () => console.log(`Mapa do Calouro em http://localhost:${PORTA}/`));
