extends GameScreen
## OPERATIVES tab: roster grid, team summary and recruitment.

const Sheets := preload("res://ui/sheets/sheets.gd")

var _grid: GridContainer
var _summary: HBoxContainer
var _teams_row: VBoxContainer

func build() -> void:
	var scroll := UI.scroll()
	UI.full_rect(scroll)
	add_child(scroll)
	var pad := UI.margin(Pal.GAP, Pal.GAP, Pal.GAP, Pal.GAP + 40.0)
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(pad)
	var col := UI.vbox(Pal.GAP)
	pad.add_child(col)

	_summary = UI.hbox(Pal.GAP)
	col.add_child(_summary)

	col.add_child(UI.label("TEAMS", Pal.FS_MICRO, Pal.TEXT_FAINT))
	_teams_row = UI.vbox(Pal.GAP_S)
	col.add_child(_teams_row)

	col.add_child(UI.rule())
	var head := UI.hbox(Pal.GAP_S)
	head.add_child(UI.label("ROSTER", Pal.FS_MICRO, Pal.TEXT_FAINT))
	head.add_child(UI.hfill())
	var rec := UI.button("RECRUIT", func():
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_sheet"):
			main.call("open_sheet", Sheets.recruit_sheet()), TapButton.Kind.SECONDARY, 96.0)
	rec.custom_minimum_size = Vector2(260, 96)
	rec.add_theme_font_size_override("font_size", Pal.FS_SMALL)
	head.add_child(rec)
	col.add_child(head)

	_grid = UI.grid(2, Pal.GAP_S)
	col.add_child(_grid)

	CharacterManager.roster_changed.connect(refresh)
	SquadManager.squads_changed.connect(refresh)

func refresh() -> void:
	if _grid == null:
		return
	UI.clear(_summary)
	_summary.add_child(_stat("Operatives", "%d / %d" % [CharacterManager.roster_size(),
		BuildingManager.roster_capacity()], Pal.TEXT))
	_summary.add_child(_stat("Roster Power", GameData.fmt(float(CharacterManager.total_roster_power())), Pal.CYAN))
	_summary.add_child(_stat("Level cap", str(CharacterManager.level_cap()), Pal.ACCENT))

	UI.clear(_teams_row)
	for i in range(SquadManager.TEAM_COUNT):
		_teams_row.add_child(_team_card(i))

	UI.clear(_grid)
	for cid in CharacterManager.ids():
		_grid.add_child(_card(String(cid)))

func _stat(caption: String, value: String, col: Color) -> Control:
	var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := UI.vbox(2)
	v.add_child(UI.label(caption.to_upper(), Pal.FS_MICRO, Pal.TEXT_FAINT))
	v.add_child(UI.label(value, Pal.FS_BODY, col))
	p.add_child(v)
	return p

func _team_card(team: int) -> Control:
	var unlocked := SquadManager.is_unlocked(team)
	var busy := SquadManager.is_busy(team)
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 150)
	var border: Color = Pal.LINE if not unlocked else (Pal.CYAN if busy else Pal.ACCENT)
	b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_HI, border, Pal.RADIUS_S, 2))
	b.pressed.connect(func():
		if not unlocked:
			UIManager.say("Requires %s" % SquadManager.unlock_hint(team), "warn")
			return
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_sheet"):
			main.call("open_sheet", Sheets.squad_sheet(team)))
	var row := UI.hbox(Pal.GAP_S)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 18
	row.offset_right = -18
	var info := UI.vbox(4)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	info.add_child(UI.label(SquadManager.team_name(team).to_upper(), Pal.FS_SMALL, Pal.TEXT))
	if not unlocked:
		info.add_child(UI.label("Locked — %s" % SquadManager.unlock_hint(team), Pal.FS_MICRO, Pal.WARN))
	else:
		var st := ExpeditionManager.team_state(team)
		var sub := "%d operatives  ·  PWR %s" % [SquadManager.members(team).size(),
			GameData.fmt(float(SquadManager.power(team)))]
		if st != ExpeditionManager.STATE_IDLE:
			sub += "  ·  DEPLOYED"
		info.add_child(UI.label(sub, Pal.FS_MICRO, Pal.CYAN if busy else Pal.TEXT_DIM))
	row.add_child(info)
	if unlocked:
		var faces := UI.hbox(6)
		faces.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		for cid in SquadManager.members(team):
			var pt := Portrait.for_character(String(cid))
			pt.custom_minimum_size = Vector2(72, 92)
			faces.add_child(pt)
		row.add_child(faces)
	else:
		row.add_child(IconView.new("lock", Pal.TEXT_FAINT, 50.0, 4.0))
	b.add_child(row)
	return b

func _card(cid: String) -> Control:
	var def := GameData.character(cid)
	var rc := Pal.rarity(String(def["rarity"]))
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 430)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL, rc.lerp(Pal.BG, 0.45), Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL, rc, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_HI, rc, Pal.RADIUS_S, 2))
	b.pressed.connect(func():
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_sheet"):
			main.call("open_sheet", Sheets.character_sheet(cid)))

	var v := UI.vbox(6)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 12
	v.offset_right = -12
	v.offset_top = 12
	v.offset_bottom = -12
	var pt := Portrait.for_character(cid)
	pt.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(pt)
	v.add_child(UI.label(String(def["codename"]), Pal.FS_SMALL, Pal.TEXT))
	var tags := UI.hbox(6)
	tags.add_child(UI.chip("LV %d" % CharacterManager.level_of(cid), Pal.TEXT_DIM))
	tags.add_child(UI.chip(String(def["klass"]), GameData.CharactersData.class_color(String(def["klass"]))))
	v.add_child(tags)
	var prow := UI.hbox(6)
	prow.add_child(IconView.new("power", Pal.CYAN, 24.0, 3.0))
	prow.add_child(UI.label(GameData.fmt(float(CharacterManager.power(cid))), Pal.FS_MICRO, Pal.CYAN))
	prow.add_child(UI.hfill())
	var team := SquadManager.team_of(cid)
	if team >= 0:
		prow.add_child(UI.label("T%d" % (team + 1), Pal.FS_MICRO, Pal.ACCENT))
	v.add_child(prow)
	var need := CharacterManager.xp_to_next(CharacterManager.level_of(cid))
	var xb := StatBar.new(8.0, Pal.ACCENT)
	xb.value = 0.0 if need <= 0 else clampf(float(CharacterManager.xp_of(cid)) / float(need), 0.0, 1.0)
	v.add_child(xb)
	b.add_child(v)
	return b
