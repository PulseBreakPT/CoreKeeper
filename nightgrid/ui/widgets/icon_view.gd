class_name IconView
extends Control
## Draws one vector glyph from the Icons library, sized to the control.

@export var icon_name: String = "target":
	set(v):
		icon_name = v
		queue_redraw()
@export var color: Color = Pal.TEXT:
	set(v):
		color = v
		queue_redraw()
@export var thickness: float = 4.0:
	set(v):
		thickness = v
		queue_redraw()

func _init(n: String = "target", c: Color = Pal.TEXT, sz: float = 44.0, w: float = 4.0) -> void:
	icon_name = n
	color = c
	thickness = w
	custom_minimum_size = Vector2(sz, sz)
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _draw() -> void:
	Icons.draw_icon(self, icon_name, Rect2(Vector2.ZERO, size), color, thickness)
