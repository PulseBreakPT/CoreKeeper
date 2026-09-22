extends Node
## Automatic squad battle. Speed-gauge turn order, skills, criticals and status
## effects. The simulation runs in real time so the UI can simply watch it.

signal battle_started()
signal unit_changed(uid: String)
signal combat_event(evt: Dictionary)
signal battle_finished(result: Dictionary)

const GAUGE_MAX := 1000.0
const GAUGE_RATE := 6.0          ## gauge points per speed point per second
const BASIC_ENERGY := 26
const HIT_ENERGY := 9
const STALEMATE_SECONDS := 150.0

var active := false
var paused := false
var speed_scale := 1.0
var allies: Array = []
var enemies: Array = []
var team_index := -1
var _elapsed := 0.0
var _rng := RandomNumberGenerator.new()
var _pending_finish := false
var _context: Dictionary = {}
var turn_counter := 0

func _ready() -> void:
	_rng.randomize()
	set_process(true)

# ---- Setup --------------------------------------------------------------

func build_ally_unit(char_id: String, slot: int) -> Dictionary:
	var def := GameData.character(char_id)
	var st := CharacterManager.stats(char_id)
	return {
		"uid": "ally_%s" % char_id,
		"char_id": char_id,
		"name": String(def.get("codename", def.get("name", "Operative"))),
		"full_name": String(def.get("name", "Operative")),
		"klass": String(def.get("klass", "Assault")),
		"level": CharacterManager.level_of(char_id),
		"side": "ally",
		"color": GameData.CharactersData.class_color(String(def.get("klass", "Assault"))),
		"rarity": String(def.get("rarity", "Common")),
		"seed": int(def.get("seed", 1)),
		"max_hp": int(st["max_hp"]), "hp": int(st["max_hp"]),
		"attack": int(st["attack"]), "defense": int(st["defense"]), "speed": int(st["speed"]),
		"crit": float(st["crit"]), "crit_dmg": float(st["crit_dmg"]),
		"skill": def.get("skill", {}),
		"energy": 30, "gauge": 0.0, "shield": 0, "statuses": [],
		"alive": true, "slot": slot,
	}

func build_enemy_unit(src: Dictionary, slot: int) -> Dictionary:
	var u := src.duplicate(true)
	u["side"] = "enemy"
	u["hp"] = int(u["max_hp"])
	u["energy"] = 0
	u["gauge"] = 0.0
	u["shield"] = 0
	u["statuses"] = []
	u["alive"] = true
	u["slot"] = slot
	u["color"] = Color(String(src.get("color", "#ff6a3d")))
	return u

func enemies_for(info: Dictionary) -> Array:
	var out: Array = []
	var faction := String(info.get("faction", "dock_syndicate"))
	var lvl := int(info.get("level", 1))
	var list: Array = info.get("enemies", [])
	for i in range(list.size()):
		out.append(GameData.EnemiesData.make_enemy(faction, String(list[i]), lvl, i))
	return out

func start_battle(team: int, info: Dictionary) -> bool:
	var member_ids := SquadManager.members(team)
	if member_ids.is_empty():
		return false
	allies = []
	for i in range(member_ids.size()):
		allies.append(build_ally_unit(String(member_ids[i]), i))
	enemies = []
	var raw := enemies_for(info)
	for i in range(raw.size()):
		enemies.append(build_enemy_unit(raw[i], i))
	team_index = team
	_context = info.duplicate(true)
	_elapsed = 0.0
	turn_counter = 0
	_pending_finish = false
	speed_scale = 1.0
	paused = false
	active = true
	battle_started.emit()
	return true

func all_units() -> Array:
	var out: Array = []
	out.append_array(allies)
	out.append_array(enemies)
	return out

func unit_by_uid(uid: String) -> Dictionary:
	for u in all_units():
		if String(u["uid"]) == uid:
			return u
	return {}

func context() -> Dictionary:
	return _context

# ---- Main loop ----------------------------------------------------------

func _process(delta: float) -> void:
	if not active or paused or _pending_finish:
		return
	var dt := delta * speed_scale
	_elapsed += dt
	for u in all_units():
		if not bool(u["alive"]):
			continue
		u["gauge"] = float(u["gauge"]) + _eff_speed(u) * GAUGE_RATE * dt
	# Act in gauge order so the fastest unit always resolves first.
	var ready_units: Array = []
	for u in all_units():
		if bool(u["alive"]) and float(u["gauge"]) >= GAUGE_MAX:
			ready_units.append(u)
	ready_units.sort_custom(func(a, b): return float(a["gauge"]) > float(b["gauge"]))
	for u in ready_units:
		if not active or _pending_finish:
			break
		if not bool(u["alive"]):
			continue
		u["gauge"] = float(u["gauge"]) - GAUGE_MAX
		_take_turn(u)
		_check_end()
	if _elapsed > STALEMATE_SECONDS and not _pending_finish:
		_finish(_side_hp_ratio(allies) >= _side_hp_ratio(enemies), true)

func _side_hp_ratio(side: Array) -> float:
	var cur := 0.0
	var mx := 0.0
	for u in side:
		cur += float(u["hp"])
		mx += float(u["max_hp"])
	return 0.0 if mx <= 0.0 else cur / mx

func _check_end() -> void:
	if _pending_finish:
		return
	if _living(enemies).is_empty():
		_finish(true, false)
	elif _living(allies).is_empty():
		_finish(false, false)

func _finish(victory: bool, timeout: bool) -> void:
	_pending_finish = true
	active = false
	var survivors: Array = []
	for u in _living(allies):
		survivors.append(String(u.get("char_id", "")))
	var payload := ExpeditionManager.resolve_combat(team_index, victory, survivors)
	var killed := 0
	for u in enemies:
		if not bool(u["alive"]):
			killed += 1
	if killed > 0:
		MissionManager.track("enemies_defeated", killed)
	var result := {
		"victory": victory, "timeout": timeout, "killed": killed,
		"survivors": survivors.size(), "team": team_index,
		"payload": payload, "turns": turn_counter,
	}
	battle_finished.emit(result)

func abandon() -> void:
	if not active:
		return
	active = false
	_pending_finish = true
	ExpeditionManager.resolve_combat(team_index, false, [])
	battle_finished.emit({"victory": false, "timeout": false, "killed": 0, "survivors": 0,
		"team": team_index, "payload": {}, "turns": turn_counter})

# ---- Turn ---------------------------------------------------------------

func _take_turn(u: Dictionary) -> void:
	turn_counter += 1
	combat_event.emit({"type": "turn", "uid": u["uid"]})
	_tick_statuses(u)
	if not bool(u["alive"]):
		return
	if _has_status(u, "stun"):
		combat_event.emit({"type": "status_text", "uid": u["uid"], "text": "STUNNED"})
		unit_changed.emit(String(u["uid"]))
		return
	var skill: Dictionary = u.get("skill", {})
	if not skill.is_empty() and int(u["energy"]) >= int(skill.get("cost", 100)):
		u["energy"] = 0
		_use_skill(u, skill)
	else:
		_basic_attack(u)
		u["energy"] = mini(int(u["energy"]) + BASIC_ENERGY, 120)
	unit_changed.emit(String(u["uid"]))

func _tick_statuses(u: Dictionary) -> void:
	var keep: Array = []
	for s in u["statuses"]:
		var kind := String(s["kind"])
		if kind == "burn" or kind == "bleed":
			var dmg := int(maxf(float(s.get("dmg", 0.0)), 1.0))
			_apply_damage(u, dmg, false, kind.to_upper())
			if not bool(u["alive"]):
				return
		s["turns"] = int(s["turns"]) - 1
		if int(s["turns"]) > 0:
			keep.append(s)
	u["statuses"] = keep

func _living(side: Array) -> Array:
	var out: Array = []
	for u in side:
		if bool(u["alive"]):
			out.append(u)
	return out

func _opponents(u: Dictionary) -> Array:
	return _living(enemies) if String(u["side"]) == "ally" else _living(allies)

func _friends(u: Dictionary) -> Array:
	return _living(allies) if String(u["side"]) == "ally" else _living(enemies)

func _pick_targets(u: Dictionary, mode: String, hits: int) -> Array:
	var pool := _opponents(u)
	if pool.is_empty():
		return []
	match mode:
		"all":
			return pool.duplicate()
		"front":
			var sorted_pool := pool.duplicate()
			sorted_pool.sort_custom(func(a, b): return int(a["slot"]) < int(b["slot"]))
			return [sorted_pool[0]]
		"lowest_hp":
			var best: Dictionary = pool[0]
			for c in pool:
				if float(c["hp"]) / float(c["max_hp"]) < float(best["hp"]) / float(best["max_hp"]):
					best = c
			return [best]
		"highest_attack":
			var top: Dictionary = pool[0]
			for c in pool:
				if _eff_attack(c) > _eff_attack(top):
					top = c
			return [top]
		"random":
			var out: Array = []
			for i in range(maxi(hits, 1)):
				out.append(pool[_rng.randi_range(0, pool.size() - 1)])
			return out
		_:
			return [pool[_rng.randi_range(0, pool.size() - 1)]]

func _pick_allies(u: Dictionary, mode: String) -> Array:
	var pool := _friends(u)
	if pool.is_empty():
		return []
	match mode:
		"all_allies":
			return pool.duplicate()
		"lowest_two_allies":
			var sorted_pool := pool.duplicate()
			sorted_pool.sort_custom(func(a, b):
				return float(a["hp"]) / float(a["max_hp"]) < float(b["hp"]) / float(b["max_hp"]))
			return sorted_pool.slice(0, mini(2, sorted_pool.size()))
		_:
			var best: Dictionary = pool[0]
			for c in pool:
				if float(c["hp"]) / float(c["max_hp"]) < float(best["hp"]) / float(best["max_hp"]):
					best = c
			return [best]

func _basic_attack(u: Dictionary) -> void:
	var targets := _pick_targets(u, "front" if String(u["klass"]) == "Tank" else "random", 1)
	if targets.is_empty():
		return
	combat_event.emit({"type": "attack", "uid": u["uid"], "target": targets[0]["uid"]})
	_strike(u, targets[0], 1.0, 0.0, 0.0, "")

func _use_skill(u: Dictionary, skill: Dictionary) -> void:
	combat_event.emit({"type": "skill", "uid": u["uid"], "name": String(skill.get("name", "Skill"))})
	var kind := String(skill.get("type", "damage"))
	if kind == "heal":
		var targets := _pick_allies(u, String(skill.get("targets", "lowest_ally")))
		var amount := int(round(float(_eff_attack(u)) * float(skill.get("power", 1.0)) * 1.15))
		for t in targets:
			_apply_heal(t, amount)
			var cleanse := int(skill.get("cleanse", 0))
			if cleanse > 0:
				_cleanse(t, cleanse)
			if skill.has("shield"):
				_add_shield(t, int(round(float(t["max_hp"]) * float(skill["shield"]))))
		_apply_team_buffs(u, skill)
	elif kind == "shield":
		var targets2 := _pick_allies(u, String(skill.get("targets", "all_allies")))
		var amt := int(round(float(u["max_hp"]) * float(skill.get("power", 0.2))))
		for t in targets2:
			_add_shield(t, amt)
		_apply_team_buffs(u, skill)
	else:
		var mode := String(skill.get("targets", "random"))
		var hits := int(skill.get("hits", 1))
		var targets3 := _pick_targets(u, mode, hits)
		var splash := float(skill.get("splash", 0.0))
		var power := float(skill.get("power", 1.0))
		var crit_bonus := float(skill.get("crit_bonus", 0.0))
		var pierce := float(skill.get("pierce", 0.0))
		var dealt := 0
		for t in targets3:
			dealt += _strike(u, t, power, crit_bonus, pierce, String(skill.get("name", "")))
			if skill.has("status"):
				_apply_status(t, skill["status"], u)
			if skill.has("debuff"):
				_apply_debuff(t, skill["debuff"])
		if splash > 0.0:
			for t in _opponents(u):
				if targets3.has(t):
					continue
				_strike(u, t, power * splash, 0.0, pierce, "")
				if skill.has("status"):
					_apply_status(t, skill["status"], u)
		if skill.has("lifesteal") and dealt > 0:
			_apply_heal(u, int(round(float(dealt) * float(skill["lifesteal"]))))
		_apply_team_buffs(u, skill)

func _apply_team_buffs(u: Dictionary, skill: Dictionary) -> void:
	for key in ["buff", "buff2"]:
		if not skill.has(key):
			continue
		var b: Dictionary = skill[key]
		for t in _friends(u):
			_add_status(t, {"kind": "buff", "stat": String(b["stat"]), "amount": float(b["amount"]),
				"turns": int(b.get("turns", 3))})
			combat_event.emit({"type": "status_text", "uid": t["uid"],
				"text": "+%s" % String(b["stat"]).to_upper()})

func _apply_debuff(t: Dictionary, b: Dictionary) -> void:
	_add_status(t, {"kind": "debuff", "stat": String(b["stat"]), "amount": -float(b["amount"]),
		"turns": int(b.get("turns", 3))})
	combat_event.emit({"type": "status_text", "uid": t["uid"], "text": "-%s" % String(b["stat"]).to_upper()})

func _apply_status(t: Dictionary, s: Dictionary, source: Dictionary) -> void:
	var kind := String(s["kind"])
	var entry := {"kind": kind, "turns": int(s.get("turns", 2)), "power": float(s.get("power", 0.0))}
	if kind == "burn" or kind == "bleed":
		entry["dmg"] = float(_eff_attack(source)) * float(s.get("power", 0.25))
	_add_status(t, entry)
	combat_event.emit({"type": "status_text", "uid": t["uid"], "text": kind.to_upper()})

func _add_status(u: Dictionary, entry: Dictionary) -> void:
	for s in u["statuses"]:
		if String(s["kind"]) == String(entry["kind"]) and String(s.get("stat", "")) == String(entry.get("stat", "")):
			s["turns"] = maxi(int(s["turns"]), int(entry["turns"]))
			if entry.has("dmg"):
				s["dmg"] = maxf(float(s.get("dmg", 0.0)), float(entry["dmg"]))
			if entry.has("amount"):
				s["amount"] = entry["amount"]
			unit_changed.emit(String(u["uid"]))
			return
	u["statuses"].append(entry)
	unit_changed.emit(String(u["uid"]))

func _cleanse(u: Dictionary, count: int) -> void:
	var removed := 0
	var keep: Array = []
	for s in u["statuses"]:
		var bad := ["burn", "bleed", "stun", "slow", "marked", "debuff"].has(String(s["kind"]))
		if bad and removed < count:
			removed += 1
			continue
		keep.append(s)
	u["statuses"] = keep
	if removed > 0:
		combat_event.emit({"type": "status_text", "uid": u["uid"], "text": "CLEANSED"})
		unit_changed.emit(String(u["uid"]))

func _has_status(u: Dictionary, kind: String) -> bool:
	for s in u["statuses"]:
		if String(s["kind"]) == kind:
			return true
	return false

func _status_power(u: Dictionary, kind: String) -> float:
	var t := 0.0
	for s in u["statuses"]:
		if String(s["kind"]) == kind:
			t += float(s.get("power", 0.0))
	return t

func _stat_mod(u: Dictionary, stat: String) -> float:
	var m := 0.0
	for s in u["statuses"]:
		if (String(s["kind"]) == "buff" or String(s["kind"]) == "debuff") and String(s.get("stat", "")) == stat:
			m += float(s.get("amount", 0.0))
	return m

func _eff_attack(u: Dictionary) -> float:
	return maxf(float(u["attack"]) * (1.0 + _stat_mod(u, "attack")), 1.0)

func _eff_defense(u: Dictionary) -> float:
	return maxf(float(u["defense"]) * (1.0 + _stat_mod(u, "defense")), 0.0)

func _eff_speed(u: Dictionary) -> float:
	var s := float(u["speed"]) * (1.0 + _stat_mod(u, "speed"))
	s *= (1.0 - _status_power(u, "slow"))
	return maxf(s, 8.0)

func _strike(attacker: Dictionary, target: Dictionary, power: float, crit_bonus: float,
		pierce: float, label: String) -> int:
	if not bool(target["alive"]):
		return 0
	var raw := _eff_attack(attacker) * power
	var dfn := _eff_defense(target) * (1.0 - clampf(pierce, 0.0, 0.9))
	var dmg := raw * (140.0 / (140.0 + dfn))
	dmg *= 1.0 + _status_power(target, "marked")
	dmg *= _rng.randf_range(0.94, 1.06)
	var crit := _rng.randf() < clampf(float(attacker["crit"]) + crit_bonus, 0.0, 0.95)
	if crit:
		dmg *= float(attacker["crit_dmg"])
	var final := maxi(int(round(dmg)), 1)
	_apply_damage(target, final, crit, label)
	target["energy"] = mini(int(target["energy"]) + HIT_ENERGY, 120)
	return final

func _apply_damage(u: Dictionary, amount: int, crit: bool, label: String) -> void:
	if not bool(u["alive"]):
		return
	var remaining := amount
	if int(u["shield"]) > 0:
		var absorbed := mini(int(u["shield"]), remaining)
		u["shield"] = int(u["shield"]) - absorbed
		remaining -= absorbed
		combat_event.emit({"type": "shield_hit", "uid": u["uid"], "amount": absorbed})
	if remaining > 0:
		u["hp"] = maxi(int(u["hp"]) - remaining, 0)
	combat_event.emit({"type": "damage", "uid": u["uid"], "amount": amount, "crit": crit, "label": label})
	unit_changed.emit(String(u["uid"]))
	if int(u["hp"]) <= 0:
		u["alive"] = false
		u["statuses"] = []
		combat_event.emit({"type": "death", "uid": u["uid"]})
		unit_changed.emit(String(u["uid"]))

func _apply_heal(u: Dictionary, amount: int) -> void:
	if not bool(u["alive"]) or amount <= 0:
		return
	var before := int(u["hp"])
	u["hp"] = mini(before + amount, int(u["max_hp"]))
	var real := int(u["hp"]) - before
	if real > 0:
		combat_event.emit({"type": "heal", "uid": u["uid"], "amount": real})
		unit_changed.emit(String(u["uid"]))

func _add_shield(u: Dictionary, amount: int) -> void:
	if not bool(u["alive"]) or amount <= 0:
		return
	u["shield"] = int(u["shield"]) + amount
	combat_event.emit({"type": "shield", "uid": u["uid"], "amount": amount})
	unit_changed.emit(String(u["uid"]))

# ---- Headless helper (used by the automated test pass) ------------------

func simulate_to_end(max_seconds: float = STALEMATE_SECONDS + 10.0, step: float = 0.05) -> void:
	var t := 0.0
	while active and not _pending_finish and t < max_seconds:
		_process(step)
		t += step
