class_name RewardOverlay
extends Control
## Reward screen. Items arrive one at a time so a good drop actually registers.

const SELF_PATH := "res://ui/overlays/reward_overlay.gd"

var _list: VBoxContainer
var _title: Label
var _subtitle: Label
var _panel: PanelContainer
var _collect: TapButton
var _rows: Array = []
var _revealed := 0
var _accent: Color = Pal.GOLD

func _init() -> void:
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_STOP

static func _make() -> RewardOverlay:
	var s: GDScript = load(SELF_PATH)
	return s.new()

static func from_battle(result: Dictionary) -> RewardOverlay:
	var o := _make()
	var payload: Dictionary = result.get("payload", {})
	var victory := bool(result.get("victory", false))
	o._accent = Pal.GOLD if victory else Pal.BAD
	var rewards: Dictionary = payload.get("rewards", {})
	o._setup(
		"MISSION COMPLETE" if victory else "MISSION FAILED",
		"%s  ·  %d hostiles down  ·  %d turns" % [String(payload.get("name", "")),
			int(result.get("killed", 0)), int(result.get("turns", 0))],
		rewards.get("resources", {}),
		rewards.get("items", []),
		{
			"first_clear": bool(payload.get("first_clear", false)),
			"character_xp": int(payload.get("character_xp", 0)),
			"player_xp": int(payload.get("player_xp", 0)),
			"victory": victory,
		})
	return o

static func simple(title: String, granted: Dictionary) -> RewardOverlay:
	var o := _make()
	o._accent = Pal.GOOD
	o._setup(title.to_upper(), "Reward claimed", granted.get("resources", {}),
		granted.get("items", []), {"player_xp": int(granted.get("player_xp", 0))})
	return o

static func login(reward: Dictionary, streak: int) -> RewardOverlay:
	var o := _make()
	o._accent = Pal.GOLD
	var res: Dictionary = {}
	for k in reward.keys():
		if GameData.RESOURCES.has(String(k)):
			res[k] = int(reward[k])
	o._setup("DAILY LOGIN", "Day %d of the cycle" % ((streak % 7) + 1), res,
		reward.get("items", []), {"pending_login": true})
	return o

var _meta: Dictionary = {}

func _setup(title_text: String, subtitle_text: String, resources: Dictionary,
		items: Array, meta: Dictionary) -> void:
	_meta = meta
	var bg := ColorRect.new()
	bg.color = Color(0, 0, 0, 0.78)
	UI.full_rect(bg)
	add_child(bg)

	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_CENTER)
	_panel.anchor_left = 0.0
	_panel.anchor_right = 1.0
	_panel.anchor_top = 0.5
	_panel.anchor_bottom = 0.5
	_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
	_panel.offset_left = Pal.GAP
	_panel.offset_right = -Pal.GAP
	var sb := Pal.panel_box(Pal.PANEL, _accent, 28.0, 3)
	sb.shadow_color = Color(0, 0, 0, 0.7)
	sb.shadow_size = 30
	sb.content_margin_top = 30
	sb.content_margin_bottom = 26
	_panel.add_theme_stylebox_override("panel", sb)
	add_child(_panel)

	var v := UI.vbox(Pal.GAP_S)
	_panel.add_child(v)
	_title = UI.label(title_text, Pal.FS_BIG, _accent, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(_title)
	_subtitle = UI.label(subtitle_text, Pal.FS_SMALL, Pal.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER)
	_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_subtitle)
	if bool(meta.get("first_clear", false)):
		var fc := CenterContainer.new()
		fc.add_child(UI.chip("FIRST CLEAR BONUS ×2", Pal.GOLD, Pal.FS_SMALL))
		v.add_child(fc)
	v.add_child(UI.rule())

	_list = UI.vbox(Pal.GAP_S)
	v.add_child(_list)

	_rows = []
	for k in resources.keys():
		if int(resources[k]) <= 0:
			continue
		_rows.append(_resource_row(String(k), int(resources[k])))
	for iid in items:
		_rows.append(_item_row(String(iid)))
	if int(meta.get("character_xp", 0)) > 0:
		_rows.append(_plain_row("OPERATIVE XP", "+%d" % int(meta["character_xp"]), Pal.CYAN, "operatives"))
	if int(meta.get("player_xp", 0)) > 0:
		_rows.append(_plain_row("PLAYER XP", "+%d" % int(meta["player_xp"]), Pal.ACCENT, "power"))
	if _rows.is_empty():
		_rows.append(_plain_row("NO SALVAGE", "The site was picked clean", Pal.TEXT_DIM, "crate"))

	for r in _rows:
		r.modulate.a = 0.0
		r.visible = false
		_list.add_child(r)

	_collect = UI.button("COLLECT", _on_collect, TapButton.Kind.PRIMARY, 150.0)
	_collect.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_collect.add_theme_font_size_override("font_size", Pal.FS_TITLE)
	_collect.disabled = true
	v.add_child(_collect)

func _ready() -> void:
	_panel.modulate.a = 0.0
	_panel.scale = Vector2(0.94, 0.94)
	_panel.pivot_offset = _panel.size * 0.5
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(_panel, "modulate:a", 1.0, 0.18)
	tw.tween_property(_panel, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	_reveal_next()

func _reveal_next() -> void:
	if _revealed >= _rows.size():
		_collect.disabled = false
		return
	var row: Control = _rows[_revealed]
	_revealed += 1
	row.visible = true
	row.modulate.a = 0.0
	row.position.x = 40.0
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(row, "modulate:a", 1.0, 0.16)
	tw.tween_property(row, "position:x", 0.0, 0.2).set_trans(Tween.TRANS_CUBIC)
	tw.chain().tween_interval(0.10)
	tw.chain().tween_callback(_reveal_next)

func _reveal_all() -> void:
	for r in _rows:
		(r as Control).visible = true
		(r as Control).modulate.a = 1.0
		(r as Control).position.x = 0.0
	_revealed = _rows.size()
	_collect.disabled = false

func _resource_row(res: String, amount: int) -> Control:
	return _plain_row(GameData.resource_label(res).to_upper(), "+%s" % GameData.fmt(float(amount)),
		GameData.resource_color(res), res)

func _item_row(iid: String) -> Control:
	var it := GameData.item(iid)
	var rc := Pal.rarity(String(it["rarity"]))
	var p := UI.panel(Pal.PANEL_SOFT, rc, Pal.RADIUS_S)
	var row := UI.hbox(Pal.GAP_S)
	p.add_child(row)
	row.add_child(IconView.new(String(it["slot"]), rc, 52.0, 4.0))
	var col := UI.vbox(2)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(UI.label(String(it["name"]), Pal.FS_SMALL, Pal.TEXT))
	col.add_child(UI.label("%s %s  ·  PWR +%d" % [String(it["rarity"]),
		GameData.ItemsData.slot_label(String(it["slot"])), GameData.ItemsData.item_power(it)],
		Pal.FS_MICRO, rc))
	row.add_child(col)
	row.add_child(UI.chip("NEW", Pal.GOLD, Pal.FS_MICRO))
	return p

func _plain_row(caption: String, value: String, col: Color, icon: String) -> Control:
	var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	var row := UI.hbox(Pal.GAP_S)
	p.add_child(row)
	row.add_child(IconView.new(icon, col, 44.0, 3.5))
	row.add_child(UI.label(caption, Pal.FS_SMALL, Pal.TEXT_DIM))
	row.add_child(UI.hfill())
	row.add_child(UI.label(value, Pal.FS_BODY, col))
	return p

func _on_collect() -> void:
	if bool(_meta.get("pending_login", false)) and MissionManager.login_pending:
		MissionManager.claim_login()
	queue_free()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		if _revealed < _rows.size():
			_reveal_all()
			accept_event()

func request_close() -> void:
	if _revealed < _rows.size():
		_reveal_all()
		return
	_on_collect()
