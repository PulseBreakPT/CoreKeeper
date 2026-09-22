extends RefCounted
## Equipment catalogue. 30 items across three slots and four rarities.

const SLOT_WEAPON := "weapon"
const SLOT_ARMOR := "armor"
const SLOT_ACCESSORY := "accessory"

static func slots() -> Array:
	return [SLOT_WEAPON, SLOT_ARMOR, SLOT_ACCESSORY]

static func slot_label(slot: String) -> String:
	match slot:
		SLOT_WEAPON: return "Weapon"
		SLOT_ARMOR: return "Armor"
		SLOT_ACCESSORY: return "Accessory"
		_: return slot.capitalize()

static func all() -> Dictionary:
	var list := [
		# ---- Weapons ---------------------------------------------------
		{"id": "w_scrapper", "name": "Scrapper Carbine", "slot": SLOT_WEAPON, "rarity": "Common",
		 "stats": {"attack": 14, "speed": 2},
		 "desc": "Shortened yard rifle with a welded rail. Loud, blunt, always available.",
		 "origin": "Salvaged from convoy wrecks"},
		{"id": "w_sidearm", "name": "Dock Sidearm", "slot": SLOT_WEAPON, "rarity": "Common",
		 "stats": {"attack": 11, "crit": 0.03},
		 "desc": "Port-issue pistol with the serial filed flat.",
		 "origin": "Common drop, any region"},
		{"id": "w_prybar", "name": "Breaching Prybar", "slot": SLOT_WEAPON, "rarity": "Common",
		 "stats": {"attack": 9, "defense": 6},
		 "desc": "Half tool, half argument.",
		 "origin": "Abandoned warehouses"},
		{"id": "w_linecutter", "name": "Line Cutter SMG", "slot": SLOT_WEAPON, "rarity": "Rare",
		 "stats": {"attack": 24, "speed": 6, "crit": 0.04},
		 "desc": "Suppressed, high cyclic, awful past thirty metres.",
		 "origin": "Enemy patrols, Harbour Reach"},
		{"id": "w_marksman", "name": "Marksman's Frame", "slot": SLOT_WEAPON, "rarity": "Rare",
		 "stats": {"attack": 30, "crit": 0.07, "crit_dmg": 0.10},
		 "desc": "Bolt frame rebuilt around a glass optic worth more than the rifle.",
		 "origin": "Intelligence points"},
		{"id": "w_riotgun", "name": "Riot Stopper", "slot": SLOT_WEAPON, "rarity": "Rare",
		 "stats": {"attack": 22, "defense": 9, "hp": 40},
		 "desc": "Wide pattern, short barrel, for rooms rather than streets.",
		 "origin": "Supply caches"},
		{"id": "w_arcwelder", "name": "Arc Welder", "slot": SLOT_WEAPON, "rarity": "Epic",
		 "stats": {"attack": 41, "crit": 0.06, "speed": 5},
		 "desc": "Industrial torch rewired for one very short, very bright use per trigger pull.",
		 "origin": "Elite enemies"},
		{"id": "w_quietman", "name": "Quiet Man", "slot": SLOT_WEAPON, "rarity": "Epic",
		 "stats": {"attack": 38, "crit": 0.12, "crit_dmg": 0.18},
		 "desc": "Integrally suppressed and weighted so it barely moves. Nobody hears the first one.",
		 "origin": "Boss drop, Sable Quarter"},
		{"id": "w_hammerfall", "name": "Hammerfall Repeater", "slot": SLOT_WEAPON, "rarity": "Epic",
		 "stats": {"attack": 44, "hp": 60},
		 "desc": "Belt-fed and absurd. Two people carry it, one fires it.",
		 "origin": "Boss drop, Iron Verge"},
		{"id": "w_nightwarden", "name": "Warden's Mark", "slot": SLOT_WEAPON, "rarity": "Legendary",
		 "stats": {"attack": 62, "crit": 0.14, "crit_dmg": 0.30, "speed": 6},
		 "desc": "The commander's own rifle. Refinished so many times the metal has gone soft at the grip.",
		 "origin": "Final boss, Ashline Basin"},
		{"id": "w_blacksale", "name": "Black Sale Special", "slot": SLOT_WEAPON, "rarity": "Legendary",
		 "stats": {"attack": 55, "crit": 0.20, "crit_dmg": 0.22, "defense": 10},
		 "desc": "Bought from a man who insisted it had never been fired. It had.",
		 "origin": "Black Market Shipment event"},

		# ---- Armor -----------------------------------------------------
		{"id": "a_workvest", "name": "Yard Work Vest", "slot": SLOT_ARMOR, "rarity": "Common",
		 "stats": {"hp": 70, "defense": 8},
		 "desc": "Hi-vis stripping torn off, plate pockets sewn in.",
		 "origin": "Common drop, any region"},
		{"id": "a_courier", "name": "Courier Jacket", "slot": SLOT_ARMOR, "rarity": "Common",
		 "stats": {"hp": 50, "speed": 5},
		 "desc": "Nothing stops a bullet. Everything about it says 'delivery'.",
		 "origin": "Exploration sites"},
		{"id": "a_scrapplate", "name": "Scrap Plate Rig", "slot": SLOT_ARMOR, "rarity": "Common",
		 "stats": {"hp": 95, "defense": 11, "speed": -3},
		 "desc": "Cut from a shipping container. Weighs like one.",
		 "origin": "Resource nodes"},
		{"id": "a_slickcoat", "name": "Slickline Coat", "slot": SLOT_ARMOR, "rarity": "Rare",
		 "stats": {"hp": 130, "defense": 16, "speed": 4},
		 "desc": "Woven lining that sheds a knife and most of the rain.",
		 "origin": "Convoys"},
		{"id": "a_breacher", "name": "Breacher Harness", "slot": SLOT_ARMOR, "rarity": "Rare",
		 "stats": {"hp": 165, "defense": 22},
		 "desc": "Front-heavy, rated for doors coming back at you.",
		 "origin": "Abandoned warehouses"},
		{"id": "a_medweave", "name": "Medical Weave", "slot": SLOT_ARMOR, "rarity": "Rare",
		 "stats": {"hp": 190, "defense": 12},
		 "desc": "Clotting fibres in the lining. Buys minutes, not fights.",
		 "origin": "Distress Signal event"},
		{"id": "a_ceramic", "name": "Ceramic Overplate", "slot": SLOT_ARMOR, "rarity": "Epic",
		 "stats": {"hp": 260, "defense": 34, "speed": -4},
		 "desc": "Stops nearly everything once, then falls apart with great dignity.",
		 "origin": "Elite enemies, Iron Verge"},
		{"id": "a_ghostshell", "name": "Ghost Shell", "slot": SLOT_ARMOR, "rarity": "Epic",
		 "stats": {"hp": 200, "defense": 24, "speed": 11, "crit": 0.04},
		 "desc": "Radar-quiet panels over a frame that lets you run.",
		 "origin": "Boss drop, Null District"},
		{"id": "a_wardencoat", "name": "Warden's Longcoat", "slot": SLOT_ARMOR, "rarity": "Legendary",
		 "stats": {"hp": 340, "defense": 44, "speed": 6},
		 "desc": "Heavier than it looks, and it looks heavy.",
		 "origin": "Final boss, Ashline Basin"},
		{"id": "a_bulwark", "name": "Bulwark Exoframe", "slot": SLOT_ARMOR, "rarity": "Legendary",
		 "stats": {"hp": 420, "defense": 52, "speed": -6},
		 "desc": "Powered hip and shoulder assist. The compound only has one.",
		 "origin": "Region Completion reward"},

		# ---- Accessories -----------------------------------------------
		{"id": "c_tags", "name": "Blank Tags", "slot": SLOT_ACCESSORY, "rarity": "Common",
		 "stats": {"hp": 40, "defense": 4},
		 "desc": "No name, no unit, no next of kin. Standard issue here.",
		 "origin": "Common drop, any region"},
		{"id": "c_optic", "name": "Clip-On Optic", "slot": SLOT_ACCESSORY, "rarity": "Common",
		 "stats": {"crit": 0.05},
		 "desc": "Fits nothing properly, helps anyway.",
		 "origin": "Supply caches"},
		{"id": "c_stimpack", "name": "Field Stim Pack", "slot": SLOT_ACCESSORY, "rarity": "Common",
		 "stats": {"hp": 60, "speed": 4},
		 "desc": "Three doses. Two are for someone else.",
		 "origin": "Medical Center salvage"},
		{"id": "c_scanner", "name": "Band Scanner", "slot": SLOT_ACCESSORY, "rarity": "Rare",
		 "stats": {"speed": 12, "crit": 0.06},
		 "desc": "Listens to their channel. Occasionally they listen back.",
		 "origin": "Intelligence points"},
		{"id": "c_plating", "name": "Trauma Plating", "slot": SLOT_ACCESSORY, "rarity": "Rare",
		 "stats": {"hp": 150, "defense": 14},
		 "desc": "Bolt-on chest and groin plates. Unlovely, effective.",
		 "origin": "Enemy patrols"},
		{"id": "c_ledger", "name": "The Ledger", "slot": SLOT_ACCESSORY, "rarity": "Rare",
		 "stats": {"attack": 16, "crit_dmg": 0.12},
		 "desc": "Names, debts, dates. Carrying it makes people careful around you.",
		 "origin": "Story mission reward"},
		{"id": "c_deadhand", "name": "Deadhand Relay", "slot": SLOT_ACCESSORY, "rarity": "Epic",
		 "stats": {"attack": 26, "crit": 0.10, "hp": 90},
		 "desc": "Keeps transmitting after the operator stops. Comforting to some.",
		 "origin": "Boss drop, Harbour Reach"},
		{"id": "c_coldiron", "name": "Cold Iron Charm", "slot": SLOT_ACCESSORY, "rarity": "Epic",
		 "stats": {"defense": 30, "hp": 140, "crit": 0.05},
		 "desc": "Nail from a demolished church. Nobody in the crew will admit to believing in it.",
		 "origin": "Hidden Cache event"},
		{"id": "c_blackbox", "name": "Blackbox Core", "slot": SLOT_ACCESSORY, "rarity": "Legendary",
		 "stats": {"attack": 40, "speed": 16, "crit": 0.12, "crit_dmg": 0.20},
		 "desc": "Pulled from something the organisation was not supposed to find.",
		 "origin": "Final boss, Ashline Basin"},
	]
	var out: Dictionary = {}
	for it in list:
		out[it["id"]] = it
	return out

## Weighted "power" of an item, used for squad power and sorting.
static func item_power(item: Dictionary) -> int:
	var s: Dictionary = item.get("stats", {})
	var p := 0.0
	p += float(s.get("hp", 0)) * 0.55
	p += float(s.get("attack", 0)) * 4.4
	p += float(s.get("defense", 0)) * 3.2
	p += float(s.get("speed", 0)) * 1.8
	p += float(s.get("crit", 0.0)) * 320.0
	p += float(s.get("crit_dmg", 0.0)) * 180.0
	return int(round(maxf(p, 0.0)))

static func by_rarity(rarity: String, slot: String = "") -> Array:
	var out: Array = []
	for id in all().keys():
		var it: Dictionary = all()[id]
		if it["rarity"] != rarity:
			continue
		if slot != "" and it["slot"] != slot:
			continue
		out.append(id)
	return out
