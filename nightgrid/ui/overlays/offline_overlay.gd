extends Control
## "While you were away" — what the compound did on its own.

var _report: Dictionary

func _init(report: Dictionary) -> void:
	_report = report
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_STOP

func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0, 0, 0, 0.8)
	UI.full_rect(bg)
	add_child(bg)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.anchor_left = 0.0
	panel.anchor_right = 1.0
	panel.anchor_top = 0.5
	panel.anchor_bottom = 0.5
	panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	panel.offset_left = Pal.GAP
	panel.offset_right = -Pal.GAP
	var sb := Pal.panel_box(Pal.PANEL, Pal.CYAN, 28.0, 3)
	sb.shadow_color = Color(0, 0, 0, 0.7)
	sb.shadow_size = 28
	sb.content_margin_top = 30
	sb.content_margin_bottom = 26
	panel.add_theme_stylebox_override("panel", sb)
	add_child(panel)

	var v := UI.vbox(Pal.GAP_S)
	panel.add_child(v)
	v.add_child(UI.label("WHILE YOU WERE AWAY", Pal.FS_TITLE, Pal.CYAN, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UI.label(GameData.fmt_time(float(_report.get("away", 0.0))), Pal.FS_BIG, Pal.TEXT,
		HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UI.rule())

	var produced: Dictionary = _report.get("produced", {})
	if not produced.is_empty():
		v.add_child(UI.label("PRODUCTION WAITING IN THE BUFFERS", Pal.FS_MICRO, Pal.TEXT_FAINT))
		for k in produced.keys():
			v.add_child(_row(GameData.resource_label(String(k)).to_upper(),
				"+%s" % GameData.fmt(float(produced[k])), GameData.resource_color(String(k)), String(k)))

	var energy := int(_report.get("energy", 0))
	if energy > 0:
		v.add_child(_row("ENERGY", "+%d" % energy, Pal.WARN, "energy"))

	var built: Array = _report.get("built", [])
	if not built.is_empty():
		v.add_child(UI.label("CONSTRUCTION FINISHED", Pal.FS_MICRO, Pal.TEXT_FAINT))
		for b in built:
			v.add_child(_row(String(GameData.building(String(b["id"]))["name"]).to_upper(),
				"LV %d" % int(b["level"]), Pal.GOOD, "base"))

	var exps: Array = _report.get("expeditions", [])
	var arrived := 0
	var home := 0
	for e in exps:
		if String(e.get("event", "")) == "arrived":
			arrived += 1
		elif String(e.get("event", "")) == "returned":
			home += 1
	if arrived > 0:
		v.add_child(_row("SQUADS ON SITE", str(arrived), Pal.ACCENT, "target"))
	if home > 0:
		v.add_child(_row("SQUADS RETURNED", str(home), Pal.CYAN, "operatives"))

	if produced.is_empty() and energy <= 0 and built.is_empty() and exps.is_empty():
		v.add_child(UI.label("Quiet shift. Nothing to report.", Pal.FS_SMALL, Pal.TEXT_DIM,
			HORIZONTAL_ALIGNMENT_CENTER))

	var row := UI.hbox(Pal.GAP_S)
	if not produced.is_empty():
		var c := UI.button("COLLECT ALL", func():
			var got := BuildingManager.collect_all()
			var parts: Array = []
			for k in got.keys():
				parts.append("+%s %s" % [GameData.fmt(float(got[k])), GameData.resource_label(String(k))])
			if not parts.is_empty():
				UIManager.say(", ".join(PackedStringArray(parts)), "good")
			queue_free(), TapButton.Kind.SUCCESS, 150.0)
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(c)
	var b2 := UI.button("CONTINUE", func(): queue_free(), TapButton.Kind.PRIMARY, 150.0)
	b2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(b2)
	v.add_child(row)

	panel.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(panel, "modulate:a", 1.0, 0.2)

func _row(caption: String, value: String, col: Color, icon: String) -> Control:
	var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	var row := UI.hbox(Pal.GAP_S)
	p.add_child(row)
	row.add_child(IconView.new(icon, col, 42.0, 3.5))
	row.add_child(UI.label(caption, Pal.FS_SMALL, Pal.TEXT_DIM))
	row.add_child(UI.hfill())
	row.add_child(UI.label(value, Pal.FS_BODY, col))
	return p

func request_close() -> void:
	queue_free()
