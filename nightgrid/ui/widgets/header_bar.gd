class_name HeaderBar
extends PanelContainer
## Top bar. Only what the player needs at a glance: level, power, energy and the
## three resources that gate most decisions. Everything else lives one tap away.

signal resources_tapped()
signal energy_tapped()
signal logo_tapped()

var _level_label: Label
var _power_label: Label
var _energy_label: Label
var _energy_bar: StatBar
var _xp_bar: StatBar
var _pills: Dictionary = {}
var safe_top: float = 0.0:
	set(v):
		safe_top = v
		_apply_safe()

func _init() -> void:
	var sb := Pal.panel_box(Pal.PANEL_SOFT, Pal.LINE_SOFT, 0.0, 0)
	sb.border_width_bottom = 2
	sb.border_color = Pal.LINE
	sb.content_margin_left = Pal.GAP
	sb.content_margin_right = Pal.GAP
	sb.content_margin_top = 14
	sb.content_margin_bottom = 10
	add_theme_stylebox_override("panel", sb)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build()

func _apply_safe() -> void:
	var sb := get_theme_stylebox("panel") as StyleBoxFlat
	if sb:
		sb.content_margin_top = 14 + safe_top

func _build() -> void:
	var root := UI.vbox(10)
	add_child(root)

	var top := UI.hbox(Pal.GAP_S)
	root.add_child(top)

	# Level badge doubles as the hidden dev-mode handle (long press).
	var badge := Button.new()
	badge.flat = true
	badge.focus_mode = Control.FOCUS_NONE
	badge.custom_minimum_size = Vector2(150, 74)
	badge.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL_HI, Pal.ACCENT, 10.0, 2))
	badge.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.ACCENT_DEEP, Pal.ACCENT, 10.0, 2))
	badge.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL_HI, Pal.ACCENT, 10.0, 2))
	badge.pressed.connect(func(): logo_tapped.emit())
	var bl := UI.hbox(8)
	bl.set_anchors_preset(Control.PRESET_FULL_RECT)
	bl.alignment = BoxContainer.ALIGNMENT_CENTER
	bl.add_child(UI.label("LV", Pal.FS_MICRO, Pal.ACCENT))
	_level_label = UI.label("1", Pal.FS_BODY, Pal.TEXT)
	bl.add_child(_level_label)
	badge.add_child(bl)
	top.add_child(badge)

	var power_box := UI.hbox(8)
	power_box.add_child(IconView.new("power", Pal.CYAN, 38.0, 3.0))
	_power_label = UI.label("0", Pal.FS_BODY, Pal.TEXT)
	power_box.add_child(_power_label)
	top.add_child(power_box)

	top.add_child(UI.hfill())

	var energy_btn := Button.new()
	energy_btn.flat = true
	energy_btn.focus_mode = Control.FOCUS_NONE
	energy_btn.custom_minimum_size = Vector2(230, 74)
	energy_btn.pressed.connect(func(): energy_tapped.emit())
	var eb := UI.vbox(4)
	eb.set_anchors_preset(Control.PRESET_FULL_RECT)
	eb.offset_left = 6
	eb.offset_right = -6
	var erow := UI.hbox(8)
	erow.add_child(IconView.new("energy", Pal.WARN, 34.0, 3.0))
	_energy_label = UI.label("100/100", Pal.FS_SMALL, Pal.TEXT)
	erow.add_child(_energy_label)
	eb.add_child(erow)
	_energy_bar = StatBar.new(8.0, Pal.WARN)
	eb.add_child(_energy_bar)
	energy_btn.add_child(eb)
	top.add_child(energy_btn)

	var more := UI.icon_button("plus", func(): resources_tapped.emit(), 74.0, Pal.TEXT_DIM)
	more.custom_minimum_size = Vector2(74, 74)
	top.add_child(more)

	# Resource strip
	var strip := Button.new()
	strip.flat = true
	strip.focus_mode = Control.FOCUS_NONE
	strip.custom_minimum_size = Vector2(0, 54)
	strip.pressed.connect(func(): resources_tapped.emit())
	var row := UI.hbox(Pal.GAP)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	for res in GameData.HEADER_RESOURCES:
		var pill := UI.hbox(8)
		pill.add_child(IconView.new(res, GameData.resource_color(res), 34.0, 3.0))
		var lab := UI.label("0", Pal.FS_SMALL, Pal.TEXT)
		pill.add_child(lab)
		_pills[res] = lab
		row.add_child(pill)
	row.add_child(UI.hfill())
	strip.add_child(row)
	root.add_child(strip)

	_xp_bar = StatBar.new(6.0, Pal.ACCENT)
	_xp_bar.track_color = Pal.LINE_SOFT
	root.add_child(_xp_bar)

func refresh() -> void:
	_level_label.text = str(GameManager.player_level)
	_power_label.text = GameData.fmt(float(GameManager.total_power()))
	var need := GameManager.xp_to_next()
	_xp_bar.value = 0.0 if need <= 0 else float(GameManager.player_xp) / float(need)
	var e := ResourceManager.energy
	var em := ResourceManager.energy_max
	_energy_label.text = "%d/%d" % [int(floor(e)), em]
	_energy_bar.value = 0.0 if em <= 0 else e / float(em)
	_energy_bar.fill_color = Pal.WARN if e < float(em) * 0.3 else Pal.GOOD
	if GameManager.dev_infinite_energy:
		_energy_label.text = "DEV"
	for res in _pills.keys():
		var lab: Label = _pills[res]
		var amount := ResourceManager.get_amount(String(res))
		lab.text = GameData.fmt(float(amount))
		lab.add_theme_color_override("font_color",
			Pal.WARN if ResourceManager.is_full(String(res)) else Pal.TEXT)
