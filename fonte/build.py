#!/usr/bin/env python3
"""Monta as páginas do Mapa do Calouro a partir de fonte/.

Uso:
  python3 fonte/build.py beta        -> beta/index.html e beta/<campus>/index.html
  python3 fonte/build.py oficial     -> index.html e <campus>/index.html (só ao promover o beta)
  python3 fonte/build.py beta teresina   (só um campus)

Arquivos:
  fonte/modelo.html            página com o código (CSS, HTML e JavaScript) e marcadores __GEO__, __CAMPUS__ etc.
  fonte/campi.json             lista de campi da tela de escolha; "pasta" é onde a página do campus fica (null = em breve)
  fonte/campi/<id>/*.json      dados de cada campus: geo, osm, named, indoor, campus
  fonte/supabase_publico.json  URL e chave pública do Supabase (nunca a service_role!)
  docs/TERMO-DE-USO-E-PRIVACIDADE.md  vira o termo dentro da página
As fontes (fonts/) e as músicas (audio/) ficam na raiz do site e do beta.
"""
import json, os, sys, posixpath

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DADOS = ["geo", "osm", "named", "indoor", "campus"]

def ler(*p): return open(os.path.join(*p), encoding="utf-8").read()
def js(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":"))

def esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def md2html(md):
    out, lista = [], False
    for ln in md.split("\n"):
        ln = ln.rstrip()
        if ln.startswith("- "):
            if not lista: out.append("<ul>"); lista = True
            out.append("<li>" + esc(ln[2:]) + "</li>"); continue
        if lista: out.append("</ul>"); lista = False
        if not ln or ln.startswith("# "): continue
        if ln.startswith("## "): out.append("<h4>" + esc(ln[3:]) + "</h4>")
        else: out.append("<p>" + esc(ln) + "</p>")
    if lista: out.append("</ul>")
    return "".join(out)

def relativo(de, para):
    """URL relativa da página na pasta `de` para a pasta `para` ("" = raiz)."""
    r = posixpath.relpath("/" + para, "/" + de) if para != de else "."
    return "./" if r == "." else r.rstrip("/") + "/"

def montar(campus_id, destino_raiz):
    campi = json.loads(ler(AQUI, "campi.json"))
    c = next(x for x in campi if x["id"] == campus_id)
    pasta = c["pasta"]
    base = relativo(pasta, "")
    html_ = ler(AQUI, "modelo.html")
    d = {n: json.loads(ler(AQUI, "campi", campus_id, n + ".json")) for n in DADOS}
    d["campus"]["base"] = "" if base == "./" else base
    lista = []
    for x in campi:
        y = {k: x[k] for k in ("id", "cidade", "nome")}
        y["url"] = relativo(pasta, x["pasta"]) if x["pasta"] is not None else None
        if "status" in x: y["status"] = x["status"]
        lista.append(y)
    termo = md2html(ler(RAIZ, "docs", "TERMO-DE-USO-E-PRIVACIDADE.md"))
    supa = json.loads(ler(AQUI, "supabase_publico.json"))
    assert set(supa) <= {"url", "anonKey", "versaoTermo"}, "supabase_publico.json só pode ter url, anonKey e versaoTermo"
    trocas = {"__GEO__": js(d["geo"]), "__OSM__": js(d["osm"]), "__NAMED__": js(d["named"]),
              "__INDOOR__": js(d["indoor"]), "__CAMPUS__": js(d["campus"]), "__CAMPI__": js(lista),
              "__SUPA__": json.dumps(supa, ensure_ascii=False), "__TERMO__": json.dumps(termo, ensure_ascii=False),
              "__FONTES__": ("" if base == "./" else base) + "fonts/"}
    for k, v in trocas.items():
        assert k in html_, k
        html_ = html_.replace(k, v)
    saida = os.path.join(destino_raiz, pasta, "index.html")
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    open(saida, "w", encoding="utf-8").write(html_)
    print("ok", os.path.relpath(saida, RAIZ))

if __name__ == "__main__":
    alvo = sys.argv[1] if len(sys.argv) > 1 else "beta"
    destino = {"beta": os.path.join(RAIZ, "beta"), "oficial": RAIZ}[alvo]
    destino = os.environ.get("MAPA_DESTINO", destino)   # os testes montam numa pasta temporária
    ids = sys.argv[2:] or [x["id"] for x in json.loads(ler(AQUI, "campi.json")) if x["pasta"] is not None]
    for i in ids: montar(i, destino)
