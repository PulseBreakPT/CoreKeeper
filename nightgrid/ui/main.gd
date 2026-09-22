extends Control
## Application shell: header, screen stack, bottom navigation, sheets, overlays.
## Owns Android back-button routing and the safe-area insets.

const BaseScreen := preload("res://ui/screens/base_screen.gd")
const MapScreen := preload("res://ui/screens/map_screen.gd")
const OperativesScreen := preload("res://ui/screens/operatives_screen.gd")
const MissionsScreen := preload("res://ui/screens/missions_screen.gd")
const InventoryScreen := preload("res://ui/screens/inventory_screen.gd")
const CombatOverlay := preload("res://ui/overlays/combat_overlay.gd")
const OfflineOverlay := preload("res://ui/overlays/offline_overlay.gd")
const DevOverlay := preload("res://ui/overlays/dev_overlay.gd")
const Sheets := preload("res://ui/sheets/sheets.gd")

var bg: Control
var header: HeaderBar
var nav: NavBar
var content: Control
var sheet_layer: Control
var overlay_layer: Control
var toasts: ToastLayer

var screens: Dictionary = {}
var current_tab: String = UIManager.TAB_BASE
var safe_top := 0.0
var safe_bottom := 0.0
var _exit_armed_until := 0.0
var _logo_taps := 0
var _logo_tap_time := 0.0
var _refresh_accum := 0.0

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	anchor_right = 1.0
	anchor_bottom = 1.0
	get_tree().set_auto_accept_quit(false)
	_build()
	_connect_signals()
	_update_safe_area()
	get_viewport().size_changed.connect(_update_safe_area)
	show_tab(UIManager.TAB_BASE)
	header.refresh()
	_refresh_badges()
	if OS.get_cmdline_user_args().has("--shots"):
		# QA harness: drives the UI and writes screenshots. Never shipped — tests/
		# is excluded from the export preset.
		if ResourceLoader.exists("res://tests/shot_driver.gd"):
			add_child((load("res://tests/shot_driver.gd") as GDScript).new())
	if GameManager.booted_ok:
		_after_boot(GameManager.offline_report)
	else:
		GameManager.booted.connect(_after_boot, CONNECT_ONE_SHOT)

# ---- Construction -------------------------------------------------------

func _build() -> void:
	bg = Control.new()
	UI.full_rect(bg)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.draw.connect(_draw_backdrop)
	add_child(bg)

	content = Control.new()
	UI.full_rect(content)
	content.clip_contents = true
	add_child(content)

	screens[UIManager.TAB_BASE] = BaseScreen.new()
	screens[UIManager.TAB_MAP] = MapScreen.new()
	screens[UIManager.TAB_OPERATIVES] = OperativesScreen.new()
	screens[UIManager.TAB_MISSIONS] = MissionsScreen.new()
	screens[UIManager.TAB_INVENTORY] = InventoryScreen.new()
	for k in screens.keys():
		content.add_child(screens[k])

	header = HeaderBar.new()
	header.set_anchors_preset(Control.PRESET_TOP_WIDE)
	header.anchor_right = 1.0
	add_child(header)

	nav = NavBar.new()
	nav.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	nav.anchor_top = 1.0
	nav.anchor_right = 1.0
	nav.anchor_bottom = 1.0
	nav.grow_vertical = Control.GROW_DIRECTION_BEGIN
	add_child(nav)

	sheet_layer = Control.new()
	UI.full_rect(sheet_layer)
	sheet_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(sheet_layer)

	# Toasts sit above the sheets but below full-screen overlays, so a battle or a
	# reward screen is never written over.
	toasts = ToastLayer.new()
	add_child(toasts)

	overlay_layer = Control.new()
	UI.full_rect(overlay_layer)
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay_layer)

func _draw_backdrop() -> void:
	var s := bg.size
	bg.draw_rect(Rect2(Vector2.ZERO, s), Pal.BG, true)
	var step := 90.0
	var col := Color(1, 1, 1, 0.022)
	var x := 0.0
	while x < s.x:
		bg.draw_line(Vector2(x, 0), Vector2(x, s.y), col, 1.0)
		x += step
	var y := 0.0
	while y < s.y:
		bg.draw_line(Vector2(0, y), Vector2(s.x, y), col, 1.0)
		y += step
	bg.draw_rect(Rect2(Vector2.ZERO, Vector2(s.x, s.y * 0.35)),
		Pal.ACCENT.lerp(Pal.BG, 0.94), true)

func _connect_signals() -> void:
	nav.tab_selected.connect(show_tab)
	header.resources_tapped.connect(_open_resources_sheet)
	header.energy_tapped.connect(_open_energy_sheet)
	header.logo_tapped.connect(_on_logo_tapped)
	UIManager.tab_requested.connect(show_tab)
	UIManager.toast.connect(func(t, k): toasts.show_toast(t, k))
	ResourceManager.changed.connect(func(_r, _v): header.refresh())
	# Energy drips continuously; the half-second tick below repaints the header,
	# so binding it to every fractional change would reshape labels 60x a second.
	GameManager.player_level_changed.connect(func(_l, _x, _n): header.refresh())
	GameManager.power_changed.connect(func(_p): header.refresh())
	MissionManager.claimable_count_changed.connect(func(_c): _refresh_badges())
	BuildingManager.production_changed.connect(func(_id): _refresh_badges())
	BuildingManager.collected.connect(func(_id, _b): _refresh_badges())
	ExpeditionManager.arrived.connect(_on_expedition_arrived)
	CombatManager.battle_finished.connect(_on_battle_finished)
	MapManager.region_unlocked.connect(func(rid):
		toasts.show_toast("New region unlocked: %s" % GameData.region(String(rid))["name"], "good"))

# ---- Safe area ----------------------------------------------------------

func _update_safe_area() -> void:
	var vp := get_viewport_rect().size
	var win := Vector2(DisplayServer.window_get_size())
	var scale := 1.0
	if win.x > 0.0:
		scale = vp.x / win.x
	var safe := DisplayServer.get_display_safe_area()
	var top := 0.0
	var bottom := 0.0
	if safe.size.x > 0 and safe.size.y > 0 and win.y > 0.0:
		top = maxf(float(safe.position.y) * scale, 0.0)
		bottom = maxf((win.y - float(safe.position.y + safe.size.y)) * scale, 0.0)
	# Always keep a little breathing room even without a cutout.
	safe_top = maxf(top, 18.0)
	safe_bottom = maxf(bottom, 14.0)
	header.safe_top = safe_top
	nav.safe_bottom = safe_bottom
	await get_tree().process_frame
	_layout_content()

func _layout_content() -> void:
	var h := header.size.y
	var n := nav.size.y
	content.offset_top = h
	content.offset_bottom = -n
	toasts.set_top_offset(h + 172.0)
	for k in screens.keys():
		(screens[k] as Control).size = content.size

func _process(delta: float) -> void:
	_refresh_accum += delta
	if _refresh_accum >= 0.5:
		_refresh_accum = 0.0
		header.refresh()
		_refresh_badges()
		_layout_content()

# ---- Tabs ---------------------------------------------------------------

func show_tab(tab: String) -> void:
	if not screens.has(tab):
		return
	current_tab = tab
	for k in screens.keys():
		var sc: GameScreen = screens[k]
		sc.visible = String(k) == tab
	nav.set_current(tab)
	(screens[tab] as GameScreen).on_shown()
	UIManager.notify_tab(tab)

func _refresh_badges() -> void:
	nav.set_badge(UIManager.TAB_MISSIONS, MissionManager.claimable_count())
	var ready_buildings := 0
	for id in BuildingManager.state.keys():
		if BuildingManager.pending_total(String(id)) > 0 and BuildingManager.buffer_fill_ratio(String(id)) > 0.25:
			ready_buildings += 1
	nav.set_badge(UIManager.TAB_BASE, ready_buildings)
	var arrived := 0
	for i in range(SquadManager.TEAM_COUNT):
		if ExpeditionManager.team_state(i) == ExpeditionManager.STATE_ARRIVED:
			arrived += 1
	nav.set_badge(UIManager.TAB_MAP, arrived)

# ---- Sheets & overlays --------------------------------------------------

func open_sheet(sheet: BottomSheet) -> BottomSheet:
	sheet_layer.mouse_filter = Control.MOUSE_FILTER_STOP
	sheet_layer.add_child(sheet)
	sheet.closed.connect(func():
		if sheet_layer.get_child_count() <= 1:
			sheet_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		UIManager.set_stack_depth(_stack_depth()))
	UIManager.set_stack_depth(_stack_depth() + 1)
	return sheet

func open_overlay(node: Control) -> Control:
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay_layer.add_child(node)
	UIManager.set_stack_depth(_stack_depth() + 1)
	node.tree_exited.connect(func():
		if is_instance_valid(overlay_layer) and overlay_layer.get_child_count() == 0:
			overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
		UIManager.set_stack_depth(_stack_depth()))
	return node

func _stack_depth() -> int:
	return sheet_layer.get_child_count() + overlay_layer.get_child_count()

func _open_resources_sheet() -> void:
	open_sheet(Sheets.resources_sheet())

func _open_energy_sheet() -> void:
	open_sheet(Sheets.energy_sheet())

func _on_logo_tapped() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - _logo_tap_time > 1.6:
		_logo_taps = 0
	_logo_tap_time = now
	_logo_taps += 1
	if GameManager.dev_mode:
		open_overlay(DevOverlay.new())
		_logo_taps = 0
		return
	if _logo_taps >= 5:
		_logo_taps = 0
		GameManager.set_dev_mode(true)
		toasts.show_toast("Developer mode unlocked — tap the level badge", "warn")
	elif _logo_taps >= 3:
		toasts.show_toast("%d more taps…" % (5 - _logo_taps), "info")

# ---- Flow hooks ---------------------------------------------------------

func _after_boot(report: Dictionary) -> void:
	header.refresh()
	if MissionManager.login_pending:
		call_deferred("_show_login")
	if bool(report.get("show", false)):
		open_overlay(OfflineOverlay.new(report))

func _show_login() -> void:
	if not MissionManager.login_pending:
		return
	open_overlay(RewardOverlay.login(MissionManager.login_reward(), MissionManager.login_streak))

func _on_expedition_arrived(team: int) -> void:
	var s := ExpeditionManager.slot(team)
	var info := ExpeditionManager.target_info(String(s["kind"]), String(s["target"]))
	var nm := String(info.get("name", "the target"))
	toasts.show_toast("%s reached %s" % [SquadManager.team_name(team), nm], "good")
	_refresh_badges()

func start_combat(team: int) -> void:
	var s := ExpeditionManager.slot(team)
	if String(s["state"]) != ExpeditionManager.STATE_ARRIVED:
		return
	var info := ExpeditionManager.target_info(String(s["kind"]), String(s["target"]))
	if info.is_empty():
		return
	if not CombatManager.start_battle(team, info):
		toasts.show_toast("That team has nobody in it", "bad")
		return
	open_overlay(CombatOverlay.new())

func _on_battle_finished(result: Dictionary) -> void:
	_refresh_badges()
	header.refresh()

func show_rewards(result: Dictionary) -> void:
	open_overlay(RewardOverlay.from_battle(result))

# ---- Android back button ------------------------------------------------

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		_go_back()
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		SaveManager.save_now()
		get_tree().quit()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_go_back()
		get_viewport().set_input_as_handled()

func _go_back() -> void:
	if overlay_layer.get_child_count() > 0:
		var top := overlay_layer.get_child(overlay_layer.get_child_count() - 1)
		if top.has_method("request_close"):
			top.call("request_close")
		else:
			top.queue_free()
		return
	if sheet_layer.get_child_count() > 0:
		var sheet := sheet_layer.get_child(sheet_layer.get_child_count() - 1)
		if sheet is BottomSheet:
			(sheet as BottomSheet).close()
		else:
			sheet.queue_free()
		return
	var screen: GameScreen = screens[current_tab]
	if screen.handle_back():
		return
	if current_tab != UIManager.TAB_BASE:
		show_tab(UIManager.TAB_BASE)
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now < _exit_armed_until:
		SaveManager.save_now()
		get_tree().quit()
	else:
		_exit_armed_until = now + 2.0
		toasts.show_toast("Press back again to leave — progress is saved", "warn")
