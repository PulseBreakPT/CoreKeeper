extends GameScreen
## MAP tab: the region map plus region switching and live expedition status.

const Sheets := preload("res://ui/sheets/sheets.gd")

var _view: MapView
var _region_row: HBoxContainer
var _status: VBoxContainer
var _progress: Label
var _fogbar: StatBar
var _region_picker_open := false

func build() -> void:
	_view = MapView.new()
	UI.full_rect(_view)
	_view.target_picked.connect(_open_target)
	add_child(_view)
	_view.set_region(MapManager.current_region)

	# Region strip at the top of the map.
	var top := PanelContainer.new()
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.anchor_right = 1.0
	top.offset_left = Pal.GAP_S
	top.offset_right = -Pal.GAP_S
	top.offset_top = Pal.GAP_S
	var sb := Pal.panel_box(Pal.PANEL.lerp(Pal.BG_DEEP, 0.25), Pal.LINE, Pal.RADIUS_S, 2)
	sb.content_margin_top = 12
	sb.content_margin_bottom = 12
	top.add_theme_stylebox_override("panel", sb)
	add_child(top)
	var tv := UI.vbox(8)
	top.add_child(tv)
	_region_row = UI.hbox(8)
	tv.add_child(_region_row)
	var prow := UI.hbox(Pal.GAP_S)
	_progress = UI.label("", Pal.FS_MICRO, Pal.TEXT_DIM)
	prow.add_child(_progress)
	prow.add_child(UI.hfill())
	tv.add_child(prow)
	_fogbar = StatBar.new(8.0, Pal.CYAN)
	tv.add_child(_fogbar)

	# Zoom / recentre controls, thumb-side.
	var tools := UI.vbox(10)
	tools.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	tools.anchor_left = 1.0
	tools.anchor_right = 1.0
	tools.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	tools.offset_right = -Pal.GAP_S
	add_child(tools)
	var zin := UI.icon_button("plus", func(): _view.zoom_by(1.25), 104.0, Pal.TEXT)
	zin.set_kind(TapButton.Kind.SECONDARY)
	tools.add_child(zin)
	var home := UI.icon_button("target", func():
		_view.center_on(MapManager.entry_point(MapManager.current_region)), 104.0, Pal.ACCENT)
	home.set_kind(TapButton.Kind.SECONDARY)
	tools.add_child(home)
	var out := UI.icon_button("minus", func(): _view.zoom_by(0.8), 104.0, Pal.TEXT)
	out.set_kind(TapButton.Kind.SECONDARY)
	tools.add_child(out)

	# Expedition status stack, above the navigation bar.
	_status = UI.vbox(Pal.GAP_S)
	_status.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_status.anchor_top = 1.0
	_status.anchor_bottom = 1.0
	_status.anchor_right = 1.0
	_status.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_status.offset_left = Pal.GAP_S
	_status.offset_right = -Pal.GAP_S
	_status.offset_bottom = -Pal.GAP_S
	add_child(_status)

	MapManager.region_changed.connect(func(rid):
		_view.set_region(String(rid))
		_refresh_regions())
	MapManager.fog_changed.connect(func(_r): _refresh_regions())
	ExpeditionManager.expedition_changed.connect(func(_t): _refresh_status())
	_refresh_regions()
	_refresh_status()

func refresh() -> void:
	if _view:
		_view.set_region(MapManager.current_region)
		_refresh_regions()
		_refresh_status()

var _status_tick := 0.0

func _process(delta: float) -> void:
	# Rebuilding the status cards allocates nodes, so it runs a few times a
	# second rather than every frame.
	if not visible or _status == null:
		return
	_status_tick += delta
	if _status_tick >= 0.4:
		_status_tick = 0.0
		_refresh_status()

func _refresh_regions() -> void:
	UI.clear(_region_row)
	for rd in GameData.regions:
		var rid := String(rd["id"])
		var unlocked := MapManager.is_unlocked(rid)
		var current := rid == MapManager.current_region
		var b := UI.button(String(rd.get("short", rd["name"])).to_upper() if unlocked else "LOCKED",
			func():
				if unlocked:
					MapManager.set_region(rid)
				else:
					UIManager.say("Requires %s" % MapManager.unlock_requirement(rid), "warn"),
			TapButton.Kind.PRIMARY if current else (TapButton.Kind.SECONDARY if unlocked else TapButton.Kind.GHOST),
			84.0)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_font_size_override("font_size", Pal.FS_MICRO)
		_region_row.add_child(b)
	var rid2 := MapManager.current_region
	var rd2 := GameData.region(rid2)
	_progress.text = "%s  ·  REC. LV %d  ·  CLEARED %d%%  ·  EXPLORED %d%%" % [
		String(rd2.get("faction", "")).to_upper().replace("_", " "),
		int(rd2.get("rec_level", 1)),
		int(MapManager.region_progress(rid2) * 100.0),
		int(MapManager.fog_ratio(rid2) * 100.0)]
	_fogbar.value = MapManager.fog_ratio(rid2)
	_fogbar.ghost = MapManager.region_progress(rid2)

func _refresh_status() -> void:
	UI.clear(_status)
	var any := false
	for i in range(SquadManager.TEAM_COUNT):
		var state := ExpeditionManager.team_state(i)
		if state == ExpeditionManager.STATE_IDLE:
			continue
		any = true
		_status.add_child(_status_card(i, state))
	if not any:
		var hint := UI.panel(Pal.PANEL.lerp(Pal.BG_DEEP, 0.3), Pal.LINE, Pal.RADIUS_S)
		var row := UI.hbox(Pal.GAP_S)
		row.add_child(IconView.new("target", Pal.ACCENT, 40.0, 3.5))
		row.add_child(UI.wrap_label("Tap a marker to open the briefing. Drag to pan, pinch to zoom.",
			Pal.FS_SMALL, Pal.TEXT_DIM))
		hint.add_child(row)
		_status.add_child(hint)

func _status_card(team: int, state: String) -> Control:
	var s := ExpeditionManager.slot(team)
	var info := ExpeditionManager.target_info(String(s["kind"]), String(s["target"]))
	var arrived := state == ExpeditionManager.STATE_ARRIVED
	var col: Color = Pal.GOOD if arrived else Pal.CYAN
	var card := UI.panel(Pal.PANEL.lerp(Pal.BG_DEEP, 0.15), col, Pal.RADIUS_S)
	var v := UI.vbox(8)
	card.add_child(v)
	var row := UI.hbox(Pal.GAP_S)
	var left := UI.vbox(2)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(UI.label("%s  ·  %s" % [SquadManager.team_name(team).to_upper(),
		String(info.get("name", "—")).to_upper()], Pal.FS_SMALL, Pal.TEXT))
	var sub := ""
	match state:
		ExpeditionManager.STATE_TRAVEL:
			sub = "IN TRANSIT  ·  " + GameData.fmt_time(ExpeditionManager.remaining(team))
		ExpeditionManager.STATE_ARRIVED:
			sub = "ON SITE  ·  READY TO ENGAGE"
		_:
			sub = "RETURNING  ·  " + GameData.fmt_time(ExpeditionManager.remaining(team))
	left.add_child(UI.label(sub, Pal.FS_MICRO, col))
	row.add_child(left)
	if arrived:
		var b := UI.button("ENGAGE", func():
			var main: Node = Engine.get_main_loop().current_scene
			if main and main.has_method("start_combat"):
				main.call("start_combat", team), TapButton.Kind.PRIMARY, 104.0)
		b.custom_minimum_size = Vector2(230, 104)
		row.add_child(b)
	else:
		var loc_btn := UI.button("TRACK", func():
			MapManager.set_region(String(s["region"]))
			_view.center_on(ExpeditionManager.marker_position(team)), TapButton.Kind.GHOST, 104.0)
		loc_btn.custom_minimum_size = Vector2(190, 104)
		loc_btn.add_theme_font_size_override("font_size", Pal.FS_MICRO)
		row.add_child(loc_btn)
	v.add_child(row)
	if not arrived:
		var bar := StatBar.new(8.0, col)
		bar.value = ExpeditionManager.progress(team)
		v.add_child(bar)
	return card

func _open_target(kind: String, tid: String) -> void:
	var main: Node = Engine.get_main_loop().current_scene
	if main and main.has_method("open_sheet"):
		main.call("open_sheet", Sheets.location_sheet(kind, tid))
