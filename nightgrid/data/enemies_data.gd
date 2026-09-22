extends RefCounted
## Enemy archetypes and per-faction naming. Stats are generated from level.

static func archetypes() -> Dictionary:
	return {
		"grunt":   {"hp": 340, "attack": 46, "defense": 22, "speed": 92,  "crit": 0.06, "crit_dmg": 1.4, "role": "Assault"},
		"shooter": {"hp": 280, "attack": 62, "defense": 16, "speed": 104, "crit": 0.14, "crit_dmg": 1.6, "role": "Sniper"},
		"bruiser": {"hp": 620, "attack": 40, "defense": 42, "speed": 74,  "crit": 0.05, "crit_dmg": 1.4, "role": "Tank"},
		"medic":   {"hp": 330, "attack": 34, "defense": 24, "speed": 98,  "crit": 0.05, "crit_dmg": 1.4, "role": "Support"},
		"runner":  {"hp": 260, "attack": 54, "defense": 14, "speed": 128, "crit": 0.18, "crit_dmg": 1.6, "role": "Specialist"},
		"elite":   {"hp": 900, "attack": 78, "defense": 46, "speed": 106, "crit": 0.16, "crit_dmg": 1.7, "role": "Assault"},
		"boss":    {"hp": 2600, "attack": 104, "defense": 60, "speed": 100, "crit": 0.18, "crit_dmg": 1.8, "role": "Tank"},
	}

## Enemy skills, keyed by archetype. Mirrors the operative skill schema.
static func archetype_skill(arch: String) -> Dictionary:
	match arch:
		"shooter":
			return {"name": "Aimed Volley", "cost": 100, "type": "damage", "power": 1.9,
				"targets": "lowest_hp", "crit_bonus": 0.2}
		"bruiser":
			return {"name": "Crushing Swing", "cost": 100, "type": "damage", "power": 1.6,
				"targets": "front", "status": {"kind": "stun", "turns": 1, "power": 1.0}}
		"medic":
			return {"name": "Patch Up", "cost": 90, "type": "heal", "power": 1.5, "targets": "lowest_two_allies"}
		"runner":
			return {"name": "Knife Work", "cost": 90, "type": "damage", "power": 1.7,
				"targets": "highest_attack", "status": {"kind": "bleed", "turns": 3, "power": 0.25}}
		"elite":
			return {"name": "Overwhelm", "cost": 100, "type": "damage", "power": 1.35, "targets": "all"}
		"boss":
			return {"name": "Scorched Order", "cost": 110, "type": "damage", "power": 1.55, "targets": "all",
				"status": {"kind": "burn", "turns": 3, "power": 0.30},
				"debuff": {"stat": "attack", "amount": 0.18, "turns": 3}}
		_:
			return {"name": "Hard Swing", "cost": 100, "type": "damage", "power": 1.6, "targets": "front"}

static func factions() -> Dictionary:
	return {
		"dock_syndicate": {
			"name": "Dock Syndicate", "color": "#4a9eda",
			"names": {
				"grunt": ["Dock Hand", "Crate Runner", "Pier Thug"],
				"shooter": ["Crane Spotter", "Gantry Marksman"],
				"bruiser": ["Quay Enforcer", "Container Breaker"],
				"medic": ["Shift Medic", "Union Patcher"],
				"runner": ["Tide Runner", "Wharf Sprinter"],
				"elite": ["Harbourmaster's Fist", "Bonded Enforcer"],
				"boss": ["Harbourmaster Vell"],
			},
		},
		"velvet_cartel": {
			"name": "Velvet Cartel", "color": "#c25fa8",
			"names": {
				"grunt": ["Doorman", "House Muscle", "Floor Watcher"],
				"shooter": ["Balcony Shot", "Quiet Gun"],
				"bruiser": ["Velvet Bull", "Cellar Keeper"],
				"medic": ["House Doctor", "Powder Chemist"],
				"runner": ["Card Runner", "Back-Room Cut"],
				"elite": ["Table Captain", "Silver Collar"],
				"boss": ["Madame Ortolan"],
			},
		},
		"slagworks_union": {
			"name": "Slagworks Union", "color": "#e0762e",
			"names": {
				"grunt": ["Pour Crew", "Slag Hand", "Furnace Watch"],
				"shooter": ["Catwalk Rifle", "Kiln Sniper"],
				"bruiser": ["Ladle Man", "Rolling Mill"],
				"medic": ["Burn Warden", "Works Nurse"],
				"runner": ["Conveyor Rat", "Pipe Crawler"],
				"elite": ["Shift Boss", "Blast Foreman"],
				"boss": ["Foreman Krast"],
			},
		},
		"quietline": {
			"name": "Quietline", "color": "#6fd0ff",
			"names": {
				"grunt": ["Signal Ghost", "Dead Channel", "Grey Suit"],
				"shooter": ["Long Intercept", "Null Marksman"],
				"bruiser": ["Faraday Frame", "Shield Operator"],
				"medic": ["Cold Chain Medic", "Protocol Nurse"],
				"runner": ["Splice", "Carrier Wave"],
				"elite": ["Handler", "Section Lead"],
				"boss": ["The Registrar"],
			},
		},
		"ash_court": {
			"name": "The Ash Court", "color": "#ff5b5b",
			"names": {
				"grunt": ["Cinder Levy", "Ash Conscript", "Soot Warden"],
				"shooter": ["Ember Rifle", "Fall Marksman"],
				"bruiser": ["Kiln Knight", "Slag Colossus"],
				"medic": ["Court Apothecary", "Ash Surgeon"],
				"runner": ["Fume Dancer", "Dust Cutter"],
				"elite": ["Court Blade", "Warden Adjutant"],
				"boss": ["The Ashen Magistrate"],
			},
		},
	}

## Build a concrete enemy unit dictionary.
static func make_enemy(faction_id: String, arch: String, level: int, index: int) -> Dictionary:
	var fac: Dictionary = factions().get(faction_id, factions()["dock_syndicate"])
	var pool: Array = fac["names"].get(arch, ["Operative"])
	var nm: String = String(pool[index % pool.size()])
	var base: Dictionary = archetypes().get(arch, archetypes()["grunt"])
	var g := 1.0 + 0.115 * float(maxi(level, 1) - 1)
	return {
		"uid": "%s_%s_%d" % [faction_id, arch, index],
		"name": nm,
		"arch": arch,
		"klass": base["role"],
		"level": level,
		"faction": faction_id,
		"color": fac["color"],
		"max_hp": int(round(float(base["hp"]) * g)),
		"attack": int(round(float(base["attack"]) * g)),
		"defense": int(round(float(base["defense"]) * g)),
		"speed": int(round(float(base["speed"]) * (1.0 + 0.006 * float(level - 1)))),
		"crit": float(base["crit"]),
		"crit_dmg": float(base["crit_dmg"]),
		"skill": archetype_skill(arch),
		"is_enemy": true,
		"seed": (level * 31 + index * 17 + faction_id.length() * 7),
	}
