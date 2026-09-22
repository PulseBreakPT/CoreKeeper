extends Node
## Base buildings: levels, construction timers and idle production.
## Production is timestamp driven, so it behaves identically online and offline.

signal state_changed(building_id: String)
signal production_changed(building_id: String)
signal construction_started(building_id: String)
signal construction_finished(building_id: String, new_level: int)
signal collected(building_id: String, bundle: Dictionary)

var state: Dictionary = {}   ## id -> {level, accum:{res:float}, last:float, build:{to,ends} | null}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func reset_new_game() -> void:
	state = {}
	var now := Time.get_unix_time_from_system()
	for id in GameData.buildings.keys():
		state[id] = {"level": 0, "accum": {}, "last": now, "build": null}
	# Starting compound: a headquarters and the basic producers already standing.
	# HQ starts at 2 so there is always something else worth upgrading on day one.
	state["headquarters"]["level"] = 2
	state["power_generator"]["level"] = 1
	state["workshop"]["level"] = 1
	state["warehouse"]["level"] = 1
	for id in state.keys():
		state_changed.emit(id)

func _process(_delta: float) -> void:
	if state.is_empty():
		return
	var now := Time.get_unix_time_from_system()
	tick_production(now)
	tick_construction(now)

# ---- Queries ------------------------------------------------------------

func level_of(id: String) -> int:
	if not state.has(id):
		return 0
	return int(state[id]["level"])

func is_built(id: String) -> bool:
	return level_of(id) > 0

func is_constructing(id: String) -> bool:
	return state.has(id) and state[id]["build"] != null

func construction_remaining(id: String) -> float:
	if not is_constructing(id):
		return 0.0
	return maxf(float(state[id]["build"]["ends"]) - Time.get_unix_time_from_system(), 0.0)

func max_level(id: String) -> int:
	var def := GameData.building(id)
	if def.is_empty():
		return 0
	var hard := int(def["max_level"])
	if id == "headquarters":
		return hard
	return mini(hard, level_of("headquarters"))

func at_level_cap(id: String) -> bool:
	return level_of(id) >= max_level(id)

## Requirements met to build / upgrade at all (independent of cost).
func requirements_met(id: String) -> bool:
	var def := GameData.building(id)
	for req in def.get("requires", {}).keys():
		if level_of(String(req)) < int(def["requires"][req]):
			return false
	return true

func requirement_text(id: String) -> String:
	var def := GameData.building(id)
	var parts: Array = []
	for req in def.get("requires", {}).keys():
		if level_of(String(req)) < int(def["requires"][req]):
			parts.append("%s Lv.%d" % [GameData.building(String(req))["name"], int(def["requires"][req])])
	if parts.is_empty() and at_level_cap(id) and id != "headquarters":
		parts.append("Headquarters Lv.%d" % (level_of(id) + 1))
	return ", ".join(PackedStringArray(parts))

func upgrade_cost(id: String, to_level: int = -1) -> Dictionary:
	var def := GameData.building(id)
	if def.is_empty():
		return {}
	var target := to_level if to_level > 0 else level_of(id) + 1
	var growth := float(def["cost_growth"])
	var f := pow(growth, float(maxi(target - 1, 0)))
	var discount := 1.0 - 0.02 * float(level_of("training_ground"))
	discount = maxf(discount, 0.7)
	var out: Dictionary = {}
	for k in def["cost"].keys():
		out[k] = int(round(float(def["cost"][k]) * f * discount))
	return out

func upgrade_time(id: String, to_level: int = -1) -> float:
	var def := GameData.building(id)
	if def.is_empty():
		return 0.0
	var target := to_level if to_level > 0 else level_of(id) + 1
	var t := float(def["build_time"]) * pow(float(def["build_time_growth"]), float(maxi(target - 1, 0)))
	return t * GameManager.time_scale()

func production_per_minute(id: String, level: int = -1) -> Dictionary:
	var def := GameData.building(id)
	var l := level if level >= 0 else level_of(id)
	var out: Dictionary = {}
	if l <= 0:
		return out
	for res in def.get("produces", {}).keys():
		out[res] = float(def["produces"][res]) * float(l)
	return out

func buffer_minutes() -> float:
	return 120.0 + 15.0 * float(level_of("warehouse"))

func buffer_capacity(id: String) -> Dictionary:
	var out: Dictionary = {}
	for res in production_per_minute(id).keys():
		out[res] = float(production_per_minute(id)[res]) * buffer_minutes()
	return out

func pending(id: String) -> Dictionary:
	if not state.has(id):
		return {}
	var out: Dictionary = {}
	for res in state[id]["accum"].keys():
		var v := int(floor(float(state[id]["accum"][res])))
		if v > 0:
			out[res] = v
	return out

func pending_total(id: String) -> int:
	var t := 0
	for v in pending(id).values():
		t += int(v)
	return t

func buffer_fill_ratio(id: String) -> float:
	var cap := buffer_capacity(id)
	if cap.is_empty():
		return 0.0
	var best := 0.0
	for res in cap.keys():
		var c := float(cap[res])
		if c <= 0.0:
			continue
		best = maxf(best, float(state[id]["accum"].get(res, 0.0)) / c)
	return clampf(best, 0.0, 1.0)

func any_pending() -> bool:
	for id in state.keys():
		if pending_total(id) > 0:
			return true
	return false

# ---- Production ---------------------------------------------------------

## Advances every building's buffer to `now`. Returns what was produced in that span.
func tick_production(now: float) -> Dictionary:
	var produced: Dictionary = {}
	for id in state.keys():
		var st: Dictionary = state[id]
		var dt := maxf(now - float(st["last"]), 0.0)
		st["last"] = now
		if dt <= 0.0:
			continue
		var rates := production_per_minute(id)
		if rates.is_empty():
			continue
		var cap := buffer_capacity(id)
		for res in rates.keys():
			var gain := float(rates[res]) * dt / 60.0
			var cur := float(st["accum"].get(res, 0.0))
			var lim := float(cap.get(res, 0.0))
			var nv := minf(cur + gain, lim)
			var real := nv - cur
			if real > 0.0:
				st["accum"][res] = nv
				produced[res] = float(produced.get(res, 0.0)) + real
				production_changed.emit(id)
	return produced

func collect(id: String) -> Dictionary:
	if not state.has(id):
		return {}
	var bundle := pending(id)
	if bundle.is_empty():
		return {}
	var landed := ResourceManager.add_many(bundle, "production")
	for res in bundle.keys():
		state[id]["accum"][res] = float(state[id]["accum"][res]) - float(bundle[res])
	for res in landed.keys():
		MissionManager.track("collected_%s" % res, int(landed[res]))
	MissionManager.track("resources_collected", 1)
	collected.emit(id, landed)
	production_changed.emit(id)
	SaveManager.mark_dirty()
	return landed

func collect_all() -> Dictionary:
	var total: Dictionary = {}
	for id in GameData.BuildingsData.order():
		var got := collect(id)
		for k in got.keys():
			total[k] = int(total.get(k, 0)) + int(got[k])
	return total

# ---- Construction -------------------------------------------------------

func can_start_upgrade(id: String) -> bool:
	if not state.has(id) or is_constructing(id):
		return false
	if not requirements_met(id):
		return false
	if at_level_cap(id):
		return false
	return ResourceManager.can_afford(upgrade_cost(id))

func blocked_reason(id: String) -> String:
	if is_constructing(id):
		return "Under construction"
	if not requirements_met(id):
		return "Requires " + requirement_text(id)
	if at_level_cap(id):
		if id == "headquarters":
			return "Maximum level reached"
		return "Requires Headquarters Lv.%d" % (level_of(id) + 1)
	if not ResourceManager.can_afford(upgrade_cost(id)):
		var miss := ResourceManager.missing(upgrade_cost(id))
		var parts: Array = []
		for k in miss.keys():
			parts.append("%s %s" % [GameData.fmt(float(miss[k])), GameData.resource_label(String(k))])
		return "Need " + ", ".join(PackedStringArray(parts))
	return ""

func start_upgrade(id: String) -> bool:
	if not can_start_upgrade(id):
		return false
	var cost := upgrade_cost(id)
	if not ResourceManager.spend(cost):
		return false
	var dur := upgrade_time(id)
	var now := Time.get_unix_time_from_system()
	state[id]["build"] = {"to": level_of(id) + 1, "ends": now + dur, "dur": dur}
	construction_started.emit(id)
	state_changed.emit(id)
	SaveManager.mark_dirty()
	return true

func rush_construction(id: String) -> bool:
	if not is_constructing(id):
		return false
	var cost := {"tokens": maxi(1, int(ceil(construction_remaining(id) / 30.0)))}
	if not GameManager.dev_mode and not ResourceManager.spend(cost):
		return false
	state[id]["build"]["ends"] = Time.get_unix_time_from_system()
	tick_construction(Time.get_unix_time_from_system())
	return true

func complete_all_construction() -> void:
	var now := Time.get_unix_time_from_system()
	for id in state.keys():
		if state[id]["build"] != null:
			state[id]["build"]["ends"] = now
	tick_construction(now)

func tick_construction(now: float) -> Array:
	var done: Array = []
	for id in state.keys():
		var b = state[id]["build"]
		if b == null:
			continue
		if now >= float(b["ends"]):
			var lvl := int(b["to"])
			state[id]["level"] = lvl
			state[id]["build"] = null
			done.append({"id": id, "level": lvl})
			MissionManager.track("buildings_upgraded", 1)
			construction_finished.emit(id, lvl)
			state_changed.emit(id)
			GameManager.on_building_completed(id, lvl)
			SaveManager.mark_dirty()
	return done

# ---- Derived ------------------------------------------------------------

func base_power() -> int:
	var p := 0
	for id in state.keys():
		var def := GameData.building(id)
		p += int(def.get("power", 0)) * level_of(id)
	return p

func total_levels() -> int:
	var t := 0
	for id in state.keys():
		t += level_of(id)
	return t

func teams_unlocked() -> int:
	var g := level_of("garage")
	if g >= 6:
		return 3
	if g >= 3:
		return 2
	return 1

func roster_capacity() -> int:
	return 3 + level_of("barracks")

func recon_radius_bonus() -> float:
	return 0.35 * float(level_of("intel_center"))

func travel_multiplier() -> float:
	return maxf(0.4, 1.0 - 0.03 * float(level_of("garage")))

func squad_hp_bonus() -> float:
	return 0.03 * float(level_of("medical_center"))

func character_xp_bonus() -> float:
	return 0.06 * float(level_of("training_ground"))

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {"state": state.duplicate(true)}

func load_state(d: Dictionary) -> void:
	var loaded = d.get("state", {})
	var now := Time.get_unix_time_from_system()
	state = {}
	for id in GameData.buildings.keys():
		var src = loaded.get(id, null)
		if typeof(src) == TYPE_DICTIONARY:
			var accum: Dictionary = {}
			var a = src.get("accum", {})
			if typeof(a) == TYPE_DICTIONARY:
				for k in a.keys():
					accum[k] = float(a[k])
			var b = src.get("build", null)
			if typeof(b) == TYPE_DICTIONARY:
				b = {"to": int(b.get("to", 1)), "ends": float(b.get("ends", now)), "dur": float(b.get("dur", 1.0))}
			else:
				b = null
			state[id] = {
				"level": int(src.get("level", 0)),
				"accum": accum,
				"last": float(src.get("last", now)),
				"build": b,
			}
		else:
			state[id] = {"level": 0, "accum": {}, "last": now, "build": null}
		state_changed.emit(id)
