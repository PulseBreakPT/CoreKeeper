extends Node
## Deployments: travel out, fight, travel back. Everything is timestamp driven so
## a closed app and an open one advance identically.

signal expedition_changed(team: int)
signal arrived(team: int)
signal returned(team: int)

const STATE_IDLE := "idle"
const STATE_TRAVEL := "travel"
const STATE_ARRIVED := "arrived"
const STATE_RETURN := "return"

const KIND_LOCATION := "location"
const KIND_EVENT := "event"

var slots: Array = []   ## per team dictionaries

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_slots()

func _ensure_slots() -> void:
	if slots.size() != SquadManager.TEAM_COUNT:
		slots = []
		for i in range(SquadManager.TEAM_COUNT):
			slots.append(_empty_slot())

func _empty_slot() -> Dictionary:
	return {
		"state": STATE_IDLE, "kind": "", "target": "", "region": "",
		"start": 0.0, "ends": 0.0, "from": Vector2.ZERO, "to": Vector2.ZERO,
		"members": [], "energy": 0, "pending_result": null,
	}

func reset_new_game() -> void:
	slots = []
	for i in range(SquadManager.TEAM_COUNT):
		slots.append(_empty_slot())
	for i in range(SquadManager.TEAM_COUNT):
		expedition_changed.emit(i)

func _process(_delta: float) -> void:
	tick(Time.get_unix_time_from_system())

func tick(now: float) -> Array:
	_ensure_slots()
	var events: Array = []
	for i in range(slots.size()):
		var s: Dictionary = slots[i]
		if s["state"] == STATE_TRAVEL and now >= float(s["ends"]):
			s["state"] = STATE_ARRIVED
			events.append({"team": i, "event": "arrived"})
			arrived.emit(i)
			expedition_changed.emit(i)
			SaveManager.mark_dirty()
		elif s["state"] == STATE_RETURN and now >= float(s["ends"]):
			var was: String = String(s["target"])
			slots[i] = _empty_slot()
			events.append({"team": i, "event": "returned", "target": was})
			returned.emit(i)
			expedition_changed.emit(i)
			SaveManager.mark_dirty()
	return events

# ---- Queries ------------------------------------------------------------

func team_state(team: int) -> String:
	_ensure_slots()
	if team < 0 or team >= slots.size():
		return STATE_IDLE
	return String(slots[team]["state"])

func slot(team: int) -> Dictionary:
	_ensure_slots()
	if team < 0 or team >= slots.size():
		return _empty_slot()
	return slots[team]

func remaining(team: int) -> float:
	var s := slot(team)
	if s["state"] != STATE_TRAVEL and s["state"] != STATE_RETURN:
		return 0.0
	return maxf(float(s["ends"]) - Time.get_unix_time_from_system(), 0.0)

func progress(team: int) -> float:
	var s := slot(team)
	var span := float(s["ends"]) - float(s["start"])
	if span <= 0.0:
		return 1.0
	return clampf(1.0 - remaining(team) / span, 0.0, 1.0)

func marker_position(team: int) -> Vector2:
	var s := slot(team)
	var t := progress(team)
	if s["state"] == STATE_RETURN:
		return (s["to"] as Vector2).lerp(s["from"] as Vector2, t)
	if s["state"] == STATE_ARRIVED:
		return s["to"]
	return (s["from"] as Vector2).lerp(s["to"] as Vector2, t)

func active_teams_in_region(region_id: String) -> Array:
	var out: Array = []
	for i in range(slots.size()):
		if String(slots[i]["region"]) == region_id and slots[i]["state"] != STATE_IDLE:
			out.append(i)
	return out

func team_busy_on(target_id: String) -> int:
	for i in range(slots.size()):
		if String(slots[i]["target"]) == target_id and slots[i]["state"] != STATE_IDLE:
			return i
	return -1

func first_idle_team() -> int:
	for i in range(SquadManager.unlocked_count()):
		if team_state(i) == STATE_IDLE:
			return i
	return -1

# ---- Target description -------------------------------------------------

## Unified view over map locations and temporary events.
func target_info(kind: String, target_id: String) -> Dictionary:
	if kind == KIND_EVENT:
		return EventManager.target_info(target_id)
	var loc := GameData.location(target_id)
	if loc.is_empty():
		return {}
	return {
		"id": target_id, "kind": KIND_LOCATION, "name": String(loc["name"]),
		"type": String(loc["type"]), "type_label": GameData.RegionsData.type_label(String(loc["type"])),
		"region": String(loc["region"]), "pos": loc["pos"], "level": int(loc["level"]),
		"difficulty": int(loc["difficulty"]), "energy": int(loc["energy"]),
		"travel": float(loc["travel"]), "enemies": loc["enemies"], "rewards": loc["rewards"],
		"xp": int(loc["xp"]), "player_xp": int(loc["player_xp"]), "faction": String(loc["faction"]),
		"color": GameData.RegionsData.type_color(String(loc["type"])),
	}

func travel_seconds(info: Dictionary) -> float:
	return float(info.get("travel", 20.0)) * BuildingManager.travel_multiplier() * GameManager.time_scale()

func recommended_power(info: Dictionary) -> int:
	var lvl := int(info.get("level", 1))
	var diff := int(info.get("difficulty", 1))
	var n := (info.get("enemies", []) as Array).size()
	var per := 240.0 + 150.0 * float(lvl - 1)
	return int(round(per * float(n) * (0.7 + 0.12 * float(diff))))

func deploy_blocked_reason(team: int, kind: String, target_id: String) -> String:
	if not SquadManager.is_unlocked(team):
		return "%s locked — %s" % [SquadManager.team_name(team), SquadManager.unlock_hint(team)]
	if team_state(team) != STATE_IDLE:
		return "%s is already deployed" % SquadManager.team_name(team)
	if SquadManager.members(team).is_empty():
		return "%s has no operatives" % SquadManager.team_name(team)
	var info := target_info(kind, target_id)
	if info.is_empty():
		return "Target no longer available"
	if kind == KIND_LOCATION:
		if not MapManager.is_discovered(target_id):
			return "Location not discovered"
		if MapManager.is_locked(target_id):
			return MapManager.lock_reason(target_id)
	if team_busy_on(target_id) >= 0:
		return "Another team is already there"
	if not ResourceManager.has_energy(int(info.get("energy", 0))):
		return "Not enough Energy (%d needed)" % int(info.get("energy", 0))
	return ""

func can_deploy(team: int, kind: String, target_id: String) -> bool:
	return deploy_blocked_reason(team, kind, target_id) == ""

func deploy(team: int, kind: String, target_id: String) -> bool:
	if not can_deploy(team, kind, target_id):
		return false
	var info := target_info(kind, target_id)
	var cost := int(info.get("energy", 0))
	if not ResourceManager.spend_energy(cost):
		return false
	var now := Time.get_unix_time_from_system()
	var dur := travel_seconds(info)
	var region := String(info.get("region", MapManager.current_region))
	var s := _empty_slot()
	s["state"] = STATE_TRAVEL
	s["kind"] = kind
	s["target"] = target_id
	s["region"] = region
	s["start"] = now
	s["ends"] = now + dur
	s["from"] = MapManager.entry_point(region)
	s["to"] = info.get("pos", Vector2.ZERO)
	s["members"] = SquadManager.members(team).duplicate()
	s["energy"] = cost
	slots[team] = s
	expedition_changed.emit(team)
	SaveManager.mark_dirty()
	return true

func recall(team: int) -> bool:
	var s := slot(team)
	if s["state"] == STATE_IDLE or s["state"] == STATE_RETURN:
		return false
	_begin_return(team)
	return true

func _begin_return(team: int) -> void:
	var s: Dictionary = slots[team]
	var info := target_info(String(s["kind"]), String(s["target"]))
	var dur := maxf(travel_seconds(info) * 0.5, 2.0)
	var now := Time.get_unix_time_from_system()
	s["state"] = STATE_RETURN
	s["start"] = now
	s["ends"] = now + dur
	expedition_changed.emit(team)
	SaveManager.mark_dirty()

## Called by CombatManager once a battle finishes.
func resolve_combat(team: int, victory: bool, survivors: Array) -> Dictionary:
	var s := slot(team)
	if String(s["state"]) != STATE_ARRIVED:
		return {}
	var kind := String(s["kind"])
	var target := String(s["target"])
	var info := target_info(kind, target)
	var payload: Dictionary = {"victory": victory, "target": target, "kind": kind, "name": info.get("name", "")}
	if victory:
		var first := false
		if kind == KIND_LOCATION:
			first = MapManager.is_first_clear(target)
		var loot := LootManager.roll_rewards(info, first)
		payload["rewards"] = loot
		payload["first_clear"] = first
		LootManager.grant(loot)
		var xp := int(info.get("xp", 0))
		for cid in s["members"]:
			CharacterManager.add_xp(String(cid), xp)
		payload["character_xp"] = xp
		var pxp := int(info.get("player_xp", 0))
		if first:
			pxp *= 2
		GameManager.add_player_xp(pxp)
		payload["player_xp"] = pxp
		MissionManager.track("expeditions_completed", 1)
		MissionManager.track("combats_won", 1)
		if kind == KIND_LOCATION:
			MapManager.register_clear(target)
		else:
			EventManager.consume(target)
	else:
		payload["rewards"] = {}
		MissionManager.track("expeditions_failed", 1)
	_begin_return(team)
	SaveManager.mark_dirty()
	return payload

# ---- Dev ----------------------------------------------------------------

func complete_travel(team: int) -> void:
	var s := slot(team)
	if String(s["state"]) == STATE_TRAVEL or String(s["state"]) == STATE_RETURN:
		s["ends"] = Time.get_unix_time_from_system()
		tick(Time.get_unix_time_from_system())

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	var out: Array = []
	for s in slots:
		out.append({
			"state": s["state"], "kind": s["kind"], "target": s["target"], "region": s["region"],
			"start": s["start"], "ends": s["ends"],
			"from_x": (s["from"] as Vector2).x, "from_y": (s["from"] as Vector2).y,
			"to_x": (s["to"] as Vector2).x, "to_y": (s["to"] as Vector2).y,
			"members": (s["members"] as Array).duplicate(), "energy": s["energy"],
		})
	return {"slots": out}

func load_state(d: Dictionary) -> void:
	slots = []
	var arr = d.get("slots", [])
	for i in range(SquadManager.TEAM_COUNT):
		var s := _empty_slot()
		if typeof(arr) == TYPE_ARRAY and i < arr.size() and typeof(arr[i]) == TYPE_DICTIONARY:
			var src: Dictionary = arr[i]
			s["state"] = String(src.get("state", STATE_IDLE))
			s["kind"] = String(src.get("kind", ""))
			s["target"] = String(src.get("target", ""))
			s["region"] = String(src.get("region", ""))
			s["start"] = float(src.get("start", 0.0))
			s["ends"] = float(src.get("ends", 0.0))
			s["from"] = Vector2(float(src.get("from_x", 0.0)), float(src.get("from_y", 0.0)))
			s["to"] = Vector2(float(src.get("to_x", 0.0)), float(src.get("to_y", 0.0)))
			s["energy"] = int(src.get("energy", 0))
			var m: Array = []
			if typeof(src.get("members", [])) == TYPE_ARRAY:
				for cid in src["members"]:
					m.append(String(cid))
			s["members"] = m
			# A target that no longer exists (expired event) sends the team home.
			if s["state"] != STATE_IDLE and target_info(String(s["kind"]), String(s["target"])).is_empty():
				s["state"] = STATE_RETURN
				s["ends"] = minf(float(s["ends"]), Time.get_unix_time_from_system())
		slots.append(s)
		expedition_changed.emit(i)
