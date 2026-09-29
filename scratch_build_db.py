import json
import urllib.request
import os

print("Fetching Pokémon dataset for PokéDex App...")

# Generations definition
GAMES_BY_GEN = {
    "Gen 1": ["Red", "Blue", "Yellow"],
    "Gen 2": ["Gold", "Silver", "Crystal"],
    "Gen 3": ["Ruby", "Sapphire", "Emerald", "FireRed", "LeafGreen"],
    "Gen 4": ["Diamond", "Pearl", "Platinum", "HeartGold", "SoulSilver"],
    "Gen 5": ["Black", "White", "Black 2", "White 2"],
    "Gen 6": ["X", "Y", "Omega Ruby", "Alpha Sapphire"],
    "Gen 7": ["Sun", "Moon", "Ultra Sun", "Ultra Moon", "Let's Go Pikachu", "Let's Go Eevee"],
    "Gen 8": ["Sword", "Shield", "Brilliant Diamond", "Shining Pearl", "Legends Arceus"],
    "Gen 9": ["Scarlet", "Violet"]
}

ALL_GAMES = []
for gen, games in GAMES_BY_GEN.items():
    for g in games:
        ALL_GAMES.append({"name": g, "gen": gen})

# We will create a rich offline database for Gen 1 - Gen 9 (first 1025 Pokemon)
# We can fetch basic info from PokeAPI or fallback to structured list if API throttles
# Let's test PokeAPI batching or structure
print("Total games supported:", len(ALL_GAMES))
