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

# --- Formas regionales (Alola, Galar, Hisui, Paldea) ---
REGIONS = {"alola": "Alola", "galar": "Galar", "hisui": "Hisui", "paldea": "Paldea"}
EXCLUDE = ("-totem", "-cap", "-zen")  # formas de batalla / especiales, no regionales

all_types = {}
for r in fetch_csv("pokemon_types.csv"):
    all_types.setdefault(int(r["pokemon_id"]), []).append((int(r["slot"]), type_names[r["type_id"]]))

form_id_by_pokemon = {int(r["pokemon_id"]): r["id"] for r in fetch_csv("pokemon_forms.csv")}
form_names = {r["pokemon_form_id"]: r["pokemon_name"] for r in fetch_csv("pokemon_form_names.csv")
              if r["local_language_id"] == ENGLISH}

forms = []
for r in fetch_csv("pokemon.csv"):
    pid, ident, species = int(r["id"]), r["identifier"], int(r["species_id"])
    m = re.search(r"-(alola|galar|hisui|paldea)(-|$)", ident)
    if pid <= MAX_ID or not m or any(x in ident for x in EXCLUDE):
        continue
    t = [name for _, name in sorted(all_types[pid])]
    name = form_names[form_id_by_pokemon[pid]].replace("Standard ", "")
    forms.append(f"  {{ id: {pid}, species: {species}, name: {json.dumps(name, ensure_ascii=False)}, "
                 f"region: {json.dumps(REGIONS[m.group(1)])}, types: {json.dumps(t)} }}")

forms_block = "const REGIONAL_FORMS = [\n" + ",\n".join(forms) + "\n];"
with open("pokemon_data.js", encoding="utf-8") as f:
    src = f.read()
src, n = re.subn(r"const REGIONAL_FORMS = \[.*?\n\];", lambda _: forms_block, src, flags=re.S)
if n == 0:
    src = src.replace("// Generate list of 1025 Pokemon", forms_block + "\n\n// Generate list of 1025 Pokemon")
with open("pokemon_data.js", "w", encoding="utf-8", newline="\n") as f:
    f.write(src)
print(f"OK: {len(forms)} formas regionales escritas")
