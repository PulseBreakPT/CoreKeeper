extends BottomSheet
## Target briefing. The map stays visible behind it, which is the point.

var kind: String
var target_id: String
var _team := 0
var _team_row: HBoxContainer

func _init(target_kind: String, tid: String) -> void:
	kind = target_kind
	target_id = tid
	var info := ExpeditionManager.target_info(target_kind, tid)
	super(String(info.get("name", "Target")), String(info.get("type_label", "")), 0.78)
	var idle := ExpeditionManager.first_idle_team()
	_team = idle if idle >= 0 else 0
	_populate()
	ResourceManager.energy_changed.connect(func(_v, _m): _update_action())
	ExpeditionManager.expedition_changed.connect(func(_t): _populate())

func _populate() -> void:
	if not is_instance_valid(body):
		return
	UI.clear(body)
	var info := ExpeditionManager.target_info(kind, target_id)
	if info.is_empty():
		body.add_child(UI.label("This target is gone.", Pal.FS_BODY, Pal.WARN))
		return

	var diff := int(info["difficulty"])
	var dcol := Pal.difficulty_color(diff)

	var chips := UI.hbox(Pal.GAP_S)
	chips.add_child(UI.chip("LV %d" % int(info["level"]), Pal.TEXT_DIM))
	chips.add_child(UI.chip(Pal.difficulty_label(diff), dcol))
	if kind == ExpeditionManager.KIND_LOCATION and MapManager.is_cleared(target_id):
		chips.add_child(UI.chip("CLEARED ×%d" % MapManager.clear_count(target_id), Pal.GOOD))
	else:
		chips.add_child(UI.chip("FIRST CLEAR BONUS", Pal.GOLD))
	body.add_child(chips)

	if info.has("blurb"):
		body.add_child(UI.wrap_label(String(info["blurb"]), Pal.FS_SMALL, Pal.TEXT_DIM))

	if kind == ExpeditionManager.KIND_EVENT:
		var left := EventManager.remaining(target_id)
		var t := UI.hbox(10)
		t.add_child(IconView.new("clock", Pal.WARN, 28.0, 3.0))
		_expiry_label = UI.label("Disappears in %s" % GameData.fmt_time(left), Pal.FS_SMALL, Pal.WARN)
		t.add_child(_expiry_label)
		body.add_child(t)

	# Cost / time strip
	var strip := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	var srow := UI.hbox(Pal.GAP)
	strip.add_child(srow)
	srow.add_child(UI.stat_block("Energy", str(int(info["energy"])), Pal.WARN))
	srow.add_child(UI.stat_block("Travel", GameData.fmt_time(ExpeditionManager.travel_seconds(info)), Pal.CYAN))
	srow.add_child(UI.stat_block("Enemies", str((info["enemies"] as Array).size()), Pal.BAD))
	srow.add_child(UI.hfill())
	body.add_child(strip)

	# Opposition
	body.add_child(UI.label("OPPOSITION", Pal.FS_MICRO, Pal.TEXT_FAINT))
	var foes := CombatManager.enemies_for(info)
	var frow := UI.hbox(Pal.GAP_S)
	for f in foes:
		var cell := UI.vbox(4)
		var pt := Portrait.for_unit(f)
		pt.custom_minimum_size = Vector2(120, 140)
		cell.add_child(pt)
		cell.add_child(UI.label("LV %d" % int(f["level"]), Pal.FS_MICRO, Pal.TEXT_DIM,
			HORIZONTAL_ALIGNMENT_CENTER))
		frow.add_child(cell)
	body.add_child(frow)

	# Power read
	var rec := ExpeditionManager.recommended_power(info)
	var mine := SquadManager.power(_team)
	var verdict := Pal.power_verdict(mine, rec)
	var pcard := UI.panel(Pal.PANEL_SOFT, verdict["color"], Pal.RADIUS_S)
	var pv := UI.vbox(8)
	pcard.add_child(pv)
	var prow := UI.hbox(Pal.GAP)
	prow.add_child(UI.stat_block("Recommended", GameData.fmt(float(rec)), Pal.TEXT_DIM))
	prow.add_child(UI.stat_block("Your squad", GameData.fmt(float(mine)), Pal.TEXT))
	prow.add_child(UI.hfill())
	prow.add_child(UI.chip(String(verdict["text"]), verdict["color"], Pal.FS_SMALL))
	pv.add_child(prow)
	var pb := StatBar.new(14.0, verdict["color"])
	pb.value = 0.0 if rec <= 0 else clampf(float(mine) / float(rec), 0.0, 1.0)
	pv.add_child(pb)
	body.add_child(pcard)

	# Rewards
	body.add_child(UI.label("POSSIBLE REWARDS", Pal.FS_MICRO, Pal.TEXT_FAINT))
	body.add_child(UI.resource_row(info["rewards"], Pal.FS_SMALL, 32.0))
	var xr := UI.hbox(Pal.GAP)
	xr.add_child(UI.chip("+%d OPERATIVE XP" % int(info["xp"]), Pal.CYAN))
	xr.add_child(UI.chip("+%d PLAYER XP" % int(info["player_xp"]), Pal.ACCENT))
	body.add_child(xr)
	var chance := LootManager.drop_chance(diff, String(info.get("type", "npc_camp")))
	body.add_child(UI.label("Equipment drop chance %d%%" % int(round(chance * 100.0)),
		Pal.FS_MICRO, Pal.TEXT_DIM))

	# Team picker
	body.add_child(UI.rule())
	body.add_child(UI.label("DEPLOY WITH", Pal.FS_MICRO, Pal.TEXT_FAINT))
	_team_row = UI.hbox(Pal.GAP_S)
	body.add_child(_team_row)
	_rebuild_team_row()
	var members := SquadManager.members(_team)
	var mrow := UI.hbox(Pal.GAP_S)
	if members.is_empty():
		mrow.add_child(UI.label("No operatives assigned", Pal.FS_SMALL, Pal.BAD))
	for cid in members:
		var pc := UI.vbox(4)
		var pt2 := Portrait.for_character(String(cid))
		pt2.custom_minimum_size = Vector2(110, 130)
		pc.add_child(pt2)
		pc.add_child(UI.label("LV %d" % CharacterManager.level_of(String(cid)), Pal.FS_MICRO,
			Pal.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER))
		mrow.add_child(pc)
	mrow.add_child(UI.hfill())
	body.add_child(mrow)
	var edit := UI.button("EDIT SQUAD", func():
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_sheet"):
			main.call("open_sheet", load("res://ui/sheets/squad_sheet.gd").new(_team)),
		TapButton.Kind.GHOST, 108.0)
	edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(edit)

	_update_action()

var _expiry_label: Label
var _action: TapButton
var _note: Label

func _rebuild_team_row() -> void:
	UI.clear(_team_row)
	for i in range(SquadManager.TEAM_COUNT):
		var idx := i
		var unlocked := SquadManager.is_unlocked(i)
		var state := ExpeditionManager.team_state(i)
		var label_text := SquadManager.team_name(i)
		var k := TapButton.Kind.SECONDARY
		if i == _team:
			k = TapButton.Kind.PRIMARY
		if not unlocked:
			label_text = "LOCKED"
			k = TapButton.Kind.GHOST
		elif state != ExpeditionManager.STATE_IDLE:
			label_text += " · BUSY"
			k = TapButton.Kind.GHOST
		var b := UI.button(label_text, func():
			if SquadManager.is_unlocked(idx):
				_team = idx
				_populate(), k, 104.0)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_font_size_override("font_size", Pal.FS_SMALL)
		b.disabled = not unlocked
		_team_row.add_child(b)

func _update_action() -> void:
	var col := _column()
	if col == null:
		return
	if is_instance_valid(_action):
		_action.queue_free()
	if is_instance_valid(_note):
		_note.queue_free()
	var reason := ExpeditionManager.deploy_blocked_reason(_team, kind, target_id)
	if reason != "":
		_note = UI.label(reason, Pal.FS_SMALL, Pal.WARN, HORIZONTAL_ALIGNMENT_CENTER)
		_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		col.add_child(_note)
	var info := ExpeditionManager.target_info(kind, target_id)
	_action = UI.button("DEPLOY  ·  %d ENERGY" % int(info.get("energy", 0)), func():
		if ExpeditionManager.deploy(_team, kind, target_id):
			UIManager.say("%s deployed" % SquadManager.team_name(_team), "good")
			close()
		else:
			UIManager.say(ExpeditionManager.deploy_blocked_reason(_team, kind, target_id), "bad"),
		TapButton.Kind.PRIMARY, 158.0)
	_action.disabled = reason != ""
	_action.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_action.add_theme_font_size_override("font_size", Pal.FS_TITLE)
	col.add_child(_action)
	relayout()

func _column() -> VBoxContainer:
	for c in get_children():
		if c is PanelContainer and c.get_child_count() > 0:
			return c.get_child(0) as VBoxContainer
	return null

var _tick := 0.0

func _process(delta: float) -> void:
	_tick += delta
	if _tick < 0.25:
		return
	_tick = 0.0
	if kind == ExpeditionManager.KIND_EVENT and is_instance_valid(_expiry_label):
		var left := EventManager.remaining(target_id)
		_expiry_label.text = "Disappears in %s" % GameData.fmt_time(left)
		if left <= 0.0:
			close()
