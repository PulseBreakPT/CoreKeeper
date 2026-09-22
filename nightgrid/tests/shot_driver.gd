extends Node
## Screenshot harness. Walks the whole vertical slice and saves a PNG at each
## step so the layout can be reviewed without a device.

const OUT := "user://shots"

var _n := 0
var main: Node

func _ready() -> void:
	main = get_parent()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	await get_tree().create_timer(0.6).timeout
	await _run()
	print("SHOTS WRITTEN TO ", ProjectSettings.globalize_path(OUT))
	get_tree().quit(0)

func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	_n += 1
	var path := "%s/%02d_%s.png" % [OUT, _n, name]
	img.save_png(path)
	print("  shot ", path)

func _wait(t: float) -> void:
	await get_tree().create_timer(t).timeout

## Samples the frame rate over a couple of seconds. Under Xvfb this is software
## rendering, so it is a pessimistic floor, not a device measurement.
func _fps(label: String) -> void:
	await _wait(0.6)
	var samples: Array = []
	for i in range(40):
		await get_tree().process_frame
		samples.append(Engine.get_frames_per_second())
	var total := 0.0
	var worst := 9999.0
	for v in samples:
		total += float(v)
		worst = minf(worst, float(v))
	var cpu := Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
	var calls := Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	var items := Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)
	print("  fps %-18s avg %5.1f  min %5.1f   cpu %.2f ms   draw calls %d   items %d"
		% [label, total / float(samples.size()), worst, cpu, int(calls), int(items)])

func _close_overlays() -> void:
	for layer in [main.get("overlay_layer"), main.get("sheet_layer")]:
		if layer == null:
			continue
		for c in (layer as Node).get_children():
			c.queue_free()
	await get_tree().process_frame
	await get_tree().process_frame

func _run() -> void:
	GameManager.dev_fast_timers = true
	GameManager.dev_infinite_energy = true
	GameManager.set_dev_mode(true)

	await _close_overlays()
	await _shot("base")
	await _fps("base")

	# Production ready, then the collect bar.
	var now := Time.get_unix_time_from_system()
	for id in BuildingManager.state.keys():
		BuildingManager.state[id]["last"] = now - 3600.0
	BuildingManager.tick_production(now)
	await _wait(0.3)
	await _shot("base_collectable")

	main.call("open_sheet", load("res://ui/sheets/sheets.gd").building_sheet("workshop"))
	await _wait(0.5)
	await _shot("sheet_building")
	await _close_overlays()

	main.call("open_sheet", load("res://ui/sheets/sheets.gd").resources_sheet())
	await _wait(0.5)
	await _shot("sheet_resources")
	await _close_overlays()

	# Operatives
	main.call("show_tab", UIManager.TAB_OPERATIVES)
	await _wait(0.4)
	await _shot("operatives")
	var csheet = load("res://ui/sheets/sheets.gd").character_sheet("marlow")
	main.call("open_sheet", csheet)
	await _wait(0.5)
	print("DBG main=", (main as Control).size, " layer=", (main.get("sheet_layer") as Control).size,
		" sheet=", csheet.size, " panel=", csheet.get("_panel").size,
		" body=", csheet.body.size, " bodymin=", csheet.body.get_combined_minimum_size(),
		" scroll=", csheet.get("_scroll").size)
	await _shot("sheet_character")
	await _close_overlays()

	# Missions & inventory
	main.call("show_tab", UIManager.TAB_MISSIONS)
	await _wait(0.4)
	await _shot("missions")
	GameManager.dev_give_items(8)
	main.call("show_tab", UIManager.TAB_INVENTORY)
	await _wait(0.4)
	await _shot("inventory")

	# Map
	main.call("show_tab", UIManager.TAB_MAP)
	await _wait(0.5)
	await _shot("map_fog")
	MapManager.reveal_at("harbour_reach", Vector2(700, 1900), 4.0)
	EventManager.force_spawn()
	await _wait(0.5)
	await _shot("map_revealed")
	await _fps("map")
	MapManager.reveal_all("harbour_reach")
	await _wait(0.4)
	await _fps("map_all_revealed")

	# Briefing
	var target := ""
	for l in GameData.locations_in_region("harbour_reach"):
		if MapManager.is_discovered(String(l["id"])) and not MapManager.is_locked(String(l["id"])):
			target = String(l["id"])
			break
	if target == "":
		MapManager.reveal_all("harbour_reach")
		target = String(GameData.locations_in_region("harbour_reach")[0]["id"])
	main.call("open_sheet", load("res://ui/sheets/sheets.gd").location_sheet(
		ExpeditionManager.KIND_LOCATION, target))
	await _wait(0.6)
	await _shot("sheet_location")
	await _close_overlays()

	# Deploy and watch the convoy move
	ExpeditionManager.deploy(0, ExpeditionManager.KIND_LOCATION, target)
	await _wait(0.8)
	await _shot("map_travelling")
	ExpeditionManager.complete_travel(0)
	await _wait(0.5)
	await _shot("map_arrived")

	# Combat
	main.call("start_combat", 0)
	await _wait(1.2)
	await _shot("combat_open")
	await _wait(3.0)
	await _shot("combat_mid")
	await _fps("combat")
	var guard := 0
	while CombatManager.active and guard < 60:
		guard += 1
		await _wait(0.5)
	await _wait(1.6)
	await _shot("combat_result")
	await _wait(1.4)
	await _shot("rewards")
	await _close_overlays()

	# Dev menu
	main.call("open_overlay", load("res://ui/overlays/dev_overlay.gd").new())
	await _wait(0.5)
	await _shot("dev_menu")
	await _close_overlays()

	# Offline summary
	main.call("open_overlay", load("res://ui/overlays/offline_overlay.gd").new({
		"away": 9400.0, "show": true,
		"produced": {"materials": 3200, "fuel": 1800, "cash": 2400},
		"built": [{"id": "warehouse", "level": 3}], "energy": 62,
		"expeditions": [{"team": 0, "event": "arrived"}]}))
	await _wait(0.6)
	await _shot("offline")
	await _close_overlays()
