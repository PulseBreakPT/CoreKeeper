class_name MapWorld
extends Node2D
## Everything painted inside the map, split across two layers:
##
##  * a static layer — terrain, roads, fog and the discovered markers with their
##    labels — repainted only when the world actually changes;
##  * a live layer — the insertion beacon, routes, event countdowns and the
##    squads in transit — repainted twenty times a second.
##
## Text shaping is the expensive part of a map like this, and all of it lives in
## the static layer, so panning and zooming stay cheap.

const LIVE_HZ := 20.0

var region_id: String = "harbour_reach"

var _static_layer: Node2D
var _live_layer: Node2D
var _t := 0.0
var _live_tick := 0.0
var _font: Font

func _init() -> void:
	_font = ThemeDB.fallback_font
	_static_layer = Node2D.new()
	_static_layer.draw.connect(_draw_static)
	add_child(_static_layer)
	_live_layer = Node2D.new()
	_live_layer.draw.connect(_draw_live)
	add_child(_live_layer)

func _ready() -> void:
	set_process(true)
	MapManager.fog_changed.connect(func(_r): invalidate())
	MapManager.location_state_changed.connect(func(_l): invalidate())
	MapManager.region_changed.connect(func(_r): invalidate())

func _process(delta: float) -> void:
	_t += delta
	_live_tick += delta
	if _live_tick >= 1.0 / LIVE_HZ:
		_live_tick = 0.0
		_live_layer.queue_redraw()

func invalidate() -> void:
	_static_layer.queue_redraw()

func set_region(rid: String) -> void:
	region_id = rid
	invalidate()
	_live_layer.queue_redraw()

# ---- Static layer -------------------------------------------------------

func _draw_static() -> void:
	var rd := GameData.region(region_id)
	if rd.is_empty():
		return
	var c := _static_layer
	var pal: Dictionary = rd["palette"]
	var w := GameData.RegionsData.MAP_W
	var h := GameData.RegionsData.MAP_H

	c.draw_rect(Rect2(Vector2.ZERO, Vector2(w, h)), Color(String(pal["ground"])), true)
	var line_col := Color(String(pal["line"]))
	# District blocks, so the terrain reads as a city rather than a void.
	var rng := RandomNumberGenerator.new()
	rng.seed = int(rd["seed"])
	for i in range(46):
		var bw := rng.randf_range(120.0, 340.0)
		var bh := rng.randf_range(90.0, 260.0)
		var bx := rng.randf_range(0.0, w - bw)
		var by := rng.randf_range(0.0, h - bh)
		c.draw_rect(Rect2(Vector2(bx, by), Vector2(bw, bh)),
			Color(String(pal["bg"])).lerp(line_col, rng.randf_range(0.25, 0.75)), true)
	for i in range(1, 7):
		var x := w * float(i) / 7.0
		c.draw_line(Vector2(x, 0), Vector2(x, h), line_col.lerp(Color.BLACK, 0.2), 6.0)
	for j in range(1, 13):
		var y := h * float(j) / 13.0
		c.draw_line(Vector2(0, y), Vector2(w, y), line_col.lerp(Color.BLACK, 0.2), 6.0)
	c.draw_rect(Rect2(Vector2.ZERO, Vector2(w, h)),
		Color(String(pal["accent"])).lerp(Color.BLACK, 0.4), false, 8.0)

	var entry := MapManager.entry_point(region_id)
	c.draw_arc(entry, 54.0, 0, TAU, 28, Pal.ACCENT, 5.0)
	c.draw_string(_font, entry + Vector2(-64, 96), "COMPOUND",
		HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Pal.ACCENT)

	for loc in GameData.locations_in_region(region_id):
		_draw_location(c, loc)

	_draw_fog(c)

func _draw_fog(c: CanvasItem) -> void:
	var cell := GameData.RegionsData.FOG_CELL
	for cy in range(MapManager.rows()):
		for cx in range(MapManager.cols()):
			if MapManager.is_cell_revealed(region_id, cx, cy):
				continue
			var r := Rect2(Vector2(float(cx) * cell, float(cy) * cell), Vector2(cell, cell))
			c.draw_rect(r, Color(0.024, 0.031, 0.043, 0.965), true)
			c.draw_rect(r, Color(1, 1, 1, 0.035), false, 2.0)
			var m := r.get_center()
			c.draw_line(m + Vector2(-16, -16), m + Vector2(16, 16), Color(1, 1, 1, 0.045), 2.0)
			c.draw_line(m + Vector2(16, -16), m + Vector2(-16, 16), Color(1, 1, 1, 0.045), 2.0)

func marker_radius(t: String) -> float:
	if t == GameData.RegionsData.TYPE_BOSS:
		return 74.0
	if t == GameData.RegionsData.TYPE_STORY or t == GameData.RegionsData.TYPE_ELITE:
		return 62.0
	return 52.0

func _draw_location(c: CanvasItem, loc: Dictionary) -> void:
	var lid := String(loc["id"])
	if not MapManager.is_discovered(lid):
		return
	var p: Vector2 = loc["pos"]
	var t := String(loc["type"])
	var col := GameData.RegionsData.type_color(t)
	var cleared := MapManager.is_cleared(lid)
	var locked := MapManager.is_locked(lid)
	var r := marker_radius(t)

	c.draw_circle(p, r + 10.0, Color(0, 0, 0, 0.45))
	c.draw_circle(p, r, Pal.BG_DEEP.lerp(col, 0.18))
	c.draw_arc(p, r, 0, TAU, 30, col if not cleared else col.lerp(Pal.BG, 0.5), 5.0)
	Icons.draw_icon(c, _icon_for(t), Rect2(p - Vector2(r, r) * 0.6, Vector2(r, r) * 1.2),
		col if not locked else Pal.TEXT_FAINT, 4.5)

	if cleared:
		c.draw_circle(p + Vector2(r * 0.72, -r * 0.72), 20.0, Pal.BG_DEEP)
		Icons.draw_icon(c, "check", Rect2(p + Vector2(r * 0.72 - 14.0, -r * 0.72 - 14.0),
			Vector2(28, 28)), Pal.GOOD, 4.0)
	if locked:
		c.draw_circle(p + Vector2(r * 0.72, -r * 0.72), 22.0, Pal.BG_DEEP)
		Icons.draw_icon(c, "lock", Rect2(p + Vector2(r * 0.72 - 15.0, -r * 0.72 - 15.0),
			Vector2(30, 30)), Pal.WARN, 3.5)

	c.draw_string(_font, p + Vector2(-140, r + 42), String(loc["name"]),
		HORIZONTAL_ALIGNMENT_CENTER, 280, 28, Pal.TEXT if not locked else Pal.TEXT_FAINT)
	c.draw_string(_font, p + Vector2(-140, r + 76), "LV %d" % int(loc["level"]),
		HORIZONTAL_ALIGNMENT_CENTER, 280, 25, Pal.difficulty_color(int(loc["difficulty"])))

# ---- Live layer ---------------------------------------------------------

func _draw_live() -> void:
	var c := _live_layer

	# Insertion beacon
	var entry := MapManager.entry_point(region_id)
	c.draw_arc(entry, 54.0 + 16.0 * (0.5 + 0.5 * sin(_t * 2.0)), 0, TAU, 28,
		Color(Pal.ACCENT.r, Pal.ACCENT.g, Pal.ACCENT.b, 0.25), 3.0)

	# Attention rings on anything discovered and still worth doing
	for loc in GameData.locations_in_region(region_id):
		var lid := String(loc["id"])
		if not MapManager.is_discovered(lid) or MapManager.is_cleared(lid) or MapManager.is_locked(lid):
			continue
		var p: Vector2 = loc["pos"]
		var col := GameData.RegionsData.type_color(String(loc["type"]))
		var a := 0.30 + 0.30 * sin(_t * 2.4 + p.x)
		c.draw_arc(p, marker_radius(String(loc["type"])) + 14.0, 0, TAU, 30,
			Color(col.r, col.g, col.b, a), 3.0)

	# Routes, under the markers that follow them
	for team in ExpeditionManager.active_teams_in_region(region_id):
		var s := ExpeditionManager.slot(team)
		var from: Vector2 = s["from"]
		var to: Vector2 = s["to"]
		var dash := 34.0
		var d := from.distance_to(to)
		if d <= 0.0:
			continue
		var dir := (to - from) / d
		var travelled := 0.0
		while travelled < d:
			var seg := minf(dash, d - travelled)
			if int(travelled / dash) % 2 == 0:
				c.draw_line(from + dir * travelled, from + dir * (travelled + seg),
					Pal.ACCENT.lerp(Color.BLACK, 0.25), 5.0)
			travelled += dash

	for e in EventManager.in_region(region_id):
		_draw_event(c, e)
	for team in ExpeditionManager.active_teams_in_region(region_id):
		_draw_team(c, team)

func _draw_event(c: CanvasItem, e: Dictionary) -> void:
	var tpl := GameData.EventsData.by_id(String(e["tpl"]))
	if tpl.is_empty():
		return
	var p := Vector2(float(e["x"]), float(e["y"]))
	var col := Color(String(tpl["color"]))
	var pulse := 0.5 + 0.5 * sin(_t * 3.0)
	c.draw_circle(p, 62.0, Color(0, 0, 0, 0.45))
	c.draw_circle(p, 54.0, Pal.BG_DEEP.lerp(col, 0.22))
	c.draw_arc(p, 54.0, 0, TAU, 28, col, 5.0)
	c.draw_arc(p, 54.0 + 22.0 * pulse, 0, TAU, 28, Color(col.r, col.g, col.b, 0.35 * (1.0 - pulse)), 4.0)
	Icons.draw_icon(c, "target", Rect2(p - Vector2(30, 30), Vector2(60, 60)), col, 4.5)
	c.draw_string(_font, p + Vector2(-140, 96), String(tpl["name"]),
		HORIZONTAL_ALIGNMENT_CENTER, 280, 28, col)
	c.draw_string(_font, p + Vector2(-140, 130), GameData.fmt_time(EventManager.remaining(String(e["uid"]))),
		HORIZONTAL_ALIGNMENT_CENTER, 280, 26, Pal.WARN)

func _draw_team(c: CanvasItem, team: int) -> void:
	var s := ExpeditionManager.slot(team)
	var p := ExpeditionManager.marker_position(team)
	var state := String(s["state"])
	var col: Color = Pal.ACCENT if state != ExpeditionManager.STATE_RETURN else Pal.CYAN
	c.draw_circle(p, 44.0, Color(0, 0, 0, 0.5))
	var heading := ((s["to"] as Vector2) - (s["from"] as Vector2)).normalized()
	if state == ExpeditionManager.STATE_RETURN:
		heading = -heading
	if heading == Vector2.ZERO:
		heading = Vector2.UP
	var perp := Vector2(-heading.y, heading.x)
	c.draw_colored_polygon(PackedVector2Array([
		p + heading * 38.0, p - heading * 24.0 + perp * 24.0, p - heading * 24.0 - perp * 24.0]), col)
	c.draw_arc(p, 44.0, 0, TAU, 26, col, 4.0)
	var label := SquadManager.team_name(team).to_upper()
	if state == ExpeditionManager.STATE_ARRIVED:
		label += " · ON SITE"
	elif state == ExpeditionManager.STATE_RETURN:
		label += " · RETURNING  " + GameData.fmt_time(ExpeditionManager.remaining(team))
	else:
		label += "  " + GameData.fmt_time(ExpeditionManager.remaining(team))
	c.draw_string(_font, p + Vector2(-160, -60), label, HORIZONTAL_ALIGNMENT_CENTER, 320, 28, col)

func _icon_for(t: String) -> String:
	match t:
		GameData.RegionsData.TYPE_RESOURCE: return "materials"
		GameData.RegionsData.TYPE_CACHE: return "crate"
		GameData.RegionsData.TYPE_EXPLORE: return "map"
		GameData.RegionsData.TYPE_WAREHOUSE: return "inventory"
		GameData.RegionsData.TYPE_CONVOY: return "fuel"
		GameData.RegionsData.TYPE_CAMP: return "target"
		GameData.RegionsData.TYPE_INTEL: return "intel"
		GameData.RegionsData.TYPE_ELITE: return "power"
		GameData.RegionsData.TYPE_STORY: return "missions"
		GameData.RegionsData.TYPE_BOSS: return "skull"
		_: return "target"

## Nearest interactive thing to a world point, or {} if the tap hit empty ground.
func pick(world_pos: Vector2) -> Dictionary:
	var best: Dictionary = {}
	var best_d := 120.0
	for e in EventManager.in_region(region_id):
		var p := Vector2(float(e["x"]), float(e["y"]))
		var d := p.distance_to(world_pos)
		if d < best_d:
			best_d = d
			best = {"kind": ExpeditionManager.KIND_EVENT, "id": String(e["uid"])}
	for loc in GameData.locations_in_region(region_id):
		if not MapManager.is_discovered(String(loc["id"])):
			continue
		var d2: float = (loc["pos"] as Vector2).distance_to(world_pos)
		if d2 < best_d:
			best_d = d2
			best = {"kind": ExpeditionManager.KIND_LOCATION, "id": String(loc["id"])}
	return best
