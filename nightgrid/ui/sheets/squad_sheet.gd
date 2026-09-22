extends BottomSheet
## Team composition. Five slots, tap to add or drop.

var team: int

func _init(team_index: int) -> void:
	team = team_index
	super(SquadManager.team_name(team_index), "Up to %d operatives" % SquadManager.TEAM_SIZE, 0.82)
	_populate()
	SquadManager.squads_changed.connect(_populate)

func _populate() -> void:
	if not is_instance_valid(body):
		return
	UI.clear(body)
	if not SquadManager.is_unlocked(team):
		body.add_child(UI.label("Locked — requires %s" % SquadManager.unlock_hint(team),
			Pal.FS_BODY, Pal.WARN))
		return
	if SquadManager.is_busy(team):
		body.add_child(UI.label("This team is deployed. Recall it or wait for it to return.",
			Pal.FS_SMALL, Pal.WARN))

	var head := UI.hbox(Pal.GAP)
	head.add_child(UI.stat_block("Squad Power", GameData.fmt(float(SquadManager.power(team))), Pal.CYAN, Pal.FS_TITLE))
	head.add_child(UI.stat_block("Slots", "%d / %d" % [SquadManager.members(team).size(), SquadManager.TEAM_SIZE],
		Pal.TEXT, Pal.FS_TITLE))
	head.add_child(UI.hfill())
	var fill := UI.button("AUTO", func():
		var n := SquadManager.auto_fill(team)
		UIManager.say("%d operatives assigned" % n if n > 0 else "Nobody left to assign",
			"good" if n > 0 else "info"), TapButton.Kind.SECONDARY, 104.0)
	fill.custom_minimum_size = Vector2(160, 104)
	head.add_child(fill)
	body.add_child(head)
	body.add_child(UI.rule())

	var g := UI.grid(2, Pal.GAP_S)
	for cid in CharacterManager.ids():
		g.add_child(_row(String(cid)))
	body.add_child(g)
	relayout()

func _row(cid: String) -> Control:
	var def := GameData.character(cid)
	var in_team := SquadManager.team_of(cid) == team
	var other := SquadManager.team_of(cid)
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 190)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var border: Color = Pal.ACCENT if in_team else Pal.LINE
	b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL_HI if in_team else Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL_HI if in_team else Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_SOFT, Pal.ACCENT, Pal.RADIUS_S, 2))
	b.pressed.connect(func():
		if SquadManager.is_busy(team):
			UIManager.say("That team is out on a job", "warn")
			return
		if not in_team and SquadManager.members(team).size() >= SquadManager.TEAM_SIZE:
			UIManager.say("Team is full", "warn")
			return
		if not SquadManager.toggle_member(team, cid):
			UIManager.say("Cannot move that operative right now", "warn"))

	var row := UI.hbox(Pal.GAP_S)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 12
	row.offset_right = -12
	row.offset_top = 10
	row.offset_bottom = -10
	var pt := Portrait.for_character(cid)
	pt.custom_minimum_size = Vector2(120, 0)
	row.add_child(pt)
	var info := UI.vbox(2)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	info.add_child(UI.label(String(def["codename"]), Pal.FS_SMALL, Pal.TEXT))
	info.add_child(UI.label("%s · LV %d" % [String(def["klass"]), CharacterManager.level_of(cid)],
		Pal.FS_MICRO, Pal.TEXT_DIM))
	info.add_child(UI.label("PWR %s" % GameData.fmt(float(CharacterManager.power(cid))), Pal.FS_MICRO, Pal.CYAN))
	if other >= 0 and other != team:
		info.add_child(UI.label("In %s" % SquadManager.team_name(other), Pal.FS_MICRO, Pal.WARN))
	row.add_child(info)
	b.add_child(row)
	return b
