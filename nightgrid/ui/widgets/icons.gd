class_name Icons
extends RefCounted
## Vector icon drawing. No image assets anywhere in the project — every glyph is
## drawn from primitives so the build stays tiny and nothing is borrowed.

static func draw_icon(c: CanvasItem, name: String, rect: Rect2, col: Color, w: float = 4.0) -> void:
	var o := rect.position
	var s := rect.size
	match name:
		"base":
			c.draw_rect(Rect2(o + s * Vector2(0.12, 0.42), s * Vector2(0.76, 0.46)), col, false, w)
			c.draw_line(o + s * Vector2(0.12, 0.42), o + s * Vector2(0.5, 0.14), col, w)
			c.draw_line(o + s * Vector2(0.88, 0.42), o + s * Vector2(0.5, 0.14), col, w)
			c.draw_rect(Rect2(o + s * Vector2(0.42, 0.6), s * Vector2(0.16, 0.28)), col, true)
		"map":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.12, 0.26), o + s * Vector2(0.38, 0.14),
				o + s * Vector2(0.62, 0.3), o + s * Vector2(0.88, 0.16),
				o + s * Vector2(0.88, 0.76), o + s * Vector2(0.62, 0.9),
				o + s * Vector2(0.38, 0.74), o + s * Vector2(0.12, 0.88),
			]), col, w)
			c.draw_line(o + s * Vector2(0.12, 0.88), o + s * Vector2(0.12, 0.26), col, w)
			c.draw_line(o + s * Vector2(0.38, 0.14), o + s * Vector2(0.38, 0.74), col, w * 0.7)
			c.draw_line(o + s * Vector2(0.62, 0.3), o + s * Vector2(0.62, 0.9), col, w * 0.7)
		"operatives":
			c.draw_arc(o + s * Vector2(0.38, 0.33), s.x * 0.15, 0, TAU, 20, col, w)
			c.draw_arc(o + s * Vector2(0.38, 0.86), s.x * 0.3, PI, TAU, 22, col, w)
			c.draw_arc(o + s * Vector2(0.68, 0.36), s.x * 0.12, 0, TAU, 18, col, w * 0.8)
			c.draw_arc(o + s * Vector2(0.7, 0.86), s.x * 0.26, PI * 1.15, TAU * 0.98, 18, col, w * 0.8)
		"missions":
			c.draw_rect(Rect2(o + s * Vector2(0.2, 0.12), s * Vector2(0.6, 0.76)), col, false, w)
			for i in range(3):
				var y := 0.32 + 0.18 * float(i)
				c.draw_line(o + s * Vector2(0.32, y), o + s * Vector2(0.68, y), col, w * 0.8)
		"inventory":
			c.draw_rect(Rect2(o + s * Vector2(0.14, 0.34), s * Vector2(0.72, 0.54)), col, false, w)
			c.draw_arc(o + s * Vector2(0.5, 0.36), s.x * 0.2, PI, TAU, 18, col, w)
			c.draw_line(o + s * Vector2(0.14, 0.52), o + s * Vector2(0.86, 0.52), col, w * 0.7)
		"cash":
			c.draw_arc(o + s * 0.5, s.x * 0.34, 0, TAU, 26, col, w)
			c.draw_line(o + s * Vector2(0.5, 0.2), o + s * Vector2(0.5, 0.8), col, w * 0.8)
			c.draw_arc(o + s * Vector2(0.5, 0.38), s.x * 0.14, PI * 0.8, TAU * 0.95, 14, col, w * 0.8)
		"materials":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.5, 0.14), o + s * Vector2(0.86, 0.35),
				o + s * Vector2(0.86, 0.7), o + s * Vector2(0.5, 0.9),
				o + s * Vector2(0.14, 0.7), o + s * Vector2(0.14, 0.35),
				o + s * Vector2(0.5, 0.14)]), col, w)
			c.draw_line(o + s * Vector2(0.14, 0.35), o + s * Vector2(0.5, 0.54), col, w * 0.7)
			c.draw_line(o + s * Vector2(0.86, 0.35), o + s * Vector2(0.5, 0.54), col, w * 0.7)
			c.draw_line(o + s * Vector2(0.5, 0.9), o + s * Vector2(0.5, 0.54), col, w * 0.7)
		"fuel":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.5, 0.1), o + s * Vector2(0.78, 0.45),
				o + s * Vector2(0.72, 0.78), o + s * Vector2(0.5, 0.92),
				o + s * Vector2(0.28, 0.78), o + s * Vector2(0.22, 0.45),
				o + s * Vector2(0.5, 0.1)]), col, w)
			c.draw_arc(o + s * Vector2(0.5, 0.66), s.x * 0.13, 0, TAU, 16, col, w * 0.8)
		"intel":
			c.draw_arc(o + s * 0.5, s.x * 0.36, 0, TAU, 28, col, w)
			c.draw_arc(o + s * 0.5, s.x * 0.16, 0, TAU, 18, col, w)
			c.draw_line(o + s * Vector2(0.14, 0.5), o + s * Vector2(0.86, 0.5), col, w * 0.6)
			c.draw_line(o + s * Vector2(0.5, 0.14), o + s * Vector2(0.5, 0.86), col, w * 0.6)
		"supplies":
			c.draw_rect(Rect2(o + s * Vector2(0.16, 0.26), s * Vector2(0.68, 0.6)), col, false, w)
			c.draw_line(o + s * Vector2(0.16, 0.44), o + s * Vector2(0.84, 0.44), col, w * 0.7)
			c.draw_line(o + s * Vector2(0.5, 0.26), o + s * Vector2(0.5, 0.86), col, w * 0.7)
		"tokens":
			c.draw_arc(o + s * 0.5, s.x * 0.34, 0, TAU, 6, col, w)
			c.draw_arc(o + s * 0.5, s.x * 0.16, 0, TAU, 6, col, w * 0.8)
		"energy":
			c.draw_colored_polygon(PackedVector2Array([
				o + s * Vector2(0.56, 0.08), o + s * Vector2(0.3, 0.52),
				o + s * Vector2(0.48, 0.52), o + s * Vector2(0.42, 0.92),
				o + s * Vector2(0.72, 0.44), o + s * Vector2(0.53, 0.44)]), col)
		"power":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.5, 0.08), o + s * Vector2(0.84, 0.28),
				o + s * Vector2(0.84, 0.62), o + s * Vector2(0.5, 0.92),
				o + s * Vector2(0.16, 0.62), o + s * Vector2(0.16, 0.28),
				o + s * Vector2(0.5, 0.08)]), col, w)
			c.draw_colored_polygon(PackedVector2Array([
				o + s * Vector2(0.5, 0.3), o + s * Vector2(0.66, 0.46),
				o + s * Vector2(0.5, 0.72), o + s * Vector2(0.34, 0.46)]), col)
		"clock":
			c.draw_arc(o + s * 0.5, s.x * 0.36, 0, TAU, 26, col, w)
			c.draw_line(o + s * 0.5, o + s * Vector2(0.5, 0.24), col, w * 0.8)
			c.draw_line(o + s * 0.5, o + s * Vector2(0.72, 0.56), col, w * 0.8)
		"check":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.2, 0.52), o + s * Vector2(0.42, 0.74),
				o + s * Vector2(0.8, 0.26)]), col, w * 1.3)
		"lock":
			c.draw_rect(Rect2(o + s * Vector2(0.24, 0.46), s * Vector2(0.52, 0.42)), col, false, w)
			c.draw_arc(o + s * Vector2(0.5, 0.46), s.x * 0.18, PI, TAU, 18, col, w)
		"close":
			c.draw_line(o + s * Vector2(0.26, 0.26), o + s * Vector2(0.74, 0.74), col, w * 1.2)
			c.draw_line(o + s * Vector2(0.74, 0.26), o + s * Vector2(0.26, 0.74), col, w * 1.2)
		"chevron_up":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.24, 0.62), o + s * Vector2(0.5, 0.36),
				o + s * Vector2(0.76, 0.62)]), col, w * 1.2)
		"plus":
			c.draw_line(o + s * Vector2(0.5, 0.22), o + s * Vector2(0.5, 0.78), col, w * 1.2)
			c.draw_line(o + s * Vector2(0.22, 0.5), o + s * Vector2(0.78, 0.5), col, w * 1.2)
		"skull":
			c.draw_arc(o + s * Vector2(0.5, 0.44), s.x * 0.3, PI, TAU, 22, col, w)
			c.draw_rect(Rect2(o + s * Vector2(0.34, 0.44), s * Vector2(0.32, 0.3)), col, false, w)
			c.draw_circle(o + s * Vector2(0.4, 0.46), s.x * 0.07, col)
			c.draw_circle(o + s * Vector2(0.6, 0.46), s.x * 0.07, col)
		"crate":
			c.draw_rect(Rect2(o + s * Vector2(0.16, 0.24), s * Vector2(0.68, 0.62)), col, false, w)
			c.draw_line(o + s * Vector2(0.16, 0.24), o + s * Vector2(0.84, 0.86), col, w * 0.6)
			c.draw_line(o + s * Vector2(0.84, 0.24), o + s * Vector2(0.16, 0.86), col, w * 0.6)
		"target":
			c.draw_arc(o + s * 0.5, s.x * 0.34, 0, TAU, 24, col, w)
			c.draw_circle(o + s * 0.5, s.x * 0.1, col)
			c.draw_line(o + s * Vector2(0.5, 0.02), o + s * Vector2(0.5, 0.2), col, w)
			c.draw_line(o + s * Vector2(0.5, 0.8), o + s * Vector2(0.5, 0.98), col, w)
			c.draw_line(o + s * Vector2(0.02, 0.5), o + s * Vector2(0.2, 0.5), col, w)
			c.draw_line(o + s * Vector2(0.8, 0.5), o + s * Vector2(0.98, 0.5), col, w)
		"weapon":
			c.draw_line(o + s * Vector2(0.14, 0.7), o + s * Vector2(0.8, 0.3), col, w * 1.4)
			c.draw_line(o + s * Vector2(0.6, 0.28), o + s * Vector2(0.72, 0.52), col, w)
			c.draw_line(o + s * Vector2(0.14, 0.7), o + s * Vector2(0.28, 0.84), col, w)
		"armor":
			c.draw_polyline(PackedVector2Array([
				o + s * Vector2(0.5, 0.12), o + s * Vector2(0.84, 0.28),
				o + s * Vector2(0.78, 0.7), o + s * Vector2(0.5, 0.9),
				o + s * Vector2(0.22, 0.7), o + s * Vector2(0.16, 0.28),
				o + s * Vector2(0.5, 0.12)]), col, w)
		"accessory":
			c.draw_arc(o + s * Vector2(0.5, 0.56), s.x * 0.26, 0, TAU, 22, col, w)
			c.draw_line(o + s * Vector2(0.34, 0.28), o + s * Vector2(0.66, 0.28), col, w)
			c.draw_line(o + s * Vector2(0.5, 0.28), o + s * Vector2(0.5, 0.3), col, w)
		"dev":
			c.draw_arc(o + s * 0.5, s.x * 0.22, 0, TAU, 20, col, w)
			for i in range(6):
				var a := TAU * float(i) / 6.0
				c.draw_line(o + s * 0.5 + Vector2(cos(a), sin(a)) * s.x * 0.24,
					o + s * 0.5 + Vector2(cos(a), sin(a)) * s.x * 0.42, col, w)
		_:
			c.draw_arc(o + s * 0.5, s.x * 0.3, 0, TAU, 20, col, w)

static func resource_icon(res: String) -> String:
	return res
