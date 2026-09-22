extends RefCounted
## Static roster definitions. Twelve original operatives.
## Stats here are LEVEL 1 values before rarity scaling; CharacterManager scales them.

const CLASS_ASSAULT := "Assault"
const CLASS_TANK := "Tank"
const CLASS_SUPPORT := "Support"
const CLASS_SNIPER := "Sniper"
const CLASS_SPECIALIST := "Specialist"

const RARITY_COMMON := "Common"
const RARITY_RARE := "Rare"
const RARITY_EPIC := "Epic"
const RARITY_LEGENDARY := "Legendary"

static func rarity_order() -> Array:
	return [RARITY_COMMON, RARITY_RARE, RARITY_EPIC, RARITY_LEGENDARY]

static func rarity_multiplier(rarity: String) -> float:
	match rarity:
		RARITY_RARE: return 1.16
		RARITY_EPIC: return 1.34
		RARITY_LEGENDARY: return 1.58
		_: return 1.0

static func rarity_color(rarity: String) -> Color:
	match rarity:
		RARITY_RARE: return Color("#4aa3ff")
		RARITY_EPIC: return Color("#b46bff")
		RARITY_LEGENDARY: return Color("#ffab2e")
		_: return Color("#8a97a6")

static func class_color(klass: String) -> Color:
	match klass:
		CLASS_ASSAULT: return Color("#ff6a3d")
		CLASS_TANK: return Color("#4fd6a0")
		CLASS_SUPPORT: return Color("#6fd0ff")
		CLASS_SNIPER: return Color("#ffd24a")
		CLASS_SPECIALIST: return Color("#c06bff")
		_: return Color("#9aa7b4")

## Archetype baselines, before rarity scaling.
static func class_base(klass: String) -> Dictionary:
	match klass:
		CLASS_ASSAULT:
			return {"hp": 620, "attack": 96, "defense": 44, "speed": 104, "crit": 0.18, "crit_dmg": 1.60}
		CLASS_TANK:
			return {"hp": 1080, "attack": 62, "defense": 84, "speed": 80, "crit": 0.08, "crit_dmg": 1.45}
		CLASS_SUPPORT:
			return {"hp": 640, "attack": 66, "defense": 52, "speed": 96, "crit": 0.10, "crit_dmg": 1.50}
		CLASS_SNIPER:
			return {"hp": 500, "attack": 120, "defense": 34, "speed": 110, "crit": 0.30, "crit_dmg": 1.90}
		CLASS_SPECIALIST:
			return {"hp": 580, "attack": 84, "defense": 48, "speed": 122, "crit": 0.20, "crit_dmg": 1.70}
		_:
			return {"hp": 600, "attack": 80, "defense": 50, "speed": 100, "crit": 0.12, "crit_dmg": 1.5}

static func all() -> Dictionary:
	return {
		"marlow": {
			"id": "marlow", "name": "Vesna Marlow", "codename": "CINDER",
			"klass": CLASS_ASSAULT, "rarity": RARITY_RARE, "seed": 11,
			"bio": "Ran demolition crews before the organisation found her. Opens doors that were not meant to open.",
			"skill": {
				"name": "Breach Charge", "cost": 100,
				"desc": "Heavy strike on the front enemy, splashing 45% to the rest and setting BURN for 3 turns.",
				"type": "damage", "power": 1.95, "targets": "front", "splash": 0.45,
				"status": {"kind": "burn", "turns": 3, "power": 0.35},
			},
		},
		"kestrel": {
			"id": "kestrel", "name": "Ilia Kestrel", "codename": "LONGLIGHT",
			"klass": CLASS_SNIPER, "rarity": RARITY_EPIC, "seed": 23,
			"bio": "Counts wind and heartbeats. Has never needed a second shot, and resents being asked for one.",
			"skill": {
				"name": "Called Shot", "cost": 100,
				"desc": "Single shot at 260% power with +40% critical chance. Ignores 30% of defence.",
				"type": "damage", "power": 2.60, "targets": "lowest_hp", "crit_bonus": 0.40, "pierce": 0.30,
			},
		},
		"kane": {
			"id": "kane", "name": "Odis Kane", "codename": "BULWARK",
			"klass": CLASS_TANK, "rarity": RARITY_RARE, "seed": 37,
			"bio": "Two tours on a port security detail, then a decade of not being moved by anybody.",
			"skill": {
				"name": "Hold The Line", "cost": 90,
				"desc": "Shields the whole squad for 22% of Kane's max HP and raises squad defence 30% for 3 turns.",
				"type": "shield", "power": 0.22, "targets": "all_allies",
				"buff": {"stat": "defense", "amount": 0.30, "turns": 3},
			},
		},
		"sarr": {
			"id": "sarr", "name": "Mireille Sarr", "codename": "FIELD DRESS",
			"klass": CLASS_SUPPORT, "rarity": RARITY_RARE, "seed": 41,
			"bio": "Trauma surgeon struck off for the wrong patients. Keeps the crew upright on impossible nights.",
			"skill": {
				"name": "Triage Kit", "cost": 90,
				"desc": "Heals the two most wounded allies for 180% power and clears one negative effect each.",
				"type": "heal", "power": 1.80, "targets": "lowest_two_allies", "cleanse": 1,
			},
		},
		"nuri": {
			"id": "nuri", "name": "Tam Nuri", "codename": "GHOSTWIRE",
			"klass": CLASS_SPECIALIST, "rarity": RARITY_EPIC, "seed": 53,
			"bio": "Talks to buildings. Doors, cameras and alarm loops answer back and then keep quiet about it.",
			"skill": {
				"name": "System Bleed", "cost": 100,
				"desc": "Hits every enemy for 130% power, strips 25% defence and SLOWS them for 2 turns.",
				"type": "damage", "power": 1.30, "targets": "all",
				"debuff": {"stat": "defense", "amount": 0.25, "turns": 3},
				"status": {"kind": "slow", "turns": 2, "power": 0.30},
			},
		},
		"delgado": {
			"id": "delgado", "name": "Rook Delgado", "codename": "HAMMERFALL",
			"klass": CLASS_ASSAULT, "rarity": RARITY_COMMON, "seed": 67,
			"bio": "Cheerful, loud, first through every doorway. Nobody has explained the risk to him yet.",
			"skill": {
				"name": "Suppressing Burst", "cost": 90,
				"desc": "Three shots of 85% power at random enemies.",
				"type": "damage", "power": 0.85, "targets": "random", "hits": 3,
			},
		},
		"halvorsen": {
			"id": "halvorsen", "name": "Pia Halvorsen", "codename": "TALLY",
			"klass": CLASS_SNIPER, "rarity": RARITY_COMMON, "seed": 71,
			"bio": "Keeps a notebook of everyone she has had in the reticle. Very few entries are crossed out.",
			"skill": {
				"name": "Mark And Fire", "cost": 90,
				"desc": "200% power to a single target and marks it — the squad deals +20% to it for 3 turns.",
				"type": "damage", "power": 2.00, "targets": "highest_attack",
				"status": {"kind": "marked", "turns": 3, "power": 0.20},
			},
		},
		"teng": {
			"id": "teng", "name": "Boris Teng", "codename": "CRAG",
			"klass": CLASS_TANK, "rarity": RARITY_COMMON, "seed": 83,
			"bio": "Was a bouncer on the river docks. Still refuses entry to almost everything.",
			"skill": {
				"name": "Riot Advance", "cost": 90,
				"desc": "150% power to the front enemy, STUNS it for 1 turn and heals Teng for 30% of damage dealt.",
				"type": "damage", "power": 1.50, "targets": "front", "lifesteal": 0.30,
				"status": {"kind": "stun", "turns": 1, "power": 1.0},
			},
		},
		"ferreira": {
			"id": "ferreira", "name": "Sable Ferreira", "codename": "QUARTERMASTER",
			"klass": CLASS_SUPPORT, "rarity": RARITY_COMMON, "seed": 97,
			"bio": "Signs nothing, forgets nothing, and can find a replacement barrel in a city under curfew.",
			"skill": {
				"name": "Combat Stims", "cost": 90,
				"desc": "Raises squad attack 28% and speed 18% for 3 turns, and heals everyone for 60% power.",
				"type": "heal", "power": 0.60, "targets": "all_allies",
				"buff": {"stat": "attack", "amount": 0.28, "turns": 3},
				"buff2": {"stat": "speed", "amount": 0.18, "turns": 3},
			},
		},
		"okonjo": {
			"id": "okonjo", "name": "Nyx Okonjo", "codename": "SPLIT SECOND",
			"klass": CLASS_SPECIALIST, "rarity": RARITY_RARE, "seed": 101,
			"bio": "Reads a room in the time it takes to close the door behind her. Then leaves by a different one.",
			"skill": {
				"name": "Blindside", "cost": 90,
				"desc": "230% power to the enemy with the highest attack, with BLEED for 3 turns.",
				"type": "damage", "power": 2.30, "targets": "highest_attack",
				"status": {"kind": "bleed", "turns": 3, "power": 0.28},
			},
		},
		"lund": {
			"id": "lund", "name": "Corvus Lund", "codename": "NIGHT WARDEN",
			"klass": CLASS_ASSAULT, "rarity": RARITY_LEGENDARY, "seed": 113,
			"bio": "The organisation's first field commander. Turns up where the plan has already failed.",
			"skill": {
				"name": "Warden's Order", "cost": 110,
				"desc": "180% power to all enemies, then rallies the squad for +35% attack over 3 turns.",
				"type": "damage", "power": 1.80, "targets": "all",
				"buff": {"stat": "attack", "amount": 0.35, "turns": 3, "on_allies": true},
			},
		},
		"raam": {
			"id": "raam", "name": "Ives Raam", "codename": "HALCYON",
			"klass": CLASS_SUPPORT, "rarity": RARITY_EPIC, "seed": 127,
			"bio": "Chemist. Built the compound's pharmacy from a suitcase and a stolen fridge.",
			"skill": {
				"name": "Stabiliser Cloud", "cost": 100,
				"desc": "Heals the squad for 130% power, cleanses every negative effect and grants a 12% max-HP shield.",
				"type": "heal", "power": 1.30, "targets": "all_allies", "cleanse": 99,
				"shield": 0.12,
			},
		},
	}

static func starting_roster() -> Array:
	return ["marlow", "teng", "ferreira"]

static func order() -> Array:
	var ids: Array = []
	for k in all().keys():
		ids.append(k)
	return ids
