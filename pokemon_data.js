// PokeDex Living Dex & Shiny Tracker Database
window.GAMES_DATABASE = {
  "Gen 1 (Kanto)": ["Red", "Blue", "Yellow", "FireRed", "LeafGreen", "Let's Go Pikachu", "Let's Go Eevee"],
  "Gen 2 (Johto)": ["Gold", "Silver", "Crystal", "HeartGold", "SoulSilver"],
  "Gen 3 (Hoenn)": ["Ruby", "Sapphire", "Emerald", "Omega Ruby", "Alpha Sapphire"],
  "Gen 4 (Sinnoh)": ["Diamond", "Pearl", "Platinum", "Brilliant Diamond", "Shining Pearl"],
  "Gen 5 (Unova)": ["Black", "White", "Black 2", "White 2"],
  "Gen 6 (Kalos)": ["X", "Y"],
  "Gen 7 (Alola)": ["Sun", "Moon", "Ultra Sun", "Ultra Moon"],
  "Gen 8 (Galar/Hisui)": ["Sword", "Shield", "Legends Arceus"],
  "Gen 9 (Paldea)": ["Scarlet", "Violet"],
  "Spinoffs & GO": ["Pokémon GO", "Pokémon HOME", "Pokémon Legends: Z-A"]
};

window.POKEBALLS = [
  "Poké Ball", "Great Ball", "Ultra Ball", "Master Ball", "Premier Ball",
  "Luxury Ball", "Fast Ball", "Level Ball", "Lure Ball", "Heavy Ball",
  "Love Ball", "Friend Ball", "Moon Ball", "Sport Ball", "Safari Ball",
  "Net Ball", "Nest Ball", "Repeat Ball", "Timer Ball", "Dive Ball",
  "Dusk Ball", "Heal Ball", "Quick Ball", "Cherish Ball", "Dream Ball",
  "Beast Ball", "Strange Ball", "Feather Ball", "Wing Ball", "Jet Ball",
  "Gigaton Ball", "Origin Ball"
];

window.NATURES = [
  "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile",
  "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely",
  "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash",
  "Relaxed", "Sassy", "Serious", "Timid"
];

// Helper to determine Generation & Region by National Dex number
function getGenInfo(id) {
  if (id <= 151) return { gen: "Gen 1", region: "Kanto" };
  if (id <= 251) return { gen: "Gen 2", region: "Johto" };
  if (id <= 386) return { gen: "Gen 3", region: "Hoenn" };
  if (id <= 493) return { gen: "Gen 4", region: "Sinnoh" };
  if (id <= 649) return { gen: "Gen 5", region: "Unova" };
  if (id <= 721) return { gen: "Gen 6", region: "Kalos" };
  if (id <= 809) return { gen: "Gen 7", region: "Alola" };
  if (id <= 905) return { gen: "Gen 8", region: "Galar / Hisui" };
  return { gen: "Gen 9", region: "Paldea" };
}

// Famous Pokemon name map for high quality display
const KNOWN_POKEMON = {
  1: { name: "Bulbasaur", types: ["Grass", "Poison"] },
  2: { name: "Ivysaur", types: ["Grass", "Poison"] },
  3: { name: "Venusaur", types: ["Grass", "Poison"] },
  4: { name: "Charmander", types: ["Fire"] },
  5: { name: "Charmeleon", types: ["Fire"] },
  6: { name: "Charizard", types: ["Fire", "Flying"] },
  7: { name: "Squirtle", types: ["Water"] },
  8: { name: "Wartortle", types: ["Water"] },
  9: { name: "Blastoise", types: ["Water"] },
  10: { name: "Caterpie", types: ["Bug"] },
  12: { name: "Butterfree", types: ["Bug", "Flying"] },
  25: { name: "Pikachu", types: ["Electric"] },
  26: { name: "Raichu", types: ["Electric"] },
  39: { name: "Jigglypuff", types: ["Normal", "Fairy"] },
  52: { name: "Meowth", types: ["Normal"] },
  54: { name: "Psyduck", types: ["Water"] },
  65: { name: "Alakazam", types: ["Psychic"] },
  94: { name: "Gengar", types: ["Ghost", "Poison"] },
  129: { name: "Magikarp", types: ["Water"] },
  130: { name: "Gyarados", types: ["Water", "Flying"] },
  131: { name: "Lapras", types: ["Water", "Ice"] },
  133: { name: "Eevee", types: ["Normal"] },
  134: { name: "Vaporeon", types: ["Water"] },
  135: { name: "Jolteon", types: ["Electric"] },
  136: { name: "Flareon", types: ["Fire"] },
  143: { name: "Snorlax", types: ["Normal"] },
  144: { name: "Articuno", types: ["Ice", "Flying"] },
  145: { name: "Zapdos", types: ["Electric", "Flying"] },
  146: { name: "Moltres", types: ["Fire", "Flying"] },
  149: { name: "Dragonite", types: ["Dragon", "Flying"] },
  150: { name: "Mewtwo", types: ["Psychic"] },
  151: { name: "Mew", types: ["Psychic"] },
  152: { name: "Chikorita", types: ["Grass"] },
  155: { name: "Cyndaquil", types: ["Fire"] },
  158: { name: "Totodile", types: ["Water"] },
  196: { name: "Espeon", types: ["Psychic"] },
  197: { name: "Umbreon", types: ["Dark"] },
  212: { name: "Scizor", types: ["Bug", "Steel"] },
  248: { name: "Tyranitar", types: ["Rock", "Dark"] },
  249: { name: "Lugia", types: ["Psychic", "Flying"] },
  250: { name: "Ho-Oh", types: ["Fire", "Flying"] },
  251: { name: "Celebi", types: ["Psychic", "Grass"] },
  252: { name: "Treecko", types: ["Grass"] },
  255: { name: "Torchic", types: ["Fire"] },
  258: { name: "Mudkip", types: ["Water"] },
  282: { name: "Gardevoir", types: ["Psychic", "Fairy"] },
  384: { name: "Rayquaza", types: ["Dragon", "Flying"] },
  387: { name: "Turtwig", types: ["Grass"] },
  390: { name: "Chimchar", types: ["Fire"] },
  393: { name: "Piplup", types: ["Water"] },
  445: { name: "Garchomp", types: ["Dragon", "Ground"] },
  448: { name: "Lucario", types: ["Fighting", "Steel"] },
  470: { name: "Leafeon", types: ["Grass"] },
  471: { name: "Glaceon", types: ["Ice"] },
  483: { name: "Dialga", types: ["Steel", "Dragon"] },
  484: { name: "Palkia", types: ["Water", "Dragon"] },
  487: { name: "Giratina", types: ["Ghost", "Dragon"] },
  493: { name: "Arceus", types: ["Normal"] },
  495: { name: "Snivy", types: ["Grass"] },
  498: { name: "Tepig", types: ["Fire"] },
  501: { name: "Oshawott", types: ["Water"] },
  643: { name: "Reshiram", types: ["Dragon", "Fire"] },
  644: { name: "Zekrom", types: ["Dragon", "Electric"] },
  650: { name: "Chespin", types: ["Grass"] },
  653: { name: "Fennekin", types: ["Fire"] },
  656: { name: "Froakie", types: ["Water"] },
  658: { name: "Greninja", types: ["Water", "Dark"] },
  700: { name: "Sylveon", types: ["Fairy"] },
  722: { name: "Rowlet", types: ["Grass", "Flying"] },
  725: { name: "Litten", types: ["Fire"] },
  728: { name: "Popplio", types: ["Water"] },
  778: { name: "Mimikyu", types: ["Ghost", "Fairy"] },
  784: { name: "Kommo-o", types: ["Dragon", "Fighting"] },
  800: { name: "Necrozma", types: ["Psychic"] },
  810: { name: "Grookey", types: ["Grass"] },
  813: { name: "Scorbunny", types: ["Fire"] },
  816: { name: "Sobble", types: ["Water"] },
  888: { name: "Zacian", types: ["Fairy", "Steel"] },
  889: { name: "Zamazenta", types: ["Fighting", "Steel"] },
  890: { name: "Eternatus", types: ["Poison", "Dragon"] },
  906: { name: "Sprigatito", types: ["Grass"] },
  909: { name: "Fuecoco", types: ["Fire"] },
  912: { name: "Quaxly", types: ["Water"] },
  1007: { name: "Koraidon", 	types: ["Dragon", "Fighting"] },
  1008: { name: "Miraidon", 	types: ["Dragon", "Electric"] }
};

// Generate list of 1025 Pokemon
const db = [];
for (let i = 1; i <= 1025; i++) {
  const info = getGenInfo(i);
  const known = KNOWN_POKEMON[i] || {};
  const name = known.name || `Pokémon #${i}`;
  const types = known.types || ["Normal"];

  db.push({
    id: i,
    name: name,
    types: types,
    gen: info.gen,
    region: info.region,
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
    artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`,
    shiny_sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${i}.png`,
    shiny_artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${i}.png`
  });
}

window.POKEMON_DATABASE = db;
