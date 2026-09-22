class_name NavBar
extends PanelContainer
## Permanent five-way bottom navigation. Icon plus text, generous targets, and it
## keeps clear of Android's gesture area.

signal tab_selected(tab: String)

var _buttons: Dictionary = {}
var _badges: Dictionary = {}
var _current: String = UIManager.TAB_BASE
var safe_bottom: float = 0.0:
	set(v):
		safe_bottom = v
		var sb := get_theme_stylebox("panel") as StyleBoxFlat
		if sb:
			sb.content_margin_bottom = 12 + safe_bottom

func _init() -> void:
	var sb := Pal.panel_box(Pal.PANEL_SOFT, Pal.LINE, 0.0, 0)
	sb.border_width_top = 2
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	sb.content_margin_top = 10
	sb.content_margin_bottom = 12
	add_theme_stylebox_override("panel", sb)
	_build()

func _icon_for(tab: String) -> String:
	match tab:
		UIManager.TAB_BASE: return "base"
		UIManager.TAB_MAP: return "map"
		UIManager.TAB_OPERATIVES: return "operatives"
		UIManager.TAB_MISSIONS: return "missions"
		_: return "inventory"

func _build() -> void:
	var row := UI.hbox(0)
	add_child(row)
	for tab in UIManager.tabs():
		var t := String(tab)
		var b := Button.new()
		b.flat = true
		b.focus_mode = Control.FOCUS_NONE
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.custom_minimum_size = Vector2(0, Pal.TAP_MIN)
		b.pressed.connect(func(): tab_selected.emit(t))
		var col := UI.vbox(4)
		col.set_anchors_preset(Control.PRESET_FULL_RECT)
		col.alignment = BoxContainer.ALIGNMENT_CENTER
		var icon_wrap := CenterContainer.new()
		var iv := IconView.new(_icon_for(t), Pal.TEXT_FAINT, 54.0, 4.0)
		icon_wrap.add_child(iv)
		col.add_child(icon_wrap)
		var lab := UI.label(t, Pal.FS_MICRO, Pal.TEXT_FAINT, HORIZONTAL_ALIGNMENT_CENTER)
		lab.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_child(lab)
		b.add_child(col)

		var badge := UI.label("", Pal.FS_MICRO, Pal.BG, HORIZONTAL_ALIGNMENT_CENTER)
		var badge_panel := PanelContainer.new()
		badge_panel.add_theme_stylebox_override("panel", Pal.flat_box(Pal.ACCENT, 14.0))
		badge_panel.add_child(badge)
		badge_panel.visible = false
		badge_panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
		badge_panel.offset_left = -78
		badge_panel.offset_top = 4
		badge_panel.offset_right = -20
		badge_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(badge_panel)

		_buttons[t] = {"button": b, "icon": iv, "label": lab}
		_badges[t] = {"panel": badge_panel, "label": badge}
		row.add_child(b)
	set_current(UIManager.TAB_BASE)

func set_current(tab: String) -> void:
	_current = tab
	for t in _buttons.keys():
		var on := String(t) == tab
		var entry: Dictionary = _buttons[t]
		var accent_tab := String(t) == UIManager.TAB_MAP
		var col: Color = Pal.ACCENT if on else (Pal.CYAN.lerp(Pal.TEXT_FAINT, 0.45) if accent_tab else Pal.TEXT_FAINT)
		(entry["icon"] as IconView).color = col
		(entry["label"] as Label).add_theme_color_override("font_color", col)
		(entry["icon"] as IconView).thickness = 5.0 if on else 4.0

func set_badge(tab: String, count: int) -> void:
	if not _badges.has(tab):
		return
	var b: Dictionary = _badges[tab]
	(b["panel"] as Control).visible = count > 0
	(b["label"] as Label).text = str(mini(count, 99))
