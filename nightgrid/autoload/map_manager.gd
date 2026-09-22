extends Node
## Regions, fog of war, location discovery and clear records.

signal fog_changed(region_id: String)
signal region_changed(region_id: String)
signal region_unlocked(region_id: String)
signal location_state_changed(loc_id: String)

var current_region: String = "harbour_reach"
var unlocked: Dictionary = {}        ## region_id -> true
var fog: Dictionary = {}             ## region_id -> { "cx,cy": true }
var discovered: Dictionary = {}      ## loc_id -> true
var clears: Dictionary = {}          ## loc_id -> int

func cols() -> int:
	return int(ceil(GameData.RegionsData.MAP_W / GameData.RegionsData.FOG_CELL))

func rows() -> int:
	return int(ceil(GameData.RegionsData.MAP_H / GameData.RegionsData.FOG_CELL))

func reset_new_game() -> void:
	unlocked = {"harbour_reach": true}
	fog = {}
	discovered = {}
	clears = {}
	current_region = "harbour_reach"
	# Open a pocket of the first region around the insertion point (bottom centre).
	reveal_at("harbour_reach", Vector2(GameData.RegionsData.MAP_W * 0.5, GameData.RegionsData.MAP_H - 200.0), 2.2)
	region_changed.emit(current_region)

func entry_point(region_id: String) -> Vector2:
	return Vector2(GameData.RegionsData.MAP_W * 0.5, GameData.RegionsData.MAP_H - 120.0)

# ---- Regions ------------------------------------------------------------

func is_unlocked(region_id: String) -> bool:
	return bool(unlocked.get(region_id, false))

func unlocked_count() -> int:
	return unlocked.size()

func unlock_requirement(region_id: String) -> String:
	var r := GameData.region(region_id)
	if r.is_empty():
		return ""
	var parts: Array = []
	if GameManager.player_level < int(r["unlock_player_level"]):
		parts.append("Player Level %d" % int(r["unlock_player_level"]))
	var prev := String(r.get("unlock_after", ""))
	if prev != "" and not boss_cleared(prev):
		parts.append("%s boss defeated" % GameData.region(prev)["name"])
	return ", ".join(PackedStringArray(parts))

func can_unlock(region_id: String) -> bool:
	if is_unlocked(region_id):
		return false
	return unlock_requirement(region_id) == ""

func try_unlock_all() -> Array:
	var newly: Array = []
	for r in GameData.regions:
		var rid := String(r["id"])
		if can_unlock(rid):
			unlocked[rid] = true
			reveal_at(rid, entry_point(rid), 2.2)
			newly.append(rid)
			region_unlocked.emit(rid)
	if not newly.is_empty():
		MissionManager.track_set("regions_unlocked", unlocked_count())
		SaveManager.mark_dirty()
	return newly

func force_unlock(region_id: String) -> void:
	if unlocked.has(region_id):
		return
	unlocked[region_id] = true
	reveal_at(region_id, entry_point(region_id), 2.2)
	MissionManager.track_set("regions_unlocked", unlocked_count())
	region_unlocked.emit(region_id)
	SaveManager.mark_dirty()

func set_region(region_id: String) -> bool:
	if not is_unlocked(region_id):
		return false
	current_region = region_id
	region_changed.emit(region_id)
	SaveManager.mark_dirty()
	return true

# ---- Fog ----------------------------------------------------------------

func _key(cx: int, cy: int) -> String:
	return "%d,%d" % [cx, cy]

func is_cell_revealed(region_id: String, cx: int, cy: int) -> bool:
	var f = fog.get(region_id, null)
	if f == null:
		return false
	return bool(f.get(_key(cx, cy), false))

func revealed_cells(region_id: String) -> int:
	var f = fog.get(region_id, null)
	return 0 if f == null else f.size()

func fog_ratio(region_id: String) -> float:
	return clampf(float(revealed_cells(region_id)) / float(cols() * rows()), 0.0, 1.0)

## Reveals a disc of cells. radius_cells is in fog-cell units and gets the
## Intel Center bonus added on top.
func reveal_at(region_id: String, world_pos: Vector2, radius_cells: float) -> int:
	var cell := GameData.RegionsData.FOG_CELL
	var r := radius_cells + BuildingManager.recon_radius_bonus()
	var ccx := int(floor(world_pos.x / cell))
	var ccy := int(floor(world_pos.y / cell))
	var ir := int(ceil(r))
	if not fog.has(region_id):
		fog[region_id] = {}
	var f: Dictionary = fog[region_id]
	var opened := 0
	for dy in range(-ir, ir + 1):
		for dx in range(-ir, ir + 1):
			if Vector2(float(dx), float(dy)).length() > r:
				continue
			var cx := ccx + dx
			var cy := ccy + dy
			if cx < 0 or cy < 0 or cx >= cols() or cy >= rows():
				continue
			var k := _key(cx, cy)
			if not f.has(k):
				f[k] = true
				opened += 1
	if opened > 0:
		_refresh_discovery(region_id)
		fog_changed.emit(region_id)
		SaveManager.mark_dirty()
	return opened

func reveal_all(region_id: String) -> void:
	if not fog.has(region_id):
		fog[region_id] = {}
	for cy in range(rows()):
		for cx in range(cols()):
			fog[region_id][_key(cx, cy)] = true
	_refresh_discovery(region_id)
	fog_changed.emit(region_id)
	SaveManager.mark_dirty()

func _refresh_discovery(region_id: String) -> void:
	var cell := GameData.RegionsData.FOG_CELL
	var found := 0
	for loc in GameData.locations_in_region(region_id):
		var lid := String(loc["id"])
		if discovered.has(lid):
			continue
		var p: Vector2 = loc["pos"]
		if is_cell_revealed(region_id, int(floor(p.x / cell)), int(floor(p.y / cell))):
			discovered[lid] = true
			found += 1
			location_state_changed.emit(lid)
	if found > 0:
		MissionManager.track("locations_discovered", found)
		GameManager.add_player_xp(6 * found)

# ---- Locations ----------------------------------------------------------

func is_discovered(loc_id: String) -> bool:
	return discovered.has(loc_id)

func discovered_count() -> int:
	return discovered.size()

func clear_count(loc_id: String) -> int:
	return int(clears.get(loc_id, 0))

func is_cleared(loc_id: String) -> bool:
	return clear_count(loc_id) > 0

func is_first_clear(loc_id: String) -> bool:
	return clear_count(loc_id) == 0

func register_clear(loc_id: String) -> void:
	clears[loc_id] = clear_count(loc_id) + 1
	var loc := GameData.location(loc_id)
	if not loc.is_empty():
		reveal_at(String(loc["region"]), loc["pos"], float(loc.get("reveals", 1.1)))
		if String(loc["type"]) == GameData.RegionsData.TYPE_BOSS:
			MissionManager.track("bosses_defeated", 1)
	location_state_changed.emit(loc_id)
	try_unlock_all()
	SaveManager.mark_dirty()

func boss_cleared(region_id: String) -> bool:
	for loc in GameData.locations_in_region(region_id):
		if String(loc["type"]) == GameData.RegionsData.TYPE_BOSS:
			return is_cleared(String(loc["id"]))
	return false

## Locked because a story mission earlier in the chain is still open.
func is_locked(loc_id: String) -> bool:
	var loc := GameData.location(loc_id)
	if loc.is_empty():
		return true
	if int(loc.get("story_index", -1)) > 0:
		for other in GameData.locations_in_region(String(loc["region"])):
			if int(other.get("story_index", -1)) == int(loc["story_index"]) - 1:
				return not is_cleared(String(other["id"]))
	if String(loc["type"]) == GameData.RegionsData.TYPE_BOSS:
		for other in GameData.locations_in_region(String(loc["region"])):
			if int(other.get("story_index", -1)) >= 0 and not is_cleared(String(other["id"])):
				return true
	return false

func lock_reason(loc_id: String) -> String:
	var loc := GameData.location(loc_id)
	if String(loc["type"]) == GameData.RegionsData.TYPE_BOSS:
		return "Clear both Story Missions in this region first"
	return "Complete the previous Story Mission first"

func region_progress(region_id: String) -> float:
	var locs := GameData.locations_in_region(region_id)
	if locs.is_empty():
		return 0.0
	var done := 0
	for l in locs:
		if is_cleared(String(l["id"])):
			done += 1
	return float(done) / float(locs.size())

func region_completed(region_id: String) -> bool:
	return region_progress(region_id) >= 0.999

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {
		"current": current_region,
		"unlocked": unlocked.duplicate(),
		"fog": fog.duplicate(true),
		"discovered": discovered.duplicate(),
		"clears": clears.duplicate(),
	}

func load_state(d: Dictionary) -> void:
	current_region = String(d.get("current", "harbour_reach"))
	unlocked = {}
	var u = d.get("unlocked", {})
	if typeof(u) == TYPE_DICTIONARY:
		for k in u.keys():
			if GameData.region_ids().has(String(k)):
				unlocked[String(k)] = true
	if unlocked.is_empty():
		unlocked["harbour_reach"] = true
	fog = {}
	var f = d.get("fog", {})
	if typeof(f) == TYPE_DICTIONARY:
		for rid in f.keys():
			if typeof(f[rid]) == TYPE_DICTIONARY:
				fog[String(rid)] = (f[rid] as Dictionary).duplicate()
	discovered = {}
	var dd = d.get("discovered", {})
	if typeof(dd) == TYPE_DICTIONARY:
		for k in dd.keys():
			if GameData.locations.has(String(k)):
				discovered[String(k)] = true
	clears = {}
	var cc = d.get("clears", {})
	if typeof(cc) == TYPE_DICTIONARY:
		for k in cc.keys():
			if GameData.locations.has(String(k)):
				clears[String(k)] = int(cc[k])
	if not is_unlocked(current_region):
		current_region = "harbour_reach"
	region_changed.emit(current_region)
