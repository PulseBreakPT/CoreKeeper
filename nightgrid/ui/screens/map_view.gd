class_name MapView
extends Control
## Pan, pinch-zoom and tap over the region map. One finger drags, two pinch,
## a tap that did not travel selects whatever is under it.

signal target_picked(kind: String, target_id: String)

var world: MapWorld
var zoom: float = 1.0
var min_zoom: float = 0.4
var max_zoom: float = 2.2

var _touches: Dictionary = {}
var _start_positions: Dictionary = {}
var _pinch_start_dist := 0.0
var _pinch_start_zoom := 1.0
var _pinch_anchor := Vector2.ZERO
var _moved := 0.0
var _press_time := 0.0
var _initialised := false

func _init() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	world = MapWorld.new()
	add_child(world)

func _ready() -> void:
	resized.connect(_on_resized)
	call_deferred("_on_resized")

func _on_resized() -> void:
	if size.x <= 10.0:
		return
	var fit := size.x / GameData.RegionsData.MAP_W
	min_zoom = fit * 0.92
	max_zoom = maxf(fit * 3.2, 2.0)
	if not _initialised:
		_initialised = true
		zoom = clampf(fit * 1.25, min_zoom, max_zoom)
		center_on(MapManager.entry_point(world.region_id), false)
	zoom = clampf(zoom, min_zoom, max_zoom)
	_apply()

func set_region(rid: String) -> void:
	world.set_region(rid)
	center_on(MapManager.entry_point(rid), false)

func center_on(world_pos: Vector2, animate: bool = true) -> void:
	var target := size * 0.5 - world_pos * zoom
	if animate:
		var tw := create_tween()
		tw.tween_method(func(v: Vector2):
			world.position = v
			_clamp_offset(), world.position, target, 0.3).set_trans(Tween.TRANS_CUBIC)
	else:
		world.position = target
	_clamp_offset()
	_apply()

func _apply() -> void:
	world.scale = Vector2(zoom, zoom)
	_clamp_offset()
	queue_redraw()

func _clamp_offset() -> void:
	var ww := GameData.RegionsData.MAP_W * zoom
	var wh := GameData.RegionsData.MAP_H * zoom
	var p := world.position
	if ww <= size.x:
		p.x = (size.x - ww) * 0.5
	else:
		p.x = clampf(p.x, size.x - ww, 0.0)
	if wh <= size.y:
		p.y = (size.y - wh) * 0.5
	else:
		p.y = clampf(p.y, size.y - wh, 0.0)
	world.position = p

func to_world(screen_pos: Vector2) -> Vector2:
	return (screen_pos - world.position) / zoom

func _set_zoom(z: float, anchor: Vector2) -> void:
	var before := to_world(anchor)
	zoom = clampf(z, min_zoom, max_zoom)
	world.scale = Vector2(zoom, zoom)
	world.position = anchor - before * zoom
	_clamp_offset()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			_touches[t.index] = t.position
			_start_positions[t.index] = t.position
			if _touches.size() == 1:
				_moved = 0.0
				_press_time = Time.get_ticks_msec() / 1000.0
			elif _touches.size() == 2:
				var keys := _touches.keys()
				var a: Vector2 = _touches[keys[0]]
				var b: Vector2 = _touches[keys[1]]
				_pinch_start_dist = maxf(a.distance_to(b), 1.0)
				_pinch_start_zoom = zoom
				_pinch_anchor = (a + b) * 0.5
		else:
			var was_single := _touches.size() == 1
			_touches.erase(t.index)
			_start_positions.erase(t.index)
			if was_single and _moved < 26.0 and (Time.get_ticks_msec() / 1000.0) - _press_time < 0.7:
				_tap(t.position)
		accept_event()
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		_touches[d.index] = d.position
		if _touches.size() >= 2:
			var keys2 := _touches.keys()
			var a2: Vector2 = _touches[keys2[0]]
			var b2: Vector2 = _touches[keys2[1]]
			var dist := maxf(a2.distance_to(b2), 1.0)
			_set_zoom(_pinch_start_zoom * (dist / _pinch_start_dist), _pinch_anchor)
		else:
			_moved += d.relative.length()
			world.position += d.relative
			_clamp_offset()
		accept_event()
	elif event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.button_index == MOUSE_BUTTON_WHEEL_UP and m.pressed:
			_set_zoom(zoom * 1.12, m.position)
			accept_event()
		elif m.button_index == MOUSE_BUTTON_WHEEL_DOWN and m.pressed:
			_set_zoom(zoom / 1.12, m.position)
			accept_event()

func _tap(screen_pos: Vector2) -> void:
	var hit := world.pick(to_world(screen_pos))
	if hit.is_empty():
		return
	target_picked.emit(String(hit["kind"]), String(hit["id"]))

func zoom_by(f: float) -> void:
	_set_zoom(zoom * f, size * 0.5)
