class_name BottomSheet
extends Control
## Slide-up panel. Keeps the screen behind it visible, which is the whole point:
## the player never loses the context they were looking at.

signal closed()

var body: VBoxContainer
var _panel: PanelContainer
var _backdrop: ColorRect
var _scroll: ScrollContainer
var _title_label: Label
var _closing := false
var _drag_from := -1.0
var max_ratio: float = 0.80

func _init(sheet_title: String = "", subtitle: String = "", ratio: float = 0.80) -> void:
	max_ratio = ratio
	set_anchors_preset(Control.PRESET_FULL_RECT)
	anchor_right = 1.0
	anchor_bottom = 1.0
	mouse_filter = Control.MOUSE_FILTER_STOP

	_backdrop = ColorRect.new()
	_backdrop.color = Color(0, 0, 0, 0.0)
	_backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	_backdrop.anchor_right = 1.0
	_backdrop.anchor_bottom = 1.0
	_backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	_backdrop.gui_input.connect(_on_backdrop_input)
	add_child(_backdrop)

	_panel = PanelContainer.new()
	var sb := Pal.panel_box(Pal.PANEL, Pal.LINE, 34.0, 2)
	sb.corner_radius_bottom_left = 0
	sb.corner_radius_bottom_right = 0
	sb.content_margin_left = Pal.GAP
	sb.content_margin_right = Pal.GAP
	sb.content_margin_top = 10
	sb.content_margin_bottom = 18
	sb.shadow_color = Color(0, 0, 0, 0.6)
	sb.shadow_size = 24
	_panel.add_theme_stylebox_override("panel", sb)
	# Anchored to both sides but not vertically, so the height is ours to set.
	_panel.anchor_left = 0.0
	_panel.anchor_right = 1.0
	_panel.anchor_top = 0.0
	_panel.anchor_bottom = 0.0
	_panel.offset_left = 0.0
	_panel.offset_right = 0.0
	_panel.offset_top = 0.0
	_panel.offset_bottom = 0.0
	add_child(_panel)

	var col := UI.vbox(Pal.GAP_S)
	_panel.add_child(col)

	# Grab handle — also the drag-to-dismiss target.
	var handle := Control.new()
	handle.custom_minimum_size = Vector2(0, 44)
	handle.mouse_filter = Control.MOUSE_FILTER_STOP
	handle.gui_input.connect(_on_handle_input)
	handle.draw.connect(func():
		var w := 120.0
		handle.draw_rect(Rect2(Vector2((handle.size.x - w) * 0.5, 16), Vector2(w, 8)), Pal.LINE, true))
	col.add_child(handle)

	var head := UI.hbox(Pal.GAP_S)
	col.add_child(head)
	var titles := UI.vbox(2)
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_title_label = UI.title(sheet_title, Pal.FS_TITLE)
	titles.add_child(_title_label)
	if subtitle != "":
		titles.add_child(UI.label(subtitle, Pal.FS_SMALL, Pal.TEXT_DIM))
	head.add_child(titles)
	head.add_child(UI.icon_button("close", close, 86.0, Pal.TEXT_DIM))

	col.add_child(UI.rule())

	_scroll = UI.scroll()
	body = UI.vbox(Pal.GAP_S)
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.add_child(body)
	col.add_child(_scroll)

func _ready() -> void:
	await get_tree().process_frame
	_apply_size()
	_panel.offset_top = size.y
	_panel.offset_bottom = size.y + _panel_height
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_method(_slide_to, size.y, size.y - _panel_height, 0.22) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(_backdrop, "color", Color(0, 0, 0, 0.62), 0.22)

var _panel_height := 600.0

func _slide_to(top: float) -> void:
	if not is_instance_valid(_panel):
		return
	_panel.offset_top = top
	_panel.offset_bottom = top + _panel_height

## Recomputes the panel height from its content. Call after rebuilding the body.
func _apply_size() -> void:
	if size.y <= 10.0:
		return
	var limit := size.y * max_ratio
	_scroll.custom_minimum_size = Vector2(0, 0)
	# ScrollContainer reports no content height, so the chrome is everything else.
	var chrome := _panel.get_combined_minimum_size().y
	var content_h := body.get_combined_minimum_size().y
	_panel_height = minf(chrome + content_h, limit)
	_scroll.custom_minimum_size = Vector2(0, maxf(_panel_height - chrome, 160.0))
	_slide_to(size.y - _panel_height)

func relayout() -> void:
	if not is_inside_tree() or _closing:
		return
	await get_tree().process_frame
	if is_instance_valid(_panel) and not _closing:
		_apply_size()

func set_title(t: String) -> void:
	_title_label.text = t.to_upper()

func _on_backdrop_input(e: InputEvent) -> void:
	if e is InputEventScreenTouch and e.pressed:
		close()
	elif e is InputEventMouseButton and e.pressed:
		close()

func _on_handle_input(e: InputEvent) -> void:
	if e is InputEventScreenTouch:
		if e.pressed:
			_drag_from = e.position.y
		else:
			_drag_from = -1.0
	elif e is InputEventScreenDrag and _drag_from >= 0.0:
		if e.position.y - _drag_from > 70.0:
			_drag_from = -1.0
			close()
	elif e is InputEventMouseButton:
		if not e.pressed and _drag_from >= 0.0:
			_drag_from = -1.0

func close() -> void:
	if _closing:
		return
	_closing = true
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_method(_slide_to, _panel.offset_top, size.y + 20.0, 0.18) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_property(_backdrop, "color", Color(0, 0, 0, 0.0), 0.18)
	await tw.finished
	closed.emit()
	queue_free()

## Convenience: a full-width primary action pinned under the scrolling body.
func add_action(text: String, cb: Callable, kind: int = TapButton.Kind.PRIMARY,
		enabled: bool = true, note: String = "") -> TapButton:
	var col := _panel.get_child(0) as VBoxContainer
	if note != "":
		var n := UI.label(note, Pal.FS_SMALL, Pal.WARN, HORIZONTAL_ALIGNMENT_CENTER)
		n.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_child(n)
	var b := UI.button(text, cb, kind, 150.0)
	b.disabled = not enabled
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_font_size_override("font_size", Pal.FS_TITLE)
	col.add_child(b)
	return b
