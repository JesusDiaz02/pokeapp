"""Regenera el bloque KNOWN_POKEMON de pokemon_data.js con los 1025 Pokémon
(nombre en inglés y tipos actuales) usando los CSV oficiales de PokeAPI."""
import csv
import io
import json
import re
import urllib.request

BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
MAX_ID = 1025
ENGLISH = "9"


def fetch_csv(name):
    with urllib.request.urlopen(BASE + name, timeout=30) as resp:
        return list(csv.DictReader(io.StringIO(resp.read().decode("utf-8"))))


type_names = {r["type_id"]: r["name"] for r in fetch_csv("type_names.csv") if r["local_language_id"] == ENGLISH}
species_names = {int(r["pokemon_species_id"]): r["name"] for r in fetch_csv("pokemon_species_names.csv")
                 if r["local_language_id"] == ENGLISH}

types = {}
for r in fetch_csv("pokemon_types.csv"):
    pid = int(r["pokemon_id"])  # ids 1..1025 son las formas por defecto
    if pid <= MAX_ID:
        types.setdefault(pid, []).append((int(r["slot"]), type_names[r["type_id"]]))

lines = []
for i in range(1, MAX_ID + 1):
    t = [name for _, name in sorted(types[i])]
    lines.append(f"  {i}: {{ name: {json.dumps(species_names[i], ensure_ascii=False)}, types: {json.dumps(t)} }}")

block = "const KNOWN_POKEMON = {\n" + ",\n".join(lines) + "\n};"

with open("pokemon_data.js", encoding="utf-8") as f:
    src = f.read()
src, n = re.subn(r"const KNOWN_POKEMON = \{.*?\n\};", lambda _: block, src, flags=re.S)
assert n == 1, "No se encontró el bloque KNOWN_POKEMON"
with open("pokemon_data.js", "w", encoding="utf-8", newline="\n") as f:
    f.write(src)
print(f"OK: {len(lines)} Pokémon escritos")
