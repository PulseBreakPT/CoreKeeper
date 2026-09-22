class_name GameScreen
extends Control
## Base for the five main tabs. Screens build themselves once and refresh on show.

var built := false

func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	anchor_right = 1.0
	anchor_bottom = 1.0
	visible = false

func build() -> void:
	pass

func refresh() -> void:
	pass

func on_shown() -> void:
	if not built:
		built = true
		build()
	refresh()

## Screens that own their own inner navigation (map, mission tabs) can consume
## the Android back press before the shell does.
func handle_back() -> bool:
	return false
