extends BottomSheet
## Everything about one structure, without leaving the compound behind it.

var bid: String

func _init(building_id: String) -> void:
	bid = building_id
	var def := GameData.building(building_id)
	super(String(def.get("name", "Structure")), String(def.get("blurb", "")), 0.84)
	_populate()
	BuildingManager.state_changed.connect(_on_state)
	BuildingManager.construction_finished.connect(func(_i, _l): _populate())
	ResourceManager.changed.connect(func(_r, _v): _update_enabled())

func _on_state(changed_id: String) -> void:
	if changed_id == bid:
		_populate()

func _populate() -> void:
	if not is_instance_valid(body):
		return
	UI.clear(body)
	var def := GameData.building(bid)
	var lvl := BuildingManager.level_of(bid)
	var cap := BuildingManager.max_level(bid)

	var head := UI.hbox(Pal.GAP)
	var level_card := UI.panel(Pal.PANEL_HI, Pal.ACCENT, Pal.RADIUS_S)
	var lv := UI.vbox(2)
	lv.add_child(UI.label("LEVEL", Pal.FS_MICRO, Pal.TEXT_FAINT, HORIZONTAL_ALIGNMENT_CENTER))
	lv.add_child(UI.label(str(lvl), Pal.FS_BIG, Pal.ACCENT, HORIZONTAL_ALIGNMENT_CENTER))
	lv.add_child(UI.label("MAX %d" % cap, Pal.FS_MICRO, Pal.TEXT_FAINT, HORIZONTAL_ALIGNMENT_CENTER))
	level_card.add_child(lv)
	level_card.custom_minimum_size = Vector2(200, 0)
	head.add_child(level_card)

	var facts := UI.vbox(8)
	facts.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for e in def.get("effects", []):
		var row := UI.hbox(10)
		row.add_child(IconView.new("check", Pal.GOOD, 26.0, 3.0))
		row.add_child(UI.wrap_label(String(e), Pal.FS_SMALL, Pal.TEXT_DIM))
		facts.add_child(row)
	head.add_child(facts)
	body.add_child(head)

	# Production
	var rates := BuildingManager.production_per_minute(bid)
	if not rates.is_empty():
		body.add_child(UI.rule())
		var pc := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
		var pv := UI.vbox(10)
		pc.add_child(pv)
		var prow := UI.hbox(Pal.GAP)
		prow.add_child(UI.label("OUTPUT", Pal.FS_MICRO, Pal.TEXT_FAINT))
		prow.add_child(UI.hfill())
		for res in rates.keys():
			var one := UI.hbox(6)
			one.add_child(IconView.new(String(res), GameData.resource_color(String(res)), 30.0, 3.0))
			one.add_child(UI.label("%s/min" % GameData.fmt(float(rates[res])), Pal.FS_SMALL, Pal.TEXT))
			prow.add_child(one)
		pv.add_child(prow)

		var pend := BuildingManager.pending(bid)
		var ratio := BuildingManager.buffer_fill_ratio(bid)
		var bar := StatBar.new(18.0, Pal.GOOD if ratio < 0.99 else Pal.WARN)
		bar.value = ratio
		pv.add_child(bar)
		var srow := UI.hbox(Pal.GAP_S)
		var stored := UI.label("Buffer %d%%  ·  holds %s of output" % [int(ratio * 100.0),
			GameData.fmt_time(BuildingManager.buffer_minutes() * 60.0)], Pal.FS_MICRO, Pal.TEXT_DIM)
		srow.add_child(stored)
		srow.add_child(UI.hfill())
		pv.add_child(srow)
		if not pend.is_empty():
			pv.add_child(UI.resource_row(pend, Pal.FS_BODY, 36.0))
			var cb := UI.button("COLLECT", func():
				var got := BuildingManager.collect(bid)
				var parts: Array = []
				for k in got.keys():
					parts.append("+%s %s" % [GameData.fmt(float(got[k])), GameData.resource_label(String(k))])
				UIManager.say(", ".join(PackedStringArray(parts)) if not parts.is_empty()
					else "Storage is full", "good" if not parts.is_empty() else "warn")
				_populate(), TapButton.Kind.SUCCESS, 118.0)
			cb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			pv.add_child(cb)
		body.add_child(pc)

	body.add_child(UI.rule())

	# Next level preview
	if lvl < cap:
		var next_rates := BuildingManager.production_per_minute(bid, lvl + 1)
		var nc := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
		var nv := UI.vbox(10)
		nc.add_child(nv)
		nv.add_child(UI.label("NEXT LEVEL  %d → %d" % [lvl, lvl + 1], Pal.FS_MICRO, Pal.TEXT_FAINT))
		if not next_rates.is_empty():
			var delta := UI.hbox(Pal.GAP)
			for res in next_rates.keys():
				var cur := float(rates.get(res, 0.0))
				var nxt := float(next_rates[res])
				var one2 := UI.hbox(6)
				one2.add_child(IconView.new(String(res), GameData.resource_color(String(res)), 28.0, 3.0))
				one2.add_child(UI.label("%s → %s /min" % [GameData.fmt(cur), GameData.fmt(nxt)],
					Pal.FS_SMALL, Pal.GOOD))
				delta.add_child(one2)
			nv.add_child(delta)
		if bid == "warehouse":
			var s_now := GameData.BuildingsData.storage_for_warehouse(lvl)
			var s_next := GameData.BuildingsData.storage_for_warehouse(lvl + 1)
			nv.add_child(UI.label("Cash storage %s → %s" % [GameData.fmt(float(s_now["cash"])),
				GameData.fmt(float(s_next["cash"]))], Pal.FS_SMALL, Pal.GOOD))
		var cost := BuildingManager.upgrade_cost(bid)
		var crow := UI.hbox(Pal.GAP)
		crow.add_child(UI.label("COST", Pal.FS_MICRO, Pal.TEXT_FAINT))
		crow.add_child(UI.resource_row(cost, Pal.FS_SMALL, 30.0, true))
		nv.add_child(crow)
		var trow := UI.hbox(10)
		trow.add_child(IconView.new("clock", Pal.CYAN, 28.0, 3.0))
		trow.add_child(UI.label(GameData.fmt_time(BuildingManager.upgrade_time(bid)), Pal.FS_SMALL, Pal.CYAN))
		nv.add_child(trow)
		body.add_child(nc)
	else:
		body.add_child(UI.label("This structure is at its ceiling for now.", Pal.FS_SMALL, Pal.TEXT_DIM))

	_refresh_action()

var _action: TapButton
var _note: Label

func _refresh_action() -> void:
	if not is_instance_valid(body):
		return
	var col := _panel_column()
	if col == null:
		return
	if is_instance_valid(_action):
		_action.queue_free()
	if is_instance_valid(_note):
		_note.queue_free()
	var lvl := BuildingManager.level_of(bid)

	if BuildingManager.is_constructing(bid):
		_note = UI.label("Completes in %s" % GameData.fmt_time(BuildingManager.construction_remaining(bid)),
			Pal.FS_SMALL, Pal.CYAN, HORIZONTAL_ALIGNMENT_CENTER)
		col.add_child(_note)
		var tokens := maxi(1, int(ceil(BuildingManager.construction_remaining(bid) / 30.0)))
		_action = UI.button("RUSH  ·  %d TOKENS" % tokens, func():
			if BuildingManager.rush_construction(bid):
				UIManager.say("Construction finished", "good")
				_populate()
			else:
				UIManager.say("Not enough Premium Tokens", "bad"),
			TapButton.Kind.SECONDARY, 150.0)
	else:
		var reason := BuildingManager.blocked_reason(bid)
		var can := BuildingManager.can_start_upgrade(bid)
		if reason != "" and not can:
			_note = UI.label(reason, Pal.FS_SMALL, Pal.WARN, HORIZONTAL_ALIGNMENT_CENTER)
			_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			col.add_child(_note)
		var verb := "BUILD" if lvl == 0 else "UPGRADE TO LV %d" % (lvl + 1)
		_action = UI.button(verb, func():
			if BuildingManager.start_upgrade(bid):
				UIManager.say("Construction started", "good")
				_populate()
			else:
				UIManager.say(BuildingManager.blocked_reason(bid), "bad"),
			TapButton.Kind.PRIMARY, 150.0)
		_action.disabled = not can
	_action.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_action.add_theme_font_size_override("font_size", Pal.FS_TITLE)
	col.add_child(_action)
	relayout()

func _update_enabled() -> void:
	if is_instance_valid(_action) and not BuildingManager.is_constructing(bid):
		_action.disabled = not BuildingManager.can_start_upgrade(bid)

func _panel_column() -> VBoxContainer:
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
	if BuildingManager.is_constructing(bid) and is_instance_valid(_note):
		_note.text = "Completes in %s" % GameData.fmt_time(BuildingManager.construction_remaining(bid))
