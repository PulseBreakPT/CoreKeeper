class_name ToastLayer
extends Control
## Short status messages. They never block input and never steal a tap.

var _stack: VBoxContainer

func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	anchor_right = 1.0
	anchor_bottom = 1.0
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stack = UI.vbox(10)
	_stack.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_stack.anchor_right = 1.0
	_stack.offset_left = Pal.GAP
	_stack.offset_right = -Pal.GAP
	_stack.alignment = BoxContainer.ALIGNMENT_BEGIN
	_stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_stack)

func set_top_offset(v: float) -> void:
	_stack.offset_top = v

func show_toast(text: String, kind: String = "info") -> void:
	var col := Pal.TEXT
	var edge := Pal.LINE
	match kind:
		"good": edge = Pal.GOOD; col = Pal.GOOD
		"warn": edge = Pal.WARN; col = Pal.WARN
		"bad": edge = Pal.BAD; col = Pal.BAD
		_: edge = Pal.CYAN; col = Pal.TEXT
	var p := PanelContainer.new()
	var sb := Pal.panel_box(Pal.PANEL.lerp(Pal.BG_DEEP, 0.2), edge, 14.0, 2)
	sb.content_margin_top = 16
	sb.content_margin_bottom = 16
	sb.shadow_color = Pal.SHADOW
	sb.shadow_size = 12
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := UI.label(text, Pal.FS_SMALL, col, HORIZONTAL_ALIGNMENT_CENTER)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	p.add_child(l)
	p.modulate.a = 0.0
	_stack.add_child(p)
	while _stack.get_child_count() > 3:
		var old := _stack.get_child(0)
		_stack.remove_child(old)
		old.queue_free()
	var tw := create_tween()
	tw.tween_property(p, "modulate:a", 1.0, 0.16)
	tw.tween_interval(2.0)
	tw.tween_property(p, "modulate:a", 0.0, 0.35)
	tw.tween_callback(func():
		if is_instance_valid(p):
			p.queue_free())
