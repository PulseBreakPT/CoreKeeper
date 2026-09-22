extends BottomSheet
## Full operative record: stats, skill, gear, promotion.

var cid: String

func _init(char_id: String) -> void:
	cid = char_id
	var def := GameData.character(char_id)
	super(String(def.get("codename", "Operative")), String(def.get("name", "")), 0.88)
	_populate()
	CharacterManager.character_changed.connect(func(c): if c == cid: _populate())
	ResourceManager.changed.connect(func(_r, _v): _update_enabled())

func _populate() -> void:
	if not is_instance_valid(body):
		return
	UI.clear(body)
	var def := GameData.character(cid)
	var st := CharacterManager.stats(cid)
	var lvl := CharacterManager.level_of(cid)
	var rarity := String(def["rarity"])

	var head := UI.hbox(Pal.GAP)
	var pt := Portrait.for_character(cid)
	pt.custom_minimum_size = Vector2(240, 290)
	head.add_child(pt)
	var side := UI.vbox(8)
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var tags := UI.hbox(8)
	tags.add_child(UI.chip(rarity, Pal.rarity(rarity)))
	tags.add_child(UI.chip(String(def["klass"]), GameData.CharactersData.class_color(String(def["klass"]))))
	side.add_child(tags)
	side.add_child(UI.stat_block("Level", "%d / %d" % [lvl, CharacterManager.level_cap()], Pal.TEXT, Pal.FS_TITLE))
	side.add_child(UI.stat_block("Power", GameData.fmt(float(CharacterManager.power(cid))), Pal.CYAN, Pal.FS_TITLE))
	var need := CharacterManager.xp_to_next(lvl)
	var xp := CharacterManager.xp_of(cid)
	var xb := StatBar.new(14.0, Pal.ACCENT)
	xb.value = 0.0 if need <= 0 else clampf(float(xp) / float(need), 0.0, 1.0)
	side.add_child(xb)
	side.add_child(UI.label("XP %d / %d" % [xp, need], Pal.FS_MICRO, Pal.TEXT_DIM))
	head.add_child(side)
	body.add_child(head)

	body.add_child(UI.wrap_label(String(def["bio"]), Pal.FS_SMALL, Pal.TEXT_DIM))
	body.add_child(UI.rule())

	# Stats grid
	var g := UI.grid(3, Pal.GAP_S)
	g.add_child(_stat_cell("HP", GameData.fmt(float(st["max_hp"])), Pal.GOOD))
	g.add_child(_stat_cell("ATTACK", GameData.fmt(float(st["attack"])), Pal.BAD))
	g.add_child(_stat_cell("DEFENCE", GameData.fmt(float(st["defense"])), Pal.CYAN))
	g.add_child(_stat_cell("SPEED", str(int(st["speed"])), Pal.WARN))
	g.add_child(_stat_cell("CRIT", "%d%%" % int(round(float(st["crit"]) * 100.0)), Pal.GOLD))
	g.add_child(_stat_cell("CRIT DMG", "%d%%" % int(round(float(st["crit_dmg"]) * 100.0)), Pal.GOLD))
	body.add_child(g)

	# Skill
	var sk: Dictionary = def["skill"]
	var sc := UI.panel(Pal.PANEL_SOFT, Pal.ACCENT.lerp(Pal.BG, 0.6), Pal.RADIUS_S)
	var sv := UI.vbox(6)
	sc.add_child(sv)
	var srow := UI.hbox(10)
	srow.add_child(IconView.new("energy", Pal.ACCENT, 30.0, 3.0))
	srow.add_child(UI.label(String(sk["name"]).to_upper(), Pal.FS_BODY, Pal.ACCENT))
	srow.add_child(UI.hfill())
	srow.add_child(UI.chip("%d ENERGY" % int(sk.get("cost", 100)), Pal.TEXT_DIM))
	sv.add_child(srow)
	sv.add_child(UI.wrap_label(String(sk["desc"]), Pal.FS_SMALL, Pal.TEXT_DIM))
	body.add_child(sc)

	# Equipment
	body.add_child(UI.label("EQUIPMENT", Pal.FS_MICRO, Pal.TEXT_FAINT))
	for slot in GameData.ItemsData.slots():
		body.add_child(_slot_row(String(slot)))
	var auto := UI.button("AUTO-EQUIP BEST", func():
		var n := CharacterManager.auto_equip(cid)
		UIManager.say("%d slots improved" % n if n > 0 else "Already carrying the best you have",
			"good" if n > 0 else "info")
		_populate(), TapButton.Kind.GHOST, 108.0)
	auto.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(auto)

	_update_action()

func _stat_cell(caption: String, value: String, col: Color) -> Control:
	var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := UI.vbox(2)
	v.add_child(UI.label(caption, Pal.FS_MICRO, Pal.TEXT_FAINT))
	v.add_child(UI.label(value, Pal.FS_BODY, col))
	p.add_child(v)
	return p

func _slot_row(slot: String) -> Control:
	var iid := CharacterManager.equipped_item(cid, slot)
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 132)
	var border: Color = Pal.LINE if iid == "" else Pal.rarity(String(GameData.item(iid)["rarity"]))
	b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL, border, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_HI, border, Pal.RADIUS_S, 2))
	b.pressed.connect(func(): _open_picker(slot))
	var row := UI.hbox(Pal.GAP_S)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 16
	row.offset_right = -16
	row.add_child(IconView.new(slot, border, 56.0, 4.0))
	var info := UI.vbox(2)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	info.add_child(UI.label(GameData.ItemsData.slot_label(slot).to_upper(), Pal.FS_MICRO, Pal.TEXT_FAINT))
	if iid == "":
		info.add_child(UI.label("Empty — tap to fit", Pal.FS_SMALL, Pal.TEXT_DIM))
	else:
		var it := GameData.item(iid)
		info.add_child(UI.label(String(it["name"]), Pal.FS_SMALL, Pal.TEXT))
		info.add_child(UI.label("PWR +%d" % GameData.ItemsData.item_power(it), Pal.FS_MICRO, Pal.CYAN))
	row.add_child(info)
	if iid != "":
		var un := UI.button("REMOVE", func():
			CharacterManager.unequip(cid, slot)
			_populate(), TapButton.Kind.GHOST, 88.0)
		un.custom_minimum_size = Vector2(180, 88)
		un.add_theme_font_size_override("font_size", Pal.FS_MICRO)
		un.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(un)
	b.add_child(row)
	return b

func _open_picker(slot: String) -> void:
	var main: Node = Engine.get_main_loop().current_scene
	if main == null or not main.has_method("open_sheet"):
		return
	var sheet := BottomSheet.new("Fit %s" % GameData.ItemsData.slot_label(slot),
		"Owned equipment for this slot", 0.7)
	var found := false
	for id in CharacterManager.inventory_ids():
		var it := GameData.item(String(id))
		if String(it["slot"]) != slot:
			continue
		found = true
		var item_id := String(id)
		var b := Button.new()
		b.flat = true
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(0, 140)
		var rc := Pal.rarity(String(it["rarity"]))
		b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL, rc.lerp(Pal.BG, 0.4), Pal.RADIUS_S, 2))
		b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL, rc, Pal.RADIUS_S, 2))
		b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_HI, rc, Pal.RADIUS_S, 2))
		b.pressed.connect(func():
			CharacterManager.equip(cid, item_id)
			UIManager.say("%s fitted" % String(it["name"]), "good")
			sheet.close()
			_populate())
		var row := UI.hbox(Pal.GAP_S)
		row.set_anchors_preset(Control.PRESET_FULL_RECT)
		row.offset_left = 16
		row.offset_right = -16
		row.add_child(IconView.new(slot, rc, 52.0, 4.0))
		var col := UI.vbox(2)
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		col.add_child(UI.label(String(it["name"]), Pal.FS_SMALL, Pal.TEXT))
		col.add_child(UI.label("%s · PWR +%d · ×%d" % [String(it["rarity"]),
			GameData.ItemsData.item_power(it), CharacterManager.item_count(item_id)],
			Pal.FS_MICRO, rc))
		row.add_child(col)
		b.add_child(row)
		sheet.body.add_child(b)
	if not found:
		sheet.body.add_child(UI.label("Nothing in storage for this slot yet.", Pal.FS_SMALL, Pal.TEXT_DIM))
	main.call("open_sheet", sheet)

var _action: TapButton
var _note: Label

func _update_action() -> void:
	var col := _column()
	if col == null:
		return
	if is_instance_valid(_action):
		_action.queue_free()
	if is_instance_valid(_note):
		_note.queue_free()
	var reason := CharacterManager.train_blocked_reason(cid)
	if reason != "":
		_note = UI.label(reason, Pal.FS_SMALL, Pal.WARN, HORIZONTAL_ALIGNMENT_CENTER)
		col.add_child(_note)
	var cost := CharacterManager.train_cost(cid)
	var cost_text := "%s CASH · %s SUPPLIES" % [GameData.fmt(float(cost["cash"])),
		GameData.fmt(float(cost["supplies"]))]
	_action = UI.button("TRAIN  ·  " + cost_text, func():
		if CharacterManager.train(cid):
			UIManager.say("Training complete", "good")
			_populate()
		else:
			UIManager.say(CharacterManager.train_blocked_reason(cid), "bad"),
		TapButton.Kind.PRIMARY, 158.0)
	_action.disabled = not CharacterManager.can_train(cid)
	_action.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_action.add_theme_font_size_override("font_size", Pal.FS_BODY)
	col.add_child(_action)
	relayout()

func _update_enabled() -> void:
	if is_instance_valid(_action):
		_action.disabled = not CharacterManager.can_train(cid)

func _column() -> VBoxContainer:
	for c in get_children():
		if c is PanelContainer and c.get_child_count() > 0:
			return c.get_child(0) as VBoxContainer
	return null
