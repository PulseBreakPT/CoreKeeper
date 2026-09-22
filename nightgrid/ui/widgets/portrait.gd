class_name Portrait
extends Control
## Procedural operative art. Every portrait is drawn from primitives seeded by the
## character id, so the game ships no borrowed artwork and no image files at all.

var seed_value: int = 1
var accent: Color = Pal.ACCENT
var rarity_name: String = "Common"
var is_enemy: bool = false
var show_frame: bool = true

const SKINS := ["#d8a887", "#b4794f", "#8a5636", "#5e3a24", "#e6c3a5", "#96633f"]
const CLOTH := ["#2a3340", "#37302c", "#243033", "#332a3a", "#1f2a2a", "#3a2f22"]

func _init(sd: int = 1, col: Color = Pal.ACCENT, rarity: String = "Common", enemy: bool = false) -> void:
	seed_value = sd
	accent = col
	rarity_name = rarity
	is_enemy = enemy
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE

static func for_character(char_id: String) -> Portrait:
	var def := GameData.character(char_id)
	return Portrait.new(int(def.get("seed", 1)),
		GameData.CharactersData.class_color(String(def.get("klass", "Assault"))),
		String(def.get("rarity", "Common")), false)

static func for_unit(u: Dictionary) -> Portrait:
	if bool(u.get("is_enemy", false)) or String(u.get("side", "")) == "enemy":
		return Portrait.new(int(u.get("seed", 1)), u.get("color", Pal.BAD), "Common", true)
	return Portrait.new(int(u.get("seed", 1)), u.get("color", Pal.ACCENT), String(u.get("rarity", "Common")), false)

func _r(n: int) -> float:
	## Cheap deterministic hash, 0..1
	var x := (seed_value * 9301 + n * 49297) % 233280
	return float(x) / 233280.0

func _pick(n: int, arr: Array) -> Variant:
	return arr[int(_r(n) * float(arr.size())) % arr.size()]

func _draw() -> void:
	var s := size
	if s.x <= 2.0 or s.y <= 2.0:
		return

	# Backdrop: dark plate washed with the class colour.
	draw_rect(Rect2(Vector2.ZERO, s), Pal.BG_DEEP, true)
	var steps := 10
	for i in range(steps):
		var t := float(i) / float(steps - 1)
		var c := Pal.BG_DEEP.lerp(accent, 0.05 + 0.24 * (1.0 - t))
		draw_rect(Rect2(Vector2(0, s.y * t), Vector2(s.x, s.y / float(steps) + 1.0)), c, true)
	for i in range(int(s.y / 14.0)):
		draw_line(Vector2(0, float(i) * 14.0), Vector2(s.x, float(i) * 14.0), Color(0, 0, 0, 0.10), 1.0)

	var skin: Color = Color(String(_pick(1, SKINS)))
	var cloth: Color = Color(String(_pick(2, CLOTH)))
	if is_enemy:
		skin = Color("#6a6f76").lerp(accent, 0.18)
		cloth = Color("#1e2127").lerp(accent, 0.20)

	# The bust is laid out from the head radius so it reads the same in a tall
	# card, a wide combat tile or a tiny squad thumbnail.
	var r: float = minf(s.x * 0.21, s.y * 0.23)
	var gear := int(_r(3) * 5.0)
	if is_enemy and gear == 2:
		gear = 3
	var hat_extra: float = r * (0.55 if gear == 0 or gear == 1 or gear == 3 else 0.28)
	var cy: float = maxf(s.y * 0.42, r + hat_extra + s.y * 0.06)
	var cx: float = s.x * 0.5
	var head := Vector2(cx, cy)
	var shoulder_y: float = cy + r * 1.30

	# Shoulders / torso. The half-width is clamped so a wide, short tile never
	# lets the body spill outside its own frame.
	var half: float = minf(r * 3.0, s.x * 0.48)
	var shoulder_half: float = minf(r * 1.95, half * 0.78)
	var torso := PackedVector2Array([
		Vector2(cx - half, s.y + 4.0),
		Vector2(cx - shoulder_half, shoulder_y + r * 0.42),
		Vector2(cx - r * 0.92, shoulder_y),
		Vector2(cx + r * 0.92, shoulder_y),
		Vector2(cx + shoulder_half, shoulder_y + r * 0.42),
		Vector2(cx + half, s.y + 4.0),
	])
	draw_colored_polygon(torso, cloth)
	draw_polyline(torso, cloth.lerp(Color.BLACK, 0.4), 3.0)
	draw_line(Vector2(cx - r * 0.92, shoulder_y + 2.0), Vector2(cx + r * 0.92, shoulder_y + 2.0),
		accent.lerp(Color.BLACK, 0.25), maxf(r * 0.16, 3.0))
	draw_line(Vector2(cx - shoulder_half * 0.6, shoulder_y + r * 0.5),
		Vector2(cx + shoulder_half * 0.85, s.y), cloth.lerp(Color.BLACK, 0.5), maxf(r * 0.22, 4.0))

	# Neck
	draw_rect(Rect2(Vector2(cx - r * 0.34, cy + r * 0.5), Vector2(r * 0.68, r * 0.9)),
		skin.lerp(Color.BLACK, 0.3), true)
	# Head
	draw_circle(head, r, skin)
	draw_rect(Rect2(Vector2(cx - r * 0.82, cy), Vector2(r * 1.64, r * 0.82)), skin, true)
	draw_arc(head, r, 0, TAU, 30, skin.lerp(Color.BLACK, 0.4), 2.5)

	var eye_y: float = cy - r * 0.08
	match gear:
		0:  # peaked cap
			draw_colored_polygon(PackedVector2Array([
				Vector2(cx - r * 1.05, cy - r * 0.42), Vector2(cx + r * 1.05, cy - r * 0.42),
				Vector2(cx + r * 0.92, cy - r * 1.05), Vector2(cx - r * 0.92, cy - r * 1.05)]),
				cloth.lerp(Color.BLACK, 0.2))
			draw_rect(Rect2(Vector2(cx - r * 1.25, cy - r * 0.48), Vector2(r * 2.5, r * 0.16)),
				Color(0, 0, 0, 0.72), true)
		1:  # hood
			draw_colored_polygon(PackedVector2Array([
				Vector2(cx - r * 1.32, shoulder_y), Vector2(cx - r * 1.18, cy - r * 0.95),
				Vector2(cx, cy - r * 1.45), Vector2(cx + r * 1.18, cy - r * 0.95),
				Vector2(cx + r * 1.32, shoulder_y), Vector2(cx + r * 0.80, cy + r * 0.05),
				Vector2(cx - r * 0.80, cy + r * 0.05)]), cloth)
		2:  # cropped hair
			draw_colored_polygon(PackedVector2Array([
				Vector2(cx - r * 1.0, cy - r * 0.30), Vector2(cx - r * 0.90, cy - r * 0.92),
				Vector2(cx, cy - r * 1.14), Vector2(cx + r * 0.90, cy - r * 0.92),
				Vector2(cx + r * 1.0, cy - r * 0.30), Vector2(cx + r * 0.55, cy - r * 0.62),
				Vector2(cx - r * 0.55, cy - r * 0.62)]), Color("#22242a").lerp(accent, 0.12))
		3:  # helmet with a visor
			draw_colored_polygon(PackedVector2Array([
				Vector2(cx - r * 1.08, cy + r * 0.10), Vector2(cx - r * 1.02, cy - r * 0.86),
				Vector2(cx, cy - r * 1.28), Vector2(cx + r * 1.02, cy - r * 0.86),
				Vector2(cx + r * 1.08, cy + r * 0.10)]), cloth.lerp(Color.BLACK, 0.3))
			draw_rect(Rect2(Vector2(cx - r * 1.02, cy - r * 0.30), Vector2(r * 2.04, r * 0.34)),
				accent.lerp(Color.BLACK, 0.45), true)
			eye_y = -1.0
		_:  # bare, with a headband
			draw_rect(Rect2(Vector2(cx - r * 0.98, cy - r * 0.62), Vector2(r * 1.96, r * 0.22)),
				accent.lerp(Color.BLACK, 0.3), true)

	if eye_y > 0.0:
		var visor := _r(4) > 0.55
		if visor:
			draw_rect(Rect2(Vector2(cx - r * 0.86, eye_y - r * 0.17), Vector2(r * 1.72, r * 0.34)),
				accent.lerp(Pal.BG_DEEP, 0.35), true)
			draw_rect(Rect2(Vector2(cx - r * 0.86, eye_y - r * 0.17), Vector2(r * 1.72, r * 0.34)),
				Color(0, 0, 0, 0.6), false, 2.0)
		else:
			var eye_col := Color("#10131a")
			draw_rect(Rect2(Vector2(cx - r * 0.56, eye_y - r * 0.09), Vector2(r * 0.30, r * 0.17)), eye_col, true)
			draw_rect(Rect2(Vector2(cx + r * 0.26, eye_y - r * 0.09), Vector2(r * 0.30, r * 0.17)), eye_col, true)
			draw_line(Vector2(cx - r * 0.62, eye_y - r * 0.34), Vector2(cx - r * 0.20, eye_y - r * 0.42),
				eye_col, maxf(r * 0.08, 2.0))
			draw_line(Vector2(cx + r * 0.20, eye_y - r * 0.42), Vector2(cx + r * 0.62, eye_y - r * 0.34),
				eye_col, maxf(r * 0.08, 2.0))
		draw_line(Vector2(cx - r * 0.28, cy + r * 0.56), Vector2(cx + r * 0.28, cy + r * 0.56),
			skin.lerp(Color.BLACK, 0.5), maxf(r * 0.08, 2.0))
		if _r(5) > 0.68:
			draw_line(Vector2(cx + r * 0.45, cy - r * 0.52), Vector2(cx + r * 0.62, cy + r * 0.28),
				Color(0.8, 0.45, 0.4, 0.7), maxf(r * 0.07, 2.0))

	if is_enemy:
		draw_line(Vector2(cx - r * 0.85, cy + r * 0.12), Vector2(cx + r * 0.85, cy + r * 0.12),
			Color(0, 0, 0, 0.55), maxf(r * 0.12, 3.0))

	if show_frame:
		var rc: Color = Pal.rarity(rarity_name) if not is_enemy else Pal.BAD
		draw_rect(Rect2(Vector2.ZERO, s), rc.lerp(Pal.BG, 0.25), false, 3.0)
