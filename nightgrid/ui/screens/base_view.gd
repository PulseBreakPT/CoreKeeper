class_name BaseView
extends Control
## The compound itself: four stacked zones the player scrolls through, with every
## structure drawn from primitives and tappable in place.

signal building_tapped(building_id: String)

const ROW_H := 306.0
const ZONE_HEAD := 74.0
const ZONE_PAD := 36.0
const TOP_PAD := 30.0
const BOTTOM_PAD := 300.0   ## room for the floating collect bar

var _slots: Dictionary = {}   ## building_id -> Rect2 (in local space)
var _buttons: Dictionary = {}
var _plates: Dictionary = {}
var _pulse := 0.0

var _zone_top: Array = []
var _zone_height: Array = []

func _init() -> void:
	_measure_zones()
	mouse_filter = Control.MOUSE_FILTER_PASS
	size_flags_horizontal = Control.SIZE_EXPAND_FILL

## Zones grow to fit whatever they hold, so nothing ever overlaps the band below.
func _measure_zones() -> void:
	_zone_top = []
	_zone_height = []
	var y := TOP_PAD
	for zone in range(4):
		var n := _zone_members(zone).size()
		var rows := int(ceil(float(n) / 2.0))
		var h := ZONE_HEAD + float(maxi(rows, 1)) * ROW_H + ZONE_PAD
		_zone_top.append(y)
		_zone_height.append(h)
		y += h
	custom_minimum_size = Vector2(0, y + BOTTOM_PAD)

func _ready() -> void:
	_build_children()
	resized.connect(_relayout)
	set_process(true)

func _zone_members(zone: int) -> Array:
	var out: Array = []
	for id in GameData.BuildingsData.order():
		if int(GameData.building(String(id)).get("zone", 0)) == zone:
			out.append(String(id))
	return out

func _build_children() -> void:
	for id in GameData.BuildingsData.order():
		var bid := String(id)
		var btn := Button.new()
		btn.flat = true
		btn.focus_mode = Control.FOCUS_NONE
		btn.mouse_filter = Control.MOUSE_FILTER_STOP
		btn.pressed.connect(func(): building_tapped.emit(bid))
		add_child(btn)
		_buttons[bid] = btn

		var plate := PanelContainer.new()
		var sb := Pal.panel_box(Pal.PANEL_SOFT.lerp(Pal.BG_DEEP, 0.3), Pal.LINE, 10.0, 2)
		sb.content_margin_left = 14
		sb.content_margin_right = 14
		sb.content_margin_top = 8
		sb.content_margin_bottom = 8
		plate.add_theme_stylebox_override("panel", sb)
		plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var col := UI.vbox(2)
		var name_l := UI.label(String(GameData.building(bid)["name"]).to_upper(), Pal.FS_MICRO,
			Pal.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
		var status_l := UI.label("", Pal.FS_MICRO, Pal.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER)
		col.add_child(name_l)
		col.add_child(status_l)
		plate.add_child(col)
		add_child(plate)
		_plates[bid] = {"panel": plate, "name": name_l, "status": status_l}
	_relayout()

func _relayout() -> void:
	var w := size.x
	if w <= 10.0:
		return
	_slots.clear()
	for zone in range(4):
		var members := _zone_members(zone)
		var zone_top: float = _zone_top[zone]
		var cols := mini(members.size(), 2)
		if cols <= 0:
			continue
		var cell_w := w / float(cols)
		for i in range(members.size()):
			var cx := i % cols
			var cy := int(i / cols)
			var bw := minf(cell_w * 0.66, 340.0)
			var bh := 220.0
			var x := cell_w * (float(cx) + 0.5) - bw * 0.5
			var y := zone_top + ZONE_HEAD + 26.0 + float(cy) * ROW_H
			_slots[members[i]] = Rect2(Vector2(x, y), Vector2(bw, bh))
	for bid in _slots.keys():
		var r: Rect2 = _slots[bid]
		var btn: Button = _buttons[bid]
		btn.position = r.position - Vector2(10, 10)
		btn.size = r.size + Vector2(20, 96)
		var plate: PanelContainer = _plates[bid]["panel"]
		plate.size = Vector2(r.size.x + 20.0, 0)
		plate.position = Vector2(r.position.x - 10.0, r.position.y + r.size.y + 6.0)
	queue_redraw()

var _status_tick := 0.0
var _paint_tick := 0.0

func _process(delta: float) -> void:
	_pulse = fmod(_pulse + delta * 2.2, TAU)
	# The pulse needs a repaint; the twenty status labels do not. And a slow
	# glow reads the same at twenty repaints a second as at sixty.
	_status_tick += delta
	if _status_tick >= 0.3:
		_status_tick = 0.0
		refresh_status()
	_paint_tick += delta
	if _paint_tick >= 0.05:
		_paint_tick = 0.0
		queue_redraw()

func refresh_status() -> void:
	for bid in _plates.keys():
		var id := String(bid)
		var st: Dictionary = _plates[id]
		var lvl := BuildingManager.level_of(id)
		var status: Label = st["status"]
		var name_l: Label = st["name"]
		if lvl <= 0:
			name_l.add_theme_color_override("font_color", Pal.TEXT_FAINT)
			status.text = "NOT BUILT"
			status.add_theme_color_override("font_color", Pal.TEXT_FAINT)
		elif BuildingManager.is_constructing(id):
			name_l.add_theme_color_override("font_color", Pal.TEXT)
			status.text = "BUILDING  " + GameData.fmt_time(BuildingManager.construction_remaining(id))
			status.add_theme_color_override("font_color", Pal.CYAN)
		else:
			name_l.add_theme_color_override("font_color", Pal.TEXT)
			var pend := BuildingManager.pending_total(id)
			if pend > 0:
				status.text = "LV %d  ·  %s READY" % [lvl, GameData.fmt(float(pend))]
				status.add_theme_color_override("font_color", Pal.GOOD)
			elif BuildingManager.can_start_upgrade(id):
				status.text = "LV %d  ·  UPGRADE READY" % lvl
				status.add_theme_color_override("font_color", Pal.ACCENT)
			else:
				status.text = "LV %d" % lvl
				status.add_theme_color_override("font_color", Pal.TEXT_DIM)

# ---- Painting -----------------------------------------------------------

func _draw() -> void:
	var w := size.x
	if w <= 10.0:
		return
	var zone_names: Array = GameData.BuildingsData.zone_names()
	var tints := [Color("#1a2330"), Color("#1d2028"), Color("#231d18"), Color("#18241f")]
	for zone in range(4):
		var top: float = _zone_top[zone]
		var zh: float = _zone_height[zone]
		var r := Rect2(Vector2(0, top), Vector2(w, zh - 14.0))
		draw_rect(r, (tints[zone] as Color).lerp(Pal.BG, 0.35), true)
		# ground texture
		var yy := top + 60.0
		while yy < top + zh - 20.0:
			draw_line(Vector2(0, yy), Vector2(w, yy), Color(1, 1, 1, 0.018), 2.0)
			yy += 44.0
		draw_rect(r, Pal.LINE_SOFT, false, 2.0)
		# zone label bar
		draw_rect(Rect2(Vector2(0, top), Vector2(w, ZONE_HEAD - 10.0)), Pal.BG_DEEP.lerp(Pal.PANEL, 0.5), true)
		draw_rect(Rect2(Vector2(0, top), Vector2(8.0, ZONE_HEAD - 10.0)), Pal.ACCENT, true)
		var font := ThemeDB.fallback_font
		draw_string(font, Vector2(28, top + 46), String(zone_names[zone]),
			HORIZONTAL_ALIGNMENT_LEFT, -1, Pal.FS_LABEL, Pal.TEXT_DIM)

	for bid in _slots.keys():
		_draw_structure(String(bid), _slots[bid])

func _draw_structure(bid: String, r: Rect2) -> void:
	var def := GameData.building(bid)
	var lvl := BuildingManager.level_of(bid)
	var built := lvl > 0
	var cat := String(def.get("category", "production"))
	var accent := _category_color(cat)
	var body := Color("#1e2731").lerp(accent, 0.07) if built else Pal.PANEL_SOFT
	if not built:
		accent = Pal.LINE

	var o := r.position
	var s := r.size
	# ground shadow
	draw_rect(Rect2(o + Vector2(-6, s.y - 10), Vector2(s.x + 12, 22)), Color(0, 0, 0, 0.35), true)

	match bid:
		"headquarters":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.30), Vector2(s.x, s.y * 0.70)), body, true)
			draw_colored_polygon(PackedVector2Array([
				o + Vector2(-6, s.y * 0.30), o + Vector2(s.x * 0.5, s.y * 0.06),
				o + Vector2(s.x + 6, s.y * 0.30)]), body.lerp(Color.BLACK, 0.3))
			_windows(o, s, 3, 5, accent, 0.40, 0.88, lvl, built)
			draw_rect(Rect2(o + Vector2(s.x * 0.47, s.y * 0.0), Vector2(s.x * 0.05, s.y * 0.24)),
				body.lerp(Color.WHITE, 0.08), true)
			draw_circle(o + Vector2(s.x * 0.495, s.y * 0.0), 9.0, Pal.BAD)
		"power_generator":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.42), Vector2(s.x, s.y * 0.58)), body, true)
			for i in range(3):
				var x := s.x * (0.16 + 0.28 * float(i))
				draw_rect(Rect2(o + Vector2(x, s.y * 0.08), Vector2(s.x * 0.12, s.y * 0.36)),
					body.lerp(Color.BLACK, 0.2), true)
				draw_rect(Rect2(o + Vector2(x, s.y * 0.06), Vector2(s.x * 0.12, 8.0)), accent, true)
		"workshop":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.38), Vector2(s.x, s.y * 0.62)), body, true)
			for i in range(4):
				var x2 := s.x * float(i) / 4.0
				draw_colored_polygon(PackedVector2Array([
					o + Vector2(x2, s.y * 0.38), o + Vector2(x2 + s.x * 0.125, s.y * 0.2),
					o + Vector2(x2 + s.x * 0.25, s.y * 0.38)]), body.lerp(Color.BLACK, 0.28))
		"warehouse":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.34), Vector2(s.x, s.y * 0.66)), body, true)
			for i in range(5):
				draw_line(o + Vector2(s.x * (0.08 + 0.21 * float(i)), s.y * 0.40),
					o + Vector2(s.x * (0.08 + 0.21 * float(i)), s.y * 1.0),
					body.lerp(Color.BLACK, 0.35), 4.0)
			draw_colored_polygon(PackedVector2Array([
				o + Vector2(-4, s.y * 0.34), o + Vector2(s.x * 0.5, s.y * 0.12),
				o + Vector2(s.x + 4, s.y * 0.34)]), body.lerp(Color.BLACK, 0.3))
			draw_rect(Rect2(o + Vector2(s.x * 0.3, s.y * 0.55), Vector2(s.x * 0.4, s.y * 0.45)), accent.lerp(Pal.BG, 0.6), true)
		"barracks":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.40), Vector2(s.x, s.y * 0.60)), body, true)
			draw_rect(Rect2(o + Vector2(0, s.y * 0.34), Vector2(s.x, s.y * 0.08)), body.lerp(Color.BLACK, 0.3), true)
			for i in range(4):
				draw_rect(Rect2(o + Vector2(s.x * (0.1 + 0.21 * float(i)), s.y * 0.52),
					Vector2(s.x * 0.12, s.y * 0.16)), accent.lerp(Pal.BG_DEEP, 0.4), true)
		"medical_center":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.30), Vector2(s.x, s.y * 0.70)), body, true)
			_windows(o, s, 2, 5, accent, 0.72, 0.95, lvl, built)
			draw_rect(Rect2(o + Vector2(s.x * 0.42, s.y * 0.40), Vector2(s.x * 0.16, s.y * 0.30)), accent, true)
			draw_rect(Rect2(o + Vector2(s.x * 0.29, s.y * 0.47), Vector2(s.x * 0.42, s.y * 0.16)), accent, true)
		"intel_center":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.44), Vector2(s.x, s.y * 0.56)), body, true)
			draw_arc(o + Vector2(s.x * 0.5, s.y * 0.42), s.x * 0.28, PI, TAU, 24, accent, 7.0)
			draw_line(o + Vector2(s.x * 0.5, s.y * 0.42), o + Vector2(s.x * 0.5, s.y * 0.1), accent, 5.0)
			draw_circle(o + Vector2(s.x * 0.5, s.y * 0.1), 9.0, Pal.CYAN)
		"garage":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.36), Vector2(s.x, s.y * 0.64)), body, true)
			draw_arc(o + Vector2(s.x * 0.5, s.y * 0.38), s.x * 0.5, PI, TAU, 26, body.lerp(Color.BLACK, 0.3), 26.0)
			draw_rect(Rect2(o + Vector2(s.x * 0.16, s.y * 0.60), Vector2(s.x * 0.68, s.y * 0.40)),
				accent.lerp(Pal.BG_DEEP, 0.55), true)
		"training_ground":
			draw_rect(Rect2(o + Vector2(0, s.y * 0.52), Vector2(s.x, s.y * 0.48)), body, true)
			for i in range(3):
				draw_rect(Rect2(o + Vector2(s.x * (0.12 + 0.3 * float(i)), s.y * 0.26),
					Vector2(s.x * 0.16, s.y * 0.26)), body.lerp(Color.BLACK, 0.2), true)
				draw_circle(o + Vector2(s.x * (0.2 + 0.3 * float(i)), s.y * 0.30), 12.0, accent)
		_:  # operations_center and anything new
			draw_rect(Rect2(o + Vector2(0, s.y * 0.20), Vector2(s.x, s.y * 0.80)), body, true)
			for row in range(4):
				for c in range(4):
					var lit := ((int(bid.length()) + row * 3 + c * 5 + lvl) % 3) != 0
					draw_rect(Rect2(o + Vector2(s.x * (0.12 + 0.2 * float(c)), s.y * (0.30 + 0.16 * float(row))),
						Vector2(s.x * 0.12, s.y * 0.09)),
						accent.lerp(Pal.BG_DEEP, 0.2) if (lit and built) else Pal.BG_DEEP, true)

	# Plinth and rim light: a flat block never reads as a building.
	draw_rect(Rect2(o + Vector2(-8, s.y - 6), Vector2(s.x + 16, 10)), accent.lerp(Pal.BG, 0.55), true)
	draw_line(o, o + Vector2(s.x, 0), Color(1, 1, 1, 0.06), 3.0)
	draw_rect(Rect2(o, s), accent.lerp(Pal.BG, 0.45), false, 3.0)

	if not built:
		draw_rect(Rect2(o, s), Color(0, 0, 0, 0.45), true)
		Icons.draw_icon(self, "lock", Rect2(o + s * 0.35, s * 0.3), Pal.TEXT_FAINT, 5.0)
		return

	# level chip
	var chip_r := Rect2(o + Vector2(s.x - 74.0, -18.0), Vector2(74.0, 46.0))
	draw_rect(chip_r, Pal.BG_DEEP, true)
	draw_rect(chip_r, accent, false, 2.0)
	draw_string(ThemeDB.fallback_font, chip_r.position + Vector2(12, 34),
		"L%d" % lvl, HORIZONTAL_ALIGNMENT_LEFT, -1, Pal.FS_MICRO, Pal.TEXT)

	# production readiness
	var ratio := BuildingManager.buffer_fill_ratio(bid)
	if BuildingManager.pending_total(bid) > 0:
		var bar := Rect2(o + Vector2(0, s.y - 16.0), Vector2(s.x, 10.0))
		draw_rect(bar, Pal.BG_DEEP, true)
		draw_rect(Rect2(bar.position, Vector2(bar.size.x * ratio, bar.size.y)),
			Pal.GOOD if ratio < 0.99 else Pal.WARN, true)
		if ratio > 0.25:
			var a := 0.55 + 0.45 * sin(_pulse)
			var mark := Rect2(o + Vector2(s.x * 0.5 - 26.0, -66.0), Vector2(52.0, 52.0))
			draw_circle(mark.get_center(), 26.0, Color(Pal.GOOD.r, Pal.GOOD.g, Pal.GOOD.b, 0.22 * a))
			Icons.draw_icon(self, "crate", mark, Color(Pal.GOOD.r, Pal.GOOD.g, Pal.GOOD.b, a), 4.0)
	if BuildingManager.is_constructing(bid):
		var d := BuildingManager.construction_remaining(bid)
		var total := maxf(float(BuildingManager.state[bid]["build"]["dur"]), 0.001)
		var p := clampf(1.0 - d / total, 0.0, 1.0)
		var cb := Rect2(o + Vector2(0, s.y - 16.0), Vector2(s.x, 10.0))
		draw_rect(cb, Pal.BG_DEEP, true)
		draw_rect(Rect2(cb.position, Vector2(cb.size.x * p, cb.size.y)), Pal.CYAN, true)

## Lit window grid. Deterministic per building so it never flickers.
func _windows(o: Vector2, s: Vector2, rows: int, cols: int, accent: Color,
		top: float, bottom: float, lvl: int, built: bool) -> void:
	if not built:
		return
	var h := (bottom - top) / float(rows)
	for r in range(rows):
		for c in range(cols):
			var lit := ((r * 7 + c * 5 + lvl * 3) % 4) != 0
			var w := s.x * 0.70 / float(cols)
			var x := s.x * 0.15 + w * float(c)
			var y := s.y * (top + h * float(r))
			draw_rect(Rect2(o + Vector2(x + w * 0.16, y), Vector2(w * 0.68, s.y * h * 0.52)),
				accent.lerp(Pal.BG_DEEP, 0.30) if lit else Pal.BG_DEEP, true)

func _category_color(cat: String) -> Color:
	match cat:
		"command": return Pal.ACCENT
		"production": return Pal.GOOD
		"personnel": return Pal.CYAN
		_: return Pal.WARN
