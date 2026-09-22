extends GameScreen
## BASE tab: scrollable compound plus a collect-everything shortcut.

const Sheets := preload("res://ui/sheets/sheets.gd")

var _view: BaseView
var _scroll: ScrollContainer
var _collect_btn: TapButton
var _collect_label: Label

func build() -> void:
	_scroll = UI.scroll()
	UI.full_rect(_scroll)
	add_child(_scroll)

	_view = BaseView.new()
	_view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_view.building_tapped.connect(_open_building)
	_scroll.add_child(_view)

	# Floating collect bar, pinned above the navigation.
	var wrap := PanelContainer.new()
	wrap.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	wrap.anchor_top = 1.0
	wrap.anchor_bottom = 1.0
	wrap.anchor_right = 1.0
	wrap.grow_vertical = Control.GROW_DIRECTION_BEGIN
	wrap.offset_left = Pal.GAP
	wrap.offset_right = -Pal.GAP
	wrap.offset_bottom = -Pal.GAP
	var sb := Pal.panel_box(Pal.PANEL.lerp(Pal.BG_DEEP, 0.15), Pal.GOOD, Pal.RADIUS, 2)
	sb.shadow_color = Pal.SHADOW
	sb.shadow_size = 18
	wrap.add_theme_stylebox_override("panel", sb)
	add_child(wrap)

	var row := UI.hbox(Pal.GAP_S)
	wrap.add_child(row)
	var info := UI.vbox(2)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.add_child(UI.label("PRODUCTION READY", Pal.FS_MICRO, Pal.TEXT_FAINT))
	_collect_label = UI.label("—", Pal.FS_BODY, Pal.GOOD)
	info.add_child(_collect_label)
	row.add_child(info)
	_collect_btn = UI.button("COLLECT ALL", _collect_all, TapButton.Kind.SUCCESS, 118.0)
	_collect_btn.custom_minimum_size = Vector2(340, 118)
	row.add_child(_collect_btn)
	_collect_wrap = wrap

var _collect_wrap: PanelContainer

func refresh() -> void:
	if _view:
		_view.refresh_status()
	_refresh_collect()

var _tick := 0.0

func _process(delta: float) -> void:
	if not visible:
		return
	_tick += delta
	if _tick >= 0.4:
		_tick = 0.0
		_refresh_collect()

func _refresh_collect() -> void:
	if _collect_wrap == null:
		return
	var totals: Dictionary = {}
	for id in BuildingManager.state.keys():
		for k in BuildingManager.pending(String(id)).keys():
			totals[k] = int(totals.get(k, 0)) + int(BuildingManager.pending(String(id))[k])
	var any := not totals.is_empty()
	_collect_wrap.visible = any
	if not any:
		return
	var parts: Array = []
	for k in totals.keys():
		parts.append("%s %s" % [GameData.fmt(float(totals[k])), GameData.resource_label(String(k))])
	_collect_label.text = "  ·  ".join(PackedStringArray(parts))

func _collect_all() -> void:
	var got := BuildingManager.collect_all()
	if got.is_empty():
		UIManager.say("Nothing to collect yet", "info")
		return
	var parts: Array = []
	for k in got.keys():
		parts.append("+%s %s" % [GameData.fmt(float(got[k])), GameData.resource_label(String(k))])
	UIManager.say(", ".join(PackedStringArray(parts)), "good")
	_refresh_collect()

func _open_building(bid: String) -> void:
	var main: Node = get_tree().current_scene
	if main and main.has_method("open_sheet"):
		main.call("open_sheet", Sheets.building_sheet(bid))
