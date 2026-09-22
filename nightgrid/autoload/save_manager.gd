extends Node
## Local save. Single JSON document at user://nightgrid_save.json, written atomically
## via a .tmp file so a kill mid-write cannot corrupt the live save.

signal saved()
signal loaded(existing: bool)

const SAVE_PATH := "user://nightgrid_save.json"
const TMP_PATH := "user://nightgrid_save.tmp"
const BACKUP_PATH := "user://nightgrid_save.bak"
const SAVE_VERSION := 1
const AUTOSAVE_INTERVAL := 15.0

var data: Dictionary = {}
var _dirty := false
var _timer := 0.0
var _loaded := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta: float) -> void:
	if not _loaded:
		return
	_timer += delta
	if _timer >= AUTOSAVE_INTERVAL:
		_timer = 0.0
		if _dirty:
			save_now()

func mark_dirty() -> void:
	_dirty = true

func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func load_game() -> bool:
	_loaded = true
	if not FileAccess.file_exists(SAVE_PATH):
		data = {}
		loaded.emit(false)
		return false
	var txt := _read(SAVE_PATH)
	var parsed = JSON.parse_string(txt)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("Save unreadable, trying backup.")
		txt = _read(BACKUP_PATH)
		parsed = JSON.parse_string(txt)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("No usable save found, starting fresh.")
		data = {}
		loaded.emit(false)
		return false
	data = parsed
	loaded.emit(true)
	return true

func _read(path: String) -> String:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return ""
	var s := f.get_as_text()
	f.close()
	return s

func save_now() -> void:
	if not _loaded:
		return
	data = collect()
	data["version"] = SAVE_VERSION
	data["saved_at"] = Time.get_unix_time_from_system()
	var txt := JSON.stringify(data)
	var f := FileAccess.open(TMP_PATH, FileAccess.WRITE)
	if f == null:
		push_error("Cannot open save file for writing.")
		return
	f.store_string(txt)
	f.close()
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.copy_absolute(ProjectSettings.globalize_path(SAVE_PATH), ProjectSettings.globalize_path(BACKUP_PATH))
	DirAccess.rename_absolute(ProjectSettings.globalize_path(TMP_PATH), ProjectSettings.globalize_path(SAVE_PATH))
	_dirty = false
	saved.emit()

## Pull a fresh snapshot from every manager.
func collect() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"game": GameManager.save_state(),
		"resources": ResourceManager.save_state(),
		"buildings": BuildingManager.save_state(),
		"characters": CharacterManager.save_state(),
		"squads": SquadManager.save_state(),
		"map": MapManager.save_state(),
		"expeditions": ExpeditionManager.save_state(),
		"missions": MissionManager.save_state(),
		"events": EventManager.save_state(),
		"loot": LootManager.save_state(),
	}

func section(key: String) -> Dictionary:
	var v = data.get(key, {})
	return v if typeof(v) == TYPE_DICTIONARY else {}

func wipe() -> void:
	data = {}
	for p in [SAVE_PATH, TMP_PATH, BACKUP_PATH]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(p))
	_dirty = false
