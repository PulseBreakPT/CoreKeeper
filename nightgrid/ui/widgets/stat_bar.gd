class_name StatBar
extends Control
## Horizontal meter with an optional ghost segment (used for shields and buffers).

@export var value: float = 0.5:
	set(v):
		value = clampf(v, 0.0, 1.0)
		queue_redraw()
@export var ghost: float = 0.0:
	set(v):
		ghost = clampf(v, 0.0, 1.0)
		queue_redraw()
@export var fill_color: Color = Pal.ACCENT:
	set(v):
		fill_color = v
		queue_redraw()
@export var track_color: Color = Pal.PANEL_SOFT:
	set(v):
		track_color = v
		queue_redraw()
@export var ghost_color: Color = Color(1, 1, 1, 0.35):
	set(v):
		ghost_color = v
		queue_redraw()

func _init(h: float = 16.0, fill: Color = Pal.ACCENT) -> void:
	custom_minimum_size = Vector2(0, h)
	fill_color = fill
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), track_color, true)
	if ghost > 0.0:
		draw_rect(Rect2(Vector2.ZERO, Vector2(size.x * ghost, size.y)), ghost_color, true)
	if value > 0.0:
		draw_rect(Rect2(Vector2.ZERO, Vector2(size.x * value, size.y)), fill_color, true)
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.35), false, 2.0)
