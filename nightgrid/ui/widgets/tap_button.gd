class_name TapButton
extends Button
## The only button type in the game. Guarantees a comfortable touch target and
## a consistent pressed state.

enum Kind { PRIMARY, SECONDARY, GHOST, DANGER, SUCCESS }

var kind: int = Kind.SECONDARY

func _init(text_value: String = "", k: int = Kind.SECONDARY, min_h: float = Pal.TAP_MIN) -> void:
	text = text_value
	kind = k
	custom_minimum_size = Vector2(0, min_h)
	focus_mode = Control.FOCUS_NONE
	clip_text = true
	autowrap_mode = TextServer.AUTOWRAP_OFF
	_apply_style()

func set_kind(k: int) -> void:
	kind = k
	_apply_style()

func _colors() -> Dictionary:
	match kind:
		Kind.PRIMARY:
			return {"fill": Pal.ACCENT, "border": Pal.ACCENT, "text": Color("#1a0d05")}
		Kind.DANGER:
			return {"fill": Color("#3a1519"), "border": Pal.BAD, "text": Pal.BAD}
		Kind.SUCCESS:
			return {"fill": Color("#123227"), "border": Pal.GOOD, "text": Pal.GOOD}
		Kind.GHOST:
			return {"fill": Color(0, 0, 0, 0), "border": Pal.LINE, "text": Pal.TEXT_DIM}
		_:
			return {"fill": Pal.PANEL_HI, "border": Pal.LINE, "text": Pal.TEXT}

func _apply_style() -> void:
	var c := _colors()
	var normal := Pal.panel_box(c["fill"], c["border"], Pal.RADIUS_S, 2)
	normal.content_margin_left = 24
	normal.content_margin_right = 24
	normal.content_margin_top = 14
	normal.content_margin_bottom = 14
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = (c["fill"] as Color).lerp(Color.BLACK, 0.25)
	pressed.border_color = (c["border"] as Color).lerp(Color.WHITE, 0.2)
	var disabled := normal.duplicate() as StyleBoxFlat
	disabled.bg_color = Pal.PANEL_SOFT
	disabled.border_color = Pal.LINE_SOFT
	add_theme_stylebox_override("normal", normal)
	add_theme_stylebox_override("hover", normal)
	add_theme_stylebox_override("pressed", pressed)
	add_theme_stylebox_override("focus", normal)
	add_theme_stylebox_override("disabled", disabled)
	add_theme_color_override("font_color", c["text"])
	add_theme_color_override("font_hover_color", c["text"])
	add_theme_color_override("font_pressed_color", c["text"])
	add_theme_color_override("font_disabled_color", Pal.TEXT_FAINT)
	add_theme_font_size_override("font_size", Pal.FS_LABEL)
