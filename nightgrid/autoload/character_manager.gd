extends Node
## Roster, levels, equipment and the item inventory.

signal roster_changed()
signal character_changed(char_id: String)
signal inventory_changed()
signal level_up(char_id: String, level: int)

var roster: Dictionary = {}      ## char_id -> {level:int, xp:int, equip:{slot:item_id}}
var inventory: Dictionary = {}   ## item_id -> count (unequipped copies only)

func reset_new_game() -> void:
	roster = {}
	inventory = {}
	for id in GameData.CharactersData.starting_roster():
		_add_raw(String(id))
	add_item("w_scrapper", 2)
	add_item("a_workvest", 2)
	add_item("c_tags", 2)
	roster_changed.emit()
	inventory_changed.emit()

func _add_raw(char_id: String) -> void:
	roster[char_id] = {"level": 1, "xp": 0, "equip": {"weapon": "", "armor": "", "accessory": ""}}

func has(char_id: String) -> bool:
	return roster.has(char_id)

func ids() -> Array:
	var out: Array = []
	for id in GameData.CharactersData.order():
		if roster.has(id):
			out.append(id)
	return out

func roster_size() -> int:
	return roster.size()

func recruitable() -> Array:
	var out: Array = []
	for id in GameData.CharactersData.order():
		if not roster.has(id):
			out.append(id)
	return out

func recruit_cost(char_id: String) -> Dictionary:
	var def := GameData.character(char_id)
	match String(def.get("rarity", "Common")):
		"Legendary": return {"cash": 9000, "supplies": 3000, "intel": 700, "tokens": 30}
		"Epic": return {"cash": 4200, "supplies": 1600, "intel": 300, "tokens": 12}
		"Rare": return {"cash": 2000, "supplies": 800, "intel": 120}
		_: return {"cash": 900, "supplies": 350}

func can_recruit(char_id: String) -> bool:
	if roster.has(char_id):
		return false
	if roster_size() >= BuildingManager.roster_capacity():
		return false
	return ResourceManager.can_afford(recruit_cost(char_id))

func recruit(char_id: String) -> bool:
	if not can_recruit(char_id):
		return false
	if not ResourceManager.spend(recruit_cost(char_id)):
		return false
	_add_raw(char_id)
	MissionManager.track_set("roster_size", roster_size())
	roster_changed.emit()
	SaveManager.mark_dirty()
	return true

func grant_character(char_id: String) -> bool:
	if roster.has(char_id) or not GameData.characters.has(char_id):
		return false
	_add_raw(char_id)
	MissionManager.track_set("roster_size", roster_size())
	roster_changed.emit()
	SaveManager.mark_dirty()
	return true

# ---- Levels and XP ------------------------------------------------------

func level_cap() -> int:
	return maxi(10, GameManager.player_level + 5)

func level_of(char_id: String) -> int:
	return int(roster.get(char_id, {}).get("level", 1))

func xp_of(char_id: String) -> int:
	return int(roster.get(char_id, {}).get("xp", 0))

func xp_to_next(level: int) -> int:
	return int(round(90.0 * pow(float(level), 1.42)))

func train_cost(char_id: String) -> Dictionary:
	var lvl := level_of(char_id)
	var def := GameData.character(char_id)
	var rare := GameData.CharactersData.rarity_multiplier(String(def.get("rarity", "Common")))
	var discount := maxf(0.7, 1.0 - 0.02 * float(BuildingManager.level_of("training_ground")))
	return {
		"cash": int(round(160.0 * pow(1.22, float(lvl)) * rare * discount)),
		"supplies": int(round(60.0 * pow(1.19, float(lvl)) * rare * discount)),
	}

func can_train(char_id: String) -> bool:
	if not roster.has(char_id):
		return false
	if level_of(char_id) >= level_cap():
		return false
	return ResourceManager.can_afford(train_cost(char_id))

func train_blocked_reason(char_id: String) -> String:
	if level_of(char_id) >= level_cap():
		return "Level cap %d — raise your Player Level" % level_cap()
	if not ResourceManager.can_afford(train_cost(char_id)):
		var miss := ResourceManager.missing(train_cost(char_id))
		var parts: Array = []
		for k in miss.keys():
			parts.append("%s %s" % [GameData.fmt(float(miss[k])), GameData.resource_label(String(k))])
		return "Need " + ", ".join(PackedStringArray(parts))
	return ""

## One paid training session: a solid chunk of XP toward the next level.
func train(char_id: String) -> bool:
	if not can_train(char_id):
		return false
	if not ResourceManager.spend(train_cost(char_id)):
		return false
	var chunk := int(round(float(xp_to_next(level_of(char_id))) * 0.55))
	add_xp(char_id, chunk, false)
	MissionManager.track("characters_upgraded", 1)
	SaveManager.mark_dirty()
	return true

func add_xp(char_id: String, amount: int, apply_bonus: bool = true) -> int:
	if not roster.has(char_id) or amount <= 0:
		return 0
	var amt := amount
	if apply_bonus:
		amt = int(round(float(amount) * (1.0 + BuildingManager.character_xp_bonus())))
	var e: Dictionary = roster[char_id]
	e["xp"] = int(e["xp"]) + amt
	var gained_levels := 0
	while int(e["level"]) < level_cap() and int(e["xp"]) >= xp_to_next(int(e["level"])):
		e["xp"] = int(e["xp"]) - xp_to_next(int(e["level"]))
		e["level"] = int(e["level"]) + 1
		gained_levels += 1
		level_up.emit(char_id, int(e["level"]))
		MissionManager.track_max("character_level_reached", int(e["level"]))
	if int(e["level"]) >= level_cap():
		e["xp"] = mini(int(e["xp"]), xp_to_next(int(e["level"])))
	character_changed.emit(char_id)
	roster_changed.emit()
	SaveManager.mark_dirty()
	return gained_levels

# ---- Stats --------------------------------------------------------------

func stats(char_id: String) -> Dictionary:
	var def := GameData.character(char_id)
	if def.is_empty() or not roster.has(char_id):
		return {}
	var base: Dictionary = GameData.CharactersData.class_base(String(def["klass"]))
	var rm: float = GameData.CharactersData.rarity_multiplier(String(def["rarity"]))
	var lvl := level_of(char_id)
	var g := 1.0 + 0.115 * float(lvl - 1)
	var hp := float(base["hp"]) * rm * g
	var atk := float(base["attack"]) * rm * g
	var dfn := float(base["defense"]) * rm * g
	var spd := float(base["speed"]) * (1.0 + 0.006 * float(lvl - 1))
	var crit := float(base["crit"])
	var cdmg := float(base["crit_dmg"])
	for slot in roster[char_id]["equip"].keys():
		var iid := String(roster[char_id]["equip"][slot])
		if iid == "":
			continue
		var it := GameData.item(iid)
		if it.is_empty():
			continue
		var s: Dictionary = it.get("stats", {})
		hp += float(s.get("hp", 0))
		atk += float(s.get("attack", 0))
		dfn += float(s.get("defense", 0))
		spd += float(s.get("speed", 0))
		crit += float(s.get("crit", 0.0))
		cdmg += float(s.get("crit_dmg", 0.0))
	hp *= (1.0 + BuildingManager.squad_hp_bonus())
	return {
		"max_hp": int(round(maxf(hp, 1.0))),
		"attack": int(round(maxf(atk, 1.0))),
		"defense": int(round(maxf(dfn, 0.0))),
		"speed": int(round(maxf(spd, 1.0))),
		"crit": clampf(crit, 0.0, 0.95),
		"crit_dmg": maxf(cdmg, 1.0),
	}

static func power_of_stats(s: Dictionary) -> int:
	if s.is_empty():
		return 0
	var p := float(s["max_hp"]) * 0.55
	p += float(s["attack"]) * 4.4
	p += float(s["defense"]) * 3.2
	p += float(s["speed"]) * 1.8
	p += float(s["crit"]) * 320.0
	p += float(s["crit_dmg"]) * 180.0
	return int(round(p))

func power(char_id: String) -> int:
	return power_of_stats(stats(char_id))

func total_roster_power() -> int:
	var t := 0
	for id in ids():
		t += power(id)
	return t

# ---- Inventory and equipment -------------------------------------------

func add_item(item_id: String, count: int = 1) -> void:
	if not GameData.items.has(item_id) or count <= 0:
		return
	inventory[item_id] = int(inventory.get(item_id, 0)) + count
	inventory_changed.emit()
	SaveManager.mark_dirty()

func item_count(item_id: String) -> int:
	return int(inventory.get(item_id, 0))

func inventory_ids() -> Array:
	var out: Array = []
	for id in GameData.items.keys():
		if item_count(String(id)) > 0:
			out.append(id)
	out.sort_custom(func(a, b):
		var ia := GameData.item(String(a))
		var ib := GameData.item(String(b))
		var ra := GameData.CharactersData.rarity_order().find(String(ia["rarity"]))
		var rb := GameData.CharactersData.rarity_order().find(String(ib["rarity"]))
		if ra != rb:
			return ra > rb
		return GameData.ItemsData.item_power(ia) > GameData.ItemsData.item_power(ib))
	return out

func equipped_item(char_id: String, slot: String) -> String:
	return String(roster.get(char_id, {}).get("equip", {}).get(slot, ""))

func equip(char_id: String, item_id: String) -> bool:
	if not roster.has(char_id) or item_count(item_id) <= 0:
		return false
	var it := GameData.item(item_id)
	if it.is_empty():
		return false
	var slot := String(it["slot"])
	var current := equipped_item(char_id, slot)
	inventory[item_id] = item_count(item_id) - 1
	if int(inventory[item_id]) <= 0:
		inventory.erase(item_id)
	if current != "":
		add_item(current, 1)
	roster[char_id]["equip"][slot] = item_id
	MissionManager.track("items_equipped", 1)
	character_changed.emit(char_id)
	inventory_changed.emit()
	roster_changed.emit()
	SaveManager.mark_dirty()
	return true

func unequip(char_id: String, slot: String) -> bool:
	var current := equipped_item(char_id, slot)
	if current == "":
		return false
	roster[char_id]["equip"][slot] = ""
	add_item(current, 1)
	character_changed.emit(char_id)
	roster_changed.emit()
	SaveManager.mark_dirty()
	return true

## Best unequipped item for a slot, by power.
func best_available_for(slot: String) -> String:
	var best := ""
	var best_p := -1
	for id in inventory_ids():
		var it := GameData.item(String(id))
		if String(it["slot"]) != slot:
			continue
		var p := GameData.ItemsData.item_power(it)
		if p > best_p:
			best_p = p
			best = String(id)
	return best

func auto_equip(char_id: String) -> int:
	var n := 0
	for slot in GameData.ItemsData.slots():
		var cur := equipped_item(char_id, String(slot))
		var cur_p := 0 if cur == "" else GameData.ItemsData.item_power(GameData.item(cur))
		var cand := best_available_for(String(slot))
		if cand == "":
			continue
		if GameData.ItemsData.item_power(GameData.item(cand)) > cur_p:
			if equip(char_id, cand):
				n += 1
	return n

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {"roster": roster.duplicate(true), "inventory": inventory.duplicate()}

func load_state(d: Dictionary) -> void:
	roster = {}
	var r = d.get("roster", {})
	if typeof(r) == TYPE_DICTIONARY:
		for id in r.keys():
			if not GameData.characters.has(id):
				continue
			var src: Dictionary = r[id]
			var eq = src.get("equip", {})
			var equip_clean := {"weapon": "", "armor": "", "accessory": ""}
			if typeof(eq) == TYPE_DICTIONARY:
				for slot in equip_clean.keys():
					var v := String(eq.get(slot, ""))
					equip_clean[slot] = v if GameData.items.has(v) else ""
			roster[id] = {"level": int(src.get("level", 1)), "xp": int(src.get("xp", 0)), "equip": equip_clean}
	inventory = {}
	var inv = d.get("inventory", {})
	if typeof(inv) == TYPE_DICTIONARY:
		for id in inv.keys():
			if GameData.items.has(id) and int(inv[id]) > 0:
				inventory[id] = int(inv[id])
	roster_changed.emit()
	inventory_changed.emit()
