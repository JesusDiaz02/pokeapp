import json
import urllib.request
import os
from concurrent.futures import ThreadPoolExecutor

print("Fetching full Pokemon details (1 to 1025) using multi-threading...")

def get_gen(dex_num):
    if dex_num <= 151: return ("Gen 1", "Kanto")
    elif dex_num <= 251: return ("Gen 2", "Johto")
    elif dex_num <= 386: return ("Gen 3", "Hoenn")
    elif dex_num <= 493: return ("Gen 4", "Sinnoh")
    elif dex_num <= 649: return ("Gen 5", "Unova")
    elif dex_num <= 721: return ("Gen 6", "Kalos")
    elif dex_num <= 809: return ("Gen 7", "Alola")
    elif dex_num <= 905: return ("Gen 8", "Galar / Hisui")
    else: return ("Gen 9", "Paldea")

# Games by Gen map
GAMES_BY_GEN = {
    "Gen 1": ["Red", "Blue", "Yellow", "FireRed", "LeafGreen", "Let's Go Pikachu", "Let's Go Eevee"],
    "Gen 2": ["Gold", "Silver", "Crystal", "HeartGold", "SoulSilver"],
    "Gen 3": ["Ruby", "Sapphire", "Emerald", "Omega Ruby", "Alpha Sapphire"],
    "Gen 4": ["Diamond", "Pearl", "Platinum", "Brilliant Diamond", "Shining Pearl"],
    "Gen 5": ["Black", "White", "Black 2", "White 2"],
    "Gen 6": ["X", "Y"],
    "Gen 7": ["Sun", "Moon", "Ultra Sun", "Ultra Moon"],
    "Gen 8": ["Sword", "Shield", "Legends Arceus"],
    "Gen 9": ["Scarlet", "Violet"]
}

def fetch_pokemon(dex_id):
    url = f"https://pokeapi.co/api/v2/pokemon/{dex_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            name = data['name'].capitalize()
            # Clean up hyphenated names nicely if standard
            types = [t['type']['name'].capitalize() for t in data['types']]
            gen, region = get_gen(dex_id)
            
            return {
                "id": dex_id,
                "name": name,
                "types": types,
                "gen": gen,
                "region": region,
                "sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_id}.png",
                "artwork": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{dex_id}.png",
                "shiny_sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{dex_id}.png",
                "shiny_artwork": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{dex_id}.png"
            }
    except Exception as e:
        print(f"Error fetching #{dex_id}: {e}")
        gen, region = get_gen(dex_id)
        return {
            "id": dex_id,
            "name": f"Pokemon #{dex_id}",
            "types": ["Normal"],
            "gen": gen,
            "region": region,
            "sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_id}.png",
            "artwork": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{dex_id}.png",
            "shiny_sprite": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{dex_id}.png",
            "shiny_artwork": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{dex_id}.png"
        }

# Fetch all 1025 in parallel
pokemon_list = []
with ThreadPoolExecutor(max_workers=30) as executor:
    results = executor.map(fetch_pokemon, range(1, 1026))
    pokemon_list = list(results)

pokemon_list.sort(key=lambda x: x['id'])

js_content = f"""// Generated Pokemon Database
window.POKEMON_DATABASE = {json.dumps(pokemon_list, indent=2)};
window.GAMES_DATABASE = {json.dumps(GAMES_BY_GEN, indent=2)};
"""

with open("pokemon_data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Successfully generated pokemon_data.js with {len(pokemon_list)} entries!")
