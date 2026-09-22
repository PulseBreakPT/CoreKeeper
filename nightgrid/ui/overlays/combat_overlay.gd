extends Control
## The fight, played out. Enemies on top, your squad on the bottom, the exchange
## in the middle. Fully automatic — the player watches and controls the pace.

var _cards: Dictionary = {}
var _fx: Control
var _log: VBoxContainer
var _announce: Label
var _turn_label: Label
var _speed_buttons: Array = []
var _finished := false
var _bg: ColorRect
var _order: Control

## Upcoming actors, soonest first — the same ordering the simulation uses.
func _draw_order() -> void:
	if _order == null:
		return
	var queue: Array = []
	for u in CombatManager.all_units():
		if not bool(u["alive"]):
			continue
		var speed: float = maxf(float(u["speed"]), 1.0)
		var eta := (CombatManager.GAUGE_MAX - float(u["gauge"])) / (speed * CombatManager.GAUGE_RATE)
		queue.append({"u": u, "eta": eta})
	queue.sort_custom(func(a, b): return float(a["eta"]) < float(b["eta"]))
	var n := mini(queue.size(), 7)
	if n == 0:
		return
	var cell := minf(_order.size.x / float(n), 130.0)
	var start := (_order.size.x - cell * float(n)) * 0.5
	var font := ThemeDB.fallback_font
	for i in range(n):
		var u: Dictionary = queue[i]["u"]
		var ally := String(u["side"]) == "ally"
		var col: Color = Pal.CYAN if ally else Pal.BAD
		var r := Rect2(Vector2(start + cell * float(i) + 6.0, 6.0), Vector2(cell - 12.0, 52.0))
		_order.draw_rect(r, Pal.PANEL_SOFT.lerp(col, 0.14 if i > 0 else 0.34), true)
		_order.draw_rect(r, col.lerp(Pal.BG, 0.0 if i == 0 else 0.55), false, 2.0)
		var nm := String(u["name"])
		_order.draw_string(font, r.position + Vector2(8, 34), nm.substr(0, 9),
			HORIZONTAL_ALIGNMENT_CENTER, r.size.x - 16.0, 24, Pal.TEXT if i == 0 else Pal.TEXT_DIM)
		var hp := float(u["hp"]) / maxf(float(u["max_hp"]), 1.0)
		_order.draw_rect(Rect2(r.position + Vector2(0, r.size.y + 4.0), Vector2(r.size.x * hp, 6.0)), col, true)

func _init() -> void:
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_STOP

func _ready() -> void:
	_build()
	CombatManager.unit_changed.connect(_on_unit_changed)
	CombatManager.combat_event.connect(_on_event)
	CombatManager.battle_finished.connect(_on_finished)
	CombatManager.speed_scale = float(GameManager.settings.get("combat_speed", 1.0))
	_update_speed_buttons()

func _build() -> void:
	_bg = ColorRect.new()
	_bg.color = Color(0.02, 0.026, 0.035, 0.985)
	UI.full_rect(_bg)
	add_child(_bg)

	var root := UI.vbox(Pal.GAP_S)
	UI.full_rect(root)
	root.offset_left = Pal.GAP_S
	root.offset_right = -Pal.GAP_S
	root.offset_top = 46
	root.offset_bottom = -36
	add_child(root)

	var info := CombatManager.context()

	# --- Top bar
	var top := UI.hbox(Pal.GAP_S)
	var titles := UI.vbox(2)
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_child(UI.label(String(info.get("name", "Engagement")).to_upper(), Pal.FS_BODY, Pal.TEXT))
	_turn_label = UI.label("", Pal.FS_MICRO, Pal.TEXT_DIM)
	titles.add_child(_turn_label)
	top.add_child(titles)
	var retreat := UI.button("RETREAT", request_close, TapButton.Kind.DANGER, 92.0)
	retreat.custom_minimum_size = Vector2(240, 92)
	retreat.add_theme_font_size_override("font_size", Pal.FS_SMALL)
	top.add_child(retreat)
	root.add_child(top)

	# --- Enemies
	var elabel := UI.hbox(8)
	elabel.add_child(UI.label("HOSTILES", Pal.FS_MICRO, Pal.BAD))
	elabel.add_child(UI.hfill())
	root.add_child(elabel)
	var erow := UI.hbox(8)
	erow.size_flags_vertical = Control.SIZE_EXPAND_FILL
	erow.size_flags_stretch_ratio = 1.25
	for u in CombatManager.enemies:
		var c := CombatUnitCard.new(u)
		_cards[String(u["uid"])] = c
		erow.add_child(c)
	root.add_child(erow)

	# --- Centre band
	var centre := PanelContainer.new()
	centre.size_flags_vertical = Control.SIZE_EXPAND_FILL
	centre.size_flags_stretch_ratio = 0.6
	centre.custom_minimum_size = Vector2(0, 260)
	var sb := Pal.panel_box(Pal.BG_DEEP, Pal.LINE_SOFT, Pal.RADIUS_S, 2)
	centre.add_theme_stylebox_override("panel", sb)
	root.add_child(centre)
	var cv := UI.vbox(6)
	centre.add_child(cv)
	_announce = UI.label("", Pal.FS_TITLE, Pal.ACCENT, HORIZONTAL_ALIGNMENT_CENTER)
	_announce.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cv.add_child(_announce)
	cv.add_child(UI.label("NEXT TO ACT", Pal.FS_MICRO, Pal.TEXT_FAINT, HORIZONTAL_ALIGNMENT_CENTER))
	_order = Control.new()
	_order.custom_minimum_size = Vector2(0, 78)
	_order.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_order.draw.connect(_draw_order)
	cv.add_child(_order)
	cv.add_child(UI.rule())
	_log = UI.vbox(2)
	_log.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log.alignment = BoxContainer.ALIGNMENT_END
	cv.add_child(_log)

	# --- Allies
	var alabel := UI.hbox(8)
	alabel.add_child(UI.label("YOUR SQUAD", Pal.FS_MICRO, Pal.CYAN))
	alabel.add_child(UI.hfill())
	root.add_child(alabel)
	var arow := UI.hbox(8)
	arow.size_flags_vertical = Control.SIZE_EXPAND_FILL
	arow.size_flags_stretch_ratio = 1.25
	for u in CombatManager.allies:
		var c2 := CombatUnitCard.new(u)
		_cards[String(u["uid"])] = c2
		arow.add_child(c2)
	root.add_child(arow)

	# --- Speed control
	var srow := UI.hbox(Pal.GAP_S)
	srow.add_child(UI.label("SPEED", Pal.FS_MICRO, Pal.TEXT_FAINT))
	_speed_buttons = []
	for mult in [1.0, 2.0, 3.0]:
		var m := float(mult)
		var b := UI.button("%dx" % int(m), func():
			CombatManager.speed_scale = m
			GameManager.settings["combat_speed"] = m
			SaveManager.mark_dirty()
			_update_speed_buttons(), TapButton.Kind.GHOST, 92.0)
		b.custom_minimum_size = Vector2(120, 92)
		_speed_buttons.append({"button": b, "mult": m})
		srow.add_child(b)
	srow.add_child(UI.hfill())
	root.add_child(srow)

	_fx = Control.new()
	UI.full_rect(_fx)
	_fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fx)

func _update_speed_buttons() -> void:
	for e in _speed_buttons:
		var b: TapButton = e["button"]
		b.set_kind(TapButton.Kind.PRIMARY if is_equal_approx(CombatManager.speed_scale, float(e["mult"]))
			else TapButton.Kind.GHOST)

var _hud_tick := 0.0
var _order_tick := 0.0

func _process(delta: float) -> void:
	# The queue re-shapes seven names, so it repaints at a readable rate rather
	# than once per frame.
	_order_tick += delta
	if _order_tick >= 0.1 and _order != null:
		_order_tick = 0.0
		_order.queue_redraw()
	_hud_tick += delta
	if _hud_tick >= 0.2 and _turn_label and CombatManager.active:
		_hud_tick = 0.0
		_turn_label.text = "TURN %d  ·  %d vs %d" % [CombatManager.turn_counter,
			_alive(CombatManager.allies), _alive(CombatManager.enemies)]

func _alive(side: Array) -> int:
	var n := 0
	for u in side:
		if bool(u["alive"]):
			n += 1
	return n

func _on_unit_changed(uid: String) -> void:
	if _cards.has(uid):
		(_cards[uid] as CombatUnitCard).refresh()

func _on_event(e: Dictionary) -> void:
	var t := String(e["type"])
	match t:
		"damage":
			var card := _card(String(e["uid"]))
			if card:
				var crit := bool(e.get("crit", false))
				_float_text(card, "-%d" % int(e["amount"]),
					Pal.GOLD if crit else Pal.BAD, crit)
				card.flash(Pal.BAD)
				if crit:
					card.shake()
			if String(e.get("label", "")) != "":
				_push_log("%s" % String(e["label"]), Pal.ACCENT)
		"heal":
			var card2 := _card(String(e["uid"]))
			if card2:
				_float_text(card2, "+%d" % int(e["amount"]), Pal.GOOD, false)
				card2.flash(Pal.GOOD)
		"shield":
			var card3 := _card(String(e["uid"]))
			if card3:
				_float_text(card3, "SHIELD %d" % int(e["amount"]), Pal.CYAN, false)
		"skill":
			var u := CombatManager.unit_by_uid(String(e["uid"]))
			var who := String(u.get("name", "?"))
			_announce_skill("%s — %s" % [who.to_upper(), String(e["name"]).to_upper()],
				Pal.CYAN if String(u.get("side", "")) == "ally" else Pal.BAD)
			_push_log("%s uses %s" % [who, String(e["name"])],
				Pal.CYAN if String(u.get("side", "")) == "ally" else Pal.BAD)
		"status_text":
			var card4 := _card(String(e["uid"]))
			if card4:
				_float_text(card4, String(e["text"]), Pal.GOLD, false)
		"death":
			var u2 := CombatManager.unit_by_uid(String(e["uid"]))
			_push_log("%s is down" % String(u2.get("name", "?")),
				Pal.BAD if String(u2.get("side", "")) == "ally" else Pal.GOOD)

func _card(uid: String) -> CombatUnitCard:
	return _cards.get(uid, null)

func _float_text(card: CombatUnitCard, text: String, col: Color, big: bool) -> void:
	if not is_instance_valid(card) or not is_instance_valid(_fx):
		return
	var l := UI.label(text, Pal.FS_TITLE if big else Pal.FS_BODY, col, HORIZONTAL_ALIGNMENT_CENTER)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", 6)
	_fx.add_child(l)
	var origin := card.global_position + Vector2(card.size.x * 0.5, card.size.y * 0.35) - global_position
	l.position = origin + Vector2(randf_range(-26.0, 26.0) - 60.0, 0)
	l.custom_minimum_size = Vector2(120, 0)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "position:y", l.position.y - 110.0, 0.75).set_trans(Tween.TRANS_QUAD)
	tw.tween_property(l, "modulate:a", 0.0, 0.75).set_delay(0.2)
	tw.chain().tween_callback(func():
		if is_instance_valid(l):
			l.queue_free())

func _announce_skill(text: String, col: Color) -> void:
	if not is_instance_valid(_announce):
		return
	_announce.text = text
	_announce.add_theme_color_override("font_color", col)
	_announce.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(0.7 / maxf(CombatManager.speed_scale, 0.5))
	tw.tween_property(_announce, "modulate:a", 0.0, 0.35)

func _push_log(text: String, col: Color) -> void:
	if not is_instance_valid(_log):
		return
	var l := UI.label(text, Pal.FS_SMALL, col, HORIZONTAL_ALIGNMENT_CENTER)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_log.add_child(l)
	while _log.get_child_count() > 5:
		var old := _log.get_child(0)
		_log.remove_child(old)
		old.queue_free()
	for i in range(_log.get_child_count()):
		var c := _log.get_child(i) as Control
		c.modulate.a = 0.35 + 0.65 * float(i + 1) / float(_log.get_child_count())

func _on_finished(result: Dictionary) -> void:
	if _finished:
		return
	_finished = true
	var victory := bool(result.get("victory", false))
	_announce.text = "VICTORY" if victory else "SQUAD WITHDRAWN"
	_announce.add_theme_color_override("font_color", Pal.GOOD if victory else Pal.BAD)
	_announce.add_theme_font_size_override("font_size", Pal.FS_HUGE)
	_announce.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(1.1)
	tw.tween_callback(func():
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_overlay"):
			main.call("open_overlay", RewardOverlay.from_battle(result))
		queue_free())

func request_close() -> void:
	if _finished:
		queue_free()
		return
	var confirm := ConfirmationDialog.new()
	confirm.dialog_text = "Pull the squad out? The job counts as failed and the energy is spent."
	confirm.title = "Retreat"
	confirm.ok_button_text = "RETREAT"
	confirm.cancel_button_text = "STAY"
	add_child(confirm)
	confirm.popup_centered(Vector2i(760, 420))
	confirm.confirmed.connect(func():
		CombatManager.paused = false
		CombatManager.abandon())
	CombatManager.paused = true
	confirm.canceled.connect(func(): CombatManager.paused = false)
	confirm.close_requested.connect(func(): CombatManager.paused = false)
