extends Node
## Temporary map events. They appear inside explored ground, run a countdown and
## vanish. Single-player only — no server, no schedule beyond the local clock.

signal events_changed(region_id: String)
signal event_expired(uid: String)

var active: Array = []            ## [{uid, tpl, region, x, y, expires, level, difficulty}]
var next_spawn_at: float = 0.0
var _counter: int = 0
var _rng := RandomNumberGenerator.new()

const MIN_SPAWN_GAP := 75.0
const MAX_SPAWN_GAP := 210.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.randomize()

func reset_new_game() -> void:
	active = []
	_counter = 0
	next_spawn_at = Time.get_unix_time_from_system() + 25.0

func max_concurrent() -> int:
	return 2 + int(BuildingManager.level_of("operations_center") / 4)

func _process(_delta: float) -> void:
	tick(Time.get_unix_time_from_system())

func tick(now: float) -> int:
	var changed_regions: Dictionary = {}
	var keep: Array = []
	for e in active:
		if now >= float(e["expires"]):
			changed_regions[String(e["region"])] = true
			event_expired.emit(String(e["uid"]))
		else:
			keep.append(e)
	var expired := active.size() - keep.size()
	active = keep
	var spawned := 0
	var guard := 0
	while now >= next_spawn_at and guard < 8:
		guard += 1
		next_spawn_at = now + _rng.randf_range(MIN_SPAWN_GAP, MAX_SPAWN_GAP) * GameManager.time_scale()
		if active.size() >= max_concurrent():
			continue
		var e := _spawn(now)
		if not e.is_empty():
			spawned += 1
			changed_regions[String(e["region"])] = true
	for rid in changed_regions.keys():
		events_changed.emit(String(rid))
	if expired > 0 or spawned > 0:
		SaveManager.mark_dirty()
	return spawned

func _pick_template() -> Dictionary:
	var tpls := GameData.EventsData.templates()
	var total := 0.0
	for t in tpls:
		total += float(t["weight"])
	var r := _rng.randf() * total
	for t in tpls:
		r -= float(t["weight"])
		if r <= 0.0:
			return t
	return tpls[0]

func _spawn(now: float) -> Dictionary:
	var regions: Array = []
	for rid in GameData.region_ids():
		if MapManager.is_unlocked(String(rid)) and MapManager.revealed_cells(String(rid)) > 2:
			regions.append(String(rid))
	if regions.is_empty():
		return {}
	var region := String(regions[_rng.randi_range(0, regions.size() - 1)])
	var cell := GameData.RegionsData.FOG_CELL
	var candidates: Array = []
	for cy in range(MapManager.rows()):
		for cx in range(MapManager.cols()):
			if MapManager.is_cell_revealed(region, cx, cy):
				candidates.append(Vector2(float(cx), float(cy)))
	if candidates.is_empty():
		return {}
	var c: Vector2 = candidates[_rng.randi_range(0, candidates.size() - 1)]
	var pos := Vector2(c.x * cell + cell * 0.5, c.y * cell + cell * 0.5)
	pos += Vector2(_rng.randf_range(-cell * 0.3, cell * 0.3), _rng.randf_range(-cell * 0.3, cell * 0.3))
	# keep events off the top of existing markers
	for loc in GameData.locations_in_region(region):
		if (loc["pos"] as Vector2).distance_to(pos) < 90.0:
			pos += Vector2(110.0, 90.0)
	var tpl := _pick_template()
	var rdef := GameData.region(region)
	_counter += 1
	var e := {
		"uid": "evt_%d" % _counter,
		"tpl": String(tpl["id"]),
		"region": region,
		"x": clampf(pos.x, 80.0, GameData.RegionsData.MAP_W - 80.0),
		"y": clampf(pos.y, 80.0, GameData.RegionsData.MAP_H - 80.0),
		"expires": now + float(tpl["lifetime"]) * GameManager.time_scale(),
		"level": int(rdef["rec_level"]) + int(tpl["difficulty"]),
		"difficulty": int(tpl["difficulty"]),
	}
	active.append(e)
	return e

func in_region(region_id: String) -> Array:
	var out: Array = []
	for e in active:
		if String(e["region"]) == region_id:
			out.append(e)
	return out

func by_uid(uid: String) -> Dictionary:
	for e in active:
		if String(e["uid"]) == uid:
			return e
	return {}

func remaining(uid: String) -> float:
	var e := by_uid(uid)
	if e.is_empty():
		return 0.0
	return maxf(float(e["expires"]) - Time.get_unix_time_from_system(), 0.0)

func target_info(uid: String) -> Dictionary:
	var e := by_uid(uid)
	if e.is_empty():
		return {}
	var tpl := GameData.EventsData.by_id(String(e["tpl"]))
	if tpl.is_empty():
		return {}
	var rdef := GameData.region(String(e["region"]))
	var diff := int(e["difficulty"])
	var prof: Dictionary = GameData.RegionsData.difficulty_profile(diff)
	var lvl := int(e["level"])
	var rewards: Dictionary = {}
	var scale := 1.0 + 0.16 * float(lvl - 1)
	for k in tpl["rewards"].keys():
		rewards[k] = int(round(float(tpl["rewards"][k]) * scale))
	return {
		"id": uid, "kind": ExpeditionManager.KIND_EVENT, "name": String(tpl["name"]),
		"type": "event", "type_label": "Dynamic Event", "blurb": String(tpl["blurb"]),
		"region": String(e["region"]), "pos": Vector2(float(e["x"]), float(e["y"])),
		"level": lvl, "difficulty": diff, "energy": int(prof["energy"]),
		"travel": float(prof["travel"]), "enemies": tpl["enemies"], "rewards": rewards,
		"xp": int(round(30.0 * float(prof["mult"]) * (1.0 + 0.12 * float(lvl - 1)))),
		"player_xp": int(round(18.0 * float(prof["mult"]))),
		"faction": String(rdef.get("faction", "dock_syndicate")),
		"item_pool": tpl.get("item_pool", []),
		"color": Color(String(tpl["color"])),
		"expires_in": remaining(uid),
	}

func consume(uid: String) -> void:
	var e := by_uid(uid)
	if e.is_empty():
		return
	var region := String(e["region"])
	active.erase(e)
	events_changed.emit(region)
	SaveManager.mark_dirty()

func force_spawn() -> Dictionary:
	var e := _spawn(Time.get_unix_time_from_system())
	if not e.is_empty():
		events_changed.emit(String(e["region"]))
	return e

func save_state() -> Dictionary:
	return {"active": active.duplicate(true), "next": next_spawn_at, "counter": _counter}

func load_state(d: Dictionary) -> void:
	active = []
	var a = d.get("active", [])
	if typeof(a) == TYPE_ARRAY:
		for e in a:
			if typeof(e) == TYPE_DICTIONARY and GameData.EventsData.by_id(String(e.get("tpl", ""))).size() > 0:
				active.append({
					"uid": String(e.get("uid", "evt_0")), "tpl": String(e["tpl"]),
					"region": String(e.get("region", "harbour_reach")),
					"x": float(e.get("x", 0.0)), "y": float(e.get("y", 0.0)),
					"expires": float(e.get("expires", 0.0)),
					"level": int(e.get("level", 1)), "difficulty": int(e.get("difficulty", 1)),
				})
	next_spawn_at = float(d.get("next", Time.get_unix_time_from_system() + 60.0))
	_counter = int(d.get("counter", active.size()))
