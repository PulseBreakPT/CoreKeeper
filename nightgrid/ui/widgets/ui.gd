class_name UI
extends RefCounted
## Small factory helpers. The whole interface is assembled in code from these so
## layout rules (touch sizes, spacing, contrast) live in exactly one place.

static func label(text: String, fs: int = Pal.FS_BODY, col: Color = Pal.TEXT,
		align: int = HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", fs)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = align
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

static func wrap_label(text: String, fs: int = Pal.FS_SMALL, col: Color = Pal.TEXT_DIM) -> Label:
	var l := label(text, fs, col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

static func title(text: String, fs: int = Pal.FS_TITLE, col: Color = Pal.TEXT) -> Label:
	var l := label(text.to_upper(), fs, col)
	l.add_theme_constant_override("line_spacing", 2)
	return l

static func vbox(sep: float = Pal.GAP_S) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", int(sep))
	return v

static func hbox(sep: float = Pal.GAP_S) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", int(sep))
	return h

static func grid(cols: int, sep: float = Pal.GAP_S) -> GridContainer:
	var g := GridContainer.new()
	g.columns = cols
	g.add_theme_constant_override("h_separation", int(sep))
	g.add_theme_constant_override("v_separation", int(sep))
	return g

static func spacer(h: float = 0.0, w: float = 0.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if h <= 0.0 and w <= 0.0:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return c

static func hfill() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c

static func rule(col: Color = Pal.LINE_SOFT) -> Control:
	var c := ColorRect.new()
	c.color = col
	c.custom_minimum_size = Vector2(0, 2)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c

static func panel(fill: Color = Pal.PANEL, border: Color = Pal.LINE,
		radius: float = Pal.RADIUS) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", Pal.panel_box(fill, border, radius))
	return p

static func card(fill: Color = Pal.PANEL, border: Color = Pal.LINE) -> PanelContainer:
	return panel(fill, border, Pal.RADIUS)

static func button(text: String, cb: Callable, k: int = TapButton.Kind.SECONDARY,
		min_h: float = Pal.TAP_MIN) -> TapButton:
	var b := TapButton.new(text, k, min_h)
	if cb.is_valid():
		b.pressed.connect(cb)
	return b

static func icon_button(icon: String, cb: Callable, sz: float = Pal.TAP_MIN,
		col: Color = Pal.TEXT) -> TapButton:
	var b := TapButton.new("", TapButton.Kind.GHOST, sz)
	b.custom_minimum_size = Vector2(sz, sz)
	var iv := IconView.new(icon, col, sz * 0.5, 4.0)
	iv.set_anchors_preset(Control.PRESET_FULL_RECT)
	iv.offset_left = sz * 0.26
	iv.offset_top = sz * 0.26
	iv.offset_right = -sz * 0.26
	iv.offset_bottom = -sz * 0.26
	b.add_child(iv)
	if cb.is_valid():
		b.pressed.connect(cb)
	return b

## A label pair: dim caption above, bright value below.
static func stat_block(caption: String, value: String, col: Color = Pal.TEXT,
		fs: int = Pal.FS_BODY) -> VBoxContainer:
	var v := vbox(2)
	v.add_child(label(caption.to_upper(), Pal.FS_MICRO, Pal.TEXT_FAINT))
	v.add_child(label(value, fs, col))
	return v

## Row of "icon + amount" for a resource bundle.
static func resource_row(bundle: Dictionary, fs: int = Pal.FS_SMALL,
		icon_size: float = 34.0, dim_when_missing: bool = false) -> HBoxContainer:
	var h := hbox(Pal.GAP_S)
	for k in bundle.keys():
		var res := String(k)
		if not GameData.RESOURCES.has(res):
			continue
		var col := GameData.resource_color(res)
		var item := hbox(6)
		item.add_child(IconView.new(res, col, icon_size, 3.0))
		var txt := GameData.fmt(float(bundle[k]))
		var lc := Pal.TEXT
		if dim_when_missing and ResourceManager.get_amount(res) < int(bundle[k]):
			lc = Pal.BAD
		item.add_child(label(txt, fs, lc))
		h.add_child(item)
	return h

static func chip(text: String, col: Color, fs: int = Pal.FS_MICRO) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := Pal.flat_box(col.lerp(Pal.BG, 0.78), 8.0)
	sb.border_color = col.lerp(Pal.BG, 0.45)
	sb.set_border_width_all(2)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	p.add_theme_stylebox_override("panel", sb)
	p.add_child(label(text.to_upper(), fs, col))
	return p

static func scroll() -> ScrollContainer:
	var s := ScrollContainer.new()
	s.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	s.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	s.size_flags_vertical = Control.SIZE_EXPAND_FILL
	s.follow_focus = true
	var vsb := s.get_v_scroll_bar()
	if vsb:
		vsb.custom_minimum_size = Vector2(6, 0)
	return s

static func margin(l: float, t: float, r: float, b: float) -> MarginContainer:
	var m := MarginContainer.new()
	m.add_theme_constant_override("margin_left", int(l))
	m.add_theme_constant_override("margin_top", int(t))
	m.add_theme_constant_override("margin_right", int(r))
	m.add_theme_constant_override("margin_bottom", int(b))
	return m

static func clear(node: Node) -> void:
	for c in node.get_children():
		node.remove_child(c)
		c.queue_free()

static func full_rect(c: Control) -> Control:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.anchor_right = 1.0
	c.anchor_bottom = 1.0
	c.offset_right = 0
	c.offset_bottom = 0
	return c
