extends Node
## Boots the game, owns player progression and drives offline catch-up.
## Declared last in the autoload list, so every other manager already exists here.

signal booted(offline_report: Dictionary)
signal player_level_changed(level: int, xp: int, needed: int)
signal power_changed(total: int)
signal dev_mode_changed(on: bool)

const VERSION := "0.1.0"

var player_level: int = 1
var player_xp: int = 0
var last_seen: float = 0.0
var total_play_seconds: float = 0.0
var settings: Dictionary = {"combat_speed": 1.0, "haptics": true, "auto_collect": false}

var dev_mode := false
var dev_infinite_energy := false
var dev_fast_timers := false

var booted_ok := false
var offline_report: Dictionary = {}
var _power_cache := -1

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	call_deferred("boot")

func time_scale() -> float:
	return 0.12 if dev_fast_timers else 1.0

# ---- Boot ---------------------------------------------------------------

func boot() -> void:
	if booted_ok:
		return
	var existed := SaveManager.load_game()
	if existed:
		_load_all()
	else:
		new_game()
	booted_ok = true
	offline_report = _catch_up(existed)
	MissionManager.check_periods()
	MapManager.try_unlock_all()
	SaveManager.mark_dirty()
	SaveManager.save_now()
	booted.emit(offline_report)
	_emit_progress()

func new_game() -> void:
	player_level = 1
	player_xp = 0
	last_seen = Time.get_unix_time_from_system()
	total_play_seconds = 0.0
	dev_infinite_energy = false
	dev_fast_timers = false
	ResourceManager.reset_new_game()
	BuildingManager.reset_new_game()
	CharacterManager.reset_new_game()
	SquadManager.reset_new_game()
	MapManager.reset_new_game()
	ExpeditionManager.reset_new_game()
	MissionManager.reset_new_game()
	EventManager.reset_new_game()
	MissionManager.track_set("roster_size", CharacterManager.roster_size())
	MissionManager.track_set("regions_unlocked", MapManager.unlocked_count())

func _load_all() -> void:
	load_state(SaveManager.section("game"))
	ResourceManager.load_state(SaveManager.section("resources"))
	BuildingManager.load_state(SaveManager.section("buildings"))
	CharacterManager.load_state(SaveManager.section("characters"))
	SquadManager.load_state(SaveManager.section("squads"))
	MapManager.load_state(SaveManager.section("map"))
	ExpeditionManager.load_state(SaveManager.section("expeditions"))
	MissionManager.load_state(SaveManager.section("missions"))
	EventManager.load_state(SaveManager.section("events"))
	LootManager.load_state(SaveManager.section("loot"))
	if CharacterManager.roster_size() == 0:
		CharacterManager.reset_new_game()
		SquadManager.reset_new_game()

## Advances every timestamp-driven system to now and reports what happened.
func _catch_up(existed: bool) -> Dictionary:
	var now := Time.get_unix_time_from_system()
	var away := maxf(now - last_seen, 0.0) if existed else 0.0
	var produced := BuildingManager.tick_production(now)
	var built := BuildingManager.tick_construction(now)
	var energy_gained := ResourceManager.refresh_energy(now)
	var exp_events := ExpeditionManager.tick(now)
	EventManager.tick(now)
	last_seen = now
	var prod_round: Dictionary = {}
	for k in produced.keys():
		var v := int(floor(float(produced[k])))
		if v > 0:
			prod_round[k] = v
	return {
		"away": away,
		"show": existed and away >= 60.0,
		"produced": prod_round,
		"built": built,
		"energy": int(floor(energy_gained)),
		"expeditions": exp_events,
	}

# ---- Player progression -------------------------------------------------

func xp_to_next(level: int = -1) -> int:
	var l := level if level > 0 else player_level
	return int(round(140.0 * pow(float(l), 1.32)))

func add_player_xp(amount: int) -> int:
	if amount <= 0:
		return 0
	player_xp += amount
	var gained := 0
	while player_xp >= xp_to_next():
		player_xp -= xp_to_next()
		player_level += 1
		gained += 1
		ResourceManager.grant_energy(25.0)
		LootManager.grant_simple({"cash": 200 * player_level, "materials": 120 * player_level})
	if gained > 0:
		MapManager.try_unlock_all()
	_emit_progress()
	SaveManager.mark_dirty()
	return gained

func _emit_progress() -> void:
	player_level_changed.emit(player_level, player_xp, xp_to_next())
	invalidate_power()

func total_power() -> int:
	if _power_cache < 0:
		_power_cache = BuildingManager.base_power() + CharacterManager.total_roster_power()
	return _power_cache

func invalidate_power() -> void:
	var before := _power_cache
	_power_cache = -1
	var now_p := total_power()
	if now_p != before:
		power_changed.emit(now_p)

func on_building_completed(id: String, level: int) -> void:
	invalidate_power()
	add_player_xp(20 + 14 * level)
	MissionManager.track_set("teams_unlocked", SquadManager.unlocked_count())
	UIManager.say("%s reached level %d" % [GameData.building(id)["name"], level], "good")

# ---- Lifecycle ----------------------------------------------------------

func _process(delta: float) -> void:
	if not booted_ok:
		return
	total_play_seconds += delta
	last_seen = Time.get_unix_time_from_system()
	ResourceManager.refresh_energy(last_seen)

func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_WM_CLOSE_REQUEST, \
		NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_EXIT_TREE:
			if booted_ok:
				last_seen = Time.get_unix_time_from_system()
				SaveManager.save_now()

# ---- Dev ----------------------------------------------------------------

func set_dev_mode(on: bool) -> void:
	dev_mode = on
	dev_mode_changed.emit(on)

func dev_add_resources(mult: float = 1.0) -> void:
	LootManager.grant_simple({
		"cash": int(25000 * mult), "materials": int(18000 * mult), "fuel": int(12000 * mult),
		"intel": int(3000 * mult), "supplies": int(9000 * mult), "tokens": int(200 * mult),
	})
	UIManager.say("Resources added", "good")

func dev_reset_save() -> void:
	SaveManager.wipe()
	new_game()
	SaveManager.save_now()
	UIManager.say("Save wiped — fresh compound", "warn")

func dev_give_items(count: int = 6) -> void:
	var ids := GameData.items.keys()
	for i in range(count):
		CharacterManager.add_item(String(ids[randi() % ids.size()]), 1)
	UIManager.say("%d items added" % count, "good")

func dev_unlock_next_region() -> void:
	for rid in GameData.region_ids():
		if not MapManager.is_unlocked(String(rid)):
			MapManager.force_unlock(String(rid))
			UIManager.say("%s unlocked" % GameData.region(String(rid))["name"], "good")
			return
	UIManager.say("All regions already unlocked", "info")

func dev_give_xp(amount: int = 500) -> void:
	add_player_xp(amount)
	for id in CharacterManager.ids():
		CharacterManager.add_xp(String(id), amount, false)
	UIManager.say("+%d XP everywhere" % amount, "good")

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {
		"version": VERSION,
		"player_level": player_level,
		"player_xp": player_xp,
		"last_seen": Time.get_unix_time_from_system(),
		"play_seconds": total_play_seconds,
		"settings": settings.duplicate(),
		"dev_mode": dev_mode,
		"dev_infinite_energy": dev_infinite_energy,
		"dev_fast_timers": dev_fast_timers,
	}

func load_state(d: Dictionary) -> void:
	player_level = maxi(int(d.get("player_level", 1)), 1)
	player_xp = maxi(int(d.get("player_xp", 0)), 0)
	last_seen = float(d.get("last_seen", Time.get_unix_time_from_system()))
	total_play_seconds = float(d.get("play_seconds", 0.0))
	var s = d.get("settings", {})
	if typeof(s) == TYPE_DICTIONARY:
		for k in s.keys():
			settings[String(k)] = s[k]
	dev_mode = bool(d.get("dev_mode", false))
	dev_infinite_energy = bool(d.get("dev_infinite_energy", false))
	dev_fast_timers = bool(d.get("dev_fast_timers", false))
