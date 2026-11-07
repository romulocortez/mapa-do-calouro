#!/usr/bin/env python3
"""Gera os dados do campus de Bom Jesus (fonte/campi/bomjesus/*.json) a partir do OpenStreetMap.

Entrada: fonte/dados/bomjesus.osm (exportado de openstreetmap.org; dados © colaboradores do OpenStreetMap, licença ODbL).
Os nomes dos blocos vêm do mapa do campus publicado no site da UFPI (usado só como referência de nomes;
o desenho é todo do OSM). O plano do mapa é em metros, com o norte para cima, então o GPS é exato:
x = leste, y = sul, a partir do canto da área do campus.
Uso: python3 fonte/ferramentas/bomjesus.py
"""
import xml.etree.ElementTree as ET, math, json, os

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.dirname(AQUI)
SAIDA = os.path.join(FONTE, "campi", "bomjesus")
r = ET.parse(os.path.join(FONTE, "dados", "bomjesus.osm")).getroot()

# ---- projeção: metros num plano local (equiretangular, exata o bastante para 1 km) ----
nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in r.findall("node")}
ways = {}
for w in r.findall("way"):
    ways[w.get("id")] = {"t": {x.get("k"): x.get("v") for x in w.findall("tag")}, "n": [nd.get("ref") for nd in w.findall("nd")]}
rels = [{"t": {x.get("k"): x.get("v") for x in rel.findall("tag")}, "m": [m.get("ref") for m in rel.findall("member") if m.get("type") == "way"]} for rel in r.findall("relation")]

CAMPUS_WAY = "360060041"   # amenity=university: UFPI - Campus Universitário Professora Cinobelina Elvas
camp_ll = [nodes[n] for n in ways[CAMPUS_WAY]["n"]]
LAT0 = sum(p[0] for p in camp_ll)/len(camp_ll); LNG0 = sum(p[1] for p in camp_ll)/len(camp_ll)
KY = 111132.92 - 559.82*math.cos(2*math.radians(LAT0)) + 1.175*math.cos(4*math.radians(LAT0))
KX = 111412.84*math.cos(math.radians(LAT0)) - 93.5*math.cos(3*math.radians(LAT0))
enu = lambda lat, lng: ((lng - LNG0)*KX, (lat - LAT0)*KY)
E = [enu(*p) for p in camp_ll]
MARGEM = 70
OX = min(p[0] for p in E) - MARGEM; ON = max(p[1] for p in E) + MARGEM
W = round(max(p[0] for p in E) + MARGEM - OX, 1); H = round(ON - (min(p[1] for p in E) - MARGEM), 1)
def xy(lat, lng):
    e, n = enu(lat, lng); return (round(e - OX, 2), round(ON - n, 2))
def pts(wid): return [xy(*nodes[n]) for n in ways[wid]["n"] if n in nodes]

def area(p): return abs(sum(p[i][0]*p[i+1][1] - p[i+1][0]*p[i][1] for i in range(len(p)-1)))/2
def centro(p):
    q = p[:-1] if p[0] == p[-1] else p
    return [round(sum(a[0] for a in q)/len(q), 2), round(sum(a[1] for a in q)/len(q), 2)]
def caminho(p): return "M" + " L".join(f"{a[0]:.1f} {a[1]:.1f}" for a in (p[:-1] if p[0] == p[-1] else p)) + " Z"
def caixa(p):
    xs = [a[0] for a in p]; ys = [a[1] for a in p]
    return [round(min(xs), 2), round(min(ys), 2), round(max(xs)-min(xs), 1), round(max(ys)-min(ys), 1)]

# ---- nomes dos prédios (id do OSM -> id no app, nome, nome curto no mapa) ----
NOMES = {
    "1024695589": ("bl105", "BL-105 · Laboratórios"),
    "1024695588": ("bl104", "BL-104 · Laboratórios"),
    "1024695587": ("bl103", "BL-103 · Administração"),
    "1024695586": ("bl102", "BL-102 · Salas dos professores e Biblioteca"),
    "1024695584": ("bl101", "BL-101 · Salas de aula"),
    "1024695590": ("cas", "Centro de Análise de Solos"),
    "1024695591": ("lna", "Laboratório de Nutrição Animal"),
    "1024695595": ("bl106", "BL-106 · Salas de aula"),
    "1024695592": ("ru", "Restaurante Universitário"),
    "1024695594": ("aud", "Auditório"),
    "1024695621": ("gin", "Ginásio"),
    "1024695622": ("hvu", "Hospital Veterinário (HVU)"),
}
CTBJ = {"1024695596", "1024695597", "1024695598", "1024695599", "1024695600", "1024695601", "1024695602", "1024695603", "1024695604"}

predios = []
membros = {m for rel in rels if rel["t"].get("building") for m in rel["m"]}
for wid, w in ways.items():
    if "building" in w["t"] or wid in membros:
        p = pts(wid)
        if len(p) < 4: continue
        b = {"d": caminho(p), "c": centro(p), "a": round(area(p)), "bb": caixa(p), "src": "osm"}
        if wid in NOMES: b["id"] = NOMES[wid][0]
        elif wid in CTBJ: b["id"] = "ctbj-" + wid[-2:]
        predios.append((wid, b))

# ---- vias ----
def classe(t):
    h = t.get("highway")
    if h == "tertiary": return "av"
    if t.get("name") == "Avenida Universitária": return "pri"
    if h == "unclassified": return "ter"
    if h in ("residential", "service"): return "trk" if t.get("surface") == "unpaved" else "sec"
    if h in ("footway", "path", "pedestrian"): return "ped"
    return None
vias = []
for wid, w in ways.items():
    c = classe(w["t"])
    if not c: continue
    v = {"c": c, "p": [list(a) for a in pts(wid)]}
    if w["t"].get("name"): v["n"] = w["t"]["name"]; v["lab"] = True
    vias.append(v)

campus = [list(a) for a in pts(CAMPUS_WAY)]
if campus[0] == campus[-1]: campus = campus[:-1]
geo = {"W": W, "H": H, "campus": campus, "campus2": [], "river": [], "places": {}, "masks": {"forestD": ""},
       "cca": {"areas": [], "forest": []}, "roadsOSM": {"roads": vias, "gates": []}, "sport": None, "disco": None, "resDetail": None}
osm = {"blds": [b for _, b in predios], "areas": {"grass": [], "forest": [], "parking": []}}

por_id = {b["id"]: b for _, b in predios if "id" in b}
nomes = [{"x": por_id[i]["c"][0], "y": por_id[i]["c"][1], "t": n, "k": "b"} for i, n in NOMES.values()]
ct = [b for wid, b in predios if wid in CTBJ]
ctc = [round(sum(b["c"][0] for b in ct)/len(ct), 2), round(sum(b["c"][1] for b in ct)/len(ct), 2)]
nomes.append({"x": ctc[0], "y": ctc[1], "t": "Colégio Técnico de Bom Jesus", "k": "a"})
lugares = {i: por_id[i]["c"] for i, _ in NOMES.values()}
lugares["ctbj"] = ctc
named = {"names": nomes, "places": lugares, "rooms": []}

georef = {"lat0": LAT0, "lng0": LNG0, "kx": KX, "ky": KY,
          "M": [[1, 0, round(-OX, 3)], [0, -1, round(ON, 3)]], "Mcca": [[1, 0, round(-OX, 3)], [0, -1, round(ON, 3)]],
          "rms": 0, "loo": 0, "n": 0, "pts": [], "src": "OpenStreetMap (coordenadas reais; sem ajuste por pontos)"}

os.makedirs(SAIDA, exist_ok=True)
for nome, obj in [("geo", geo), ("osm", osm), ("named", named)]:
    json.dump(obj, open(os.path.join(SAIDA, nome + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
# campus.json: lugares e easter egg são editados à mão; aqui só se atualiza a georreferência
cj = os.path.join(SAIDA, "campus.json")
c = json.load(open(cj, encoding="utf-8")); c["georef"] = {k: v for k, v in georef.items() if k != "src"}
json.dump(c, open(cj, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("Bom Jesus:", len(predios), "prédios,", len(vias), "vias, área", W, "x", H, "m")
