class_name CombatUnitCard
extends Control
## One fighter on screen: portrait, health, skill charge and active effects.

var uid: String
var _side: String
var _portrait: Portrait
var _hp_bar: StatBar
var _energy_bar: StatBar
var _hp_label: Label
var _name_label: Label
var _status_row: HBoxContainer
var _frame: PanelContainer
var _dead := false

func _init(unit: Dictionary) -> void:
	uid = String(unit["uid"])
	_side = String(unit["side"])
	custom_minimum_size = Vector2(0, 280)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_frame = PanelContainer.new()
	UI.full_rect(_frame)
	var border: Color = Pal.BAD if _side == "enemy" else Pal.CYAN
	_frame.add_theme_stylebox_override("panel", Pal.panel_box(Pal.PANEL_SOFT, border.lerp(Pal.BG, 0.55), Pal.RADIUS_S, 2))
	add_child(_frame)

	var v := UI.vbox(4)
	_frame.add_child(v)
	_portrait = Portrait.for_unit(unit)
	_portrait.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_portrait.custom_minimum_size = Vector2(0, 150)
	v.add_child(_portrait)
	_name_label = UI.label(String(unit["name"]), Pal.FS_MICRO, Pal.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	_name_label.clip_text = true
	v.add_child(_name_label)
	_hp_bar = StatBar.new(12.0, Pal.GOOD if _side == "ally" else Pal.BAD)
	v.add_child(_hp_bar)
	_hp_label = UI.label("", Pal.FS_MICRO, Pal.TEXT_DIM, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(_hp_label)
	_energy_bar = StatBar.new(6.0, Pal.ACCENT)
	v.add_child(_energy_bar)
	_status_row = UI.hbox(3)
	_status_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(_status_row)
	refresh()

func unit() -> Dictionary:
	return CombatManager.unit_by_uid(uid)

func refresh() -> void:
	var u := unit()
	if u.is_empty():
		return
	var hp := float(u["hp"])
	var mx := maxf(float(u["max_hp"]), 1.0)
	_hp_bar.value = clampf(hp / mx, 0.0, 1.0)
	var shield := float(u.get("shield", 0))
	_hp_bar.ghost = clampf((hp + shield) / mx, 0.0, 1.0)
	_hp_bar.ghost_color = Color(0.55, 0.85, 1.0, 0.45)
	_hp_label.text = "%d" % int(hp)
	var skill: Dictionary = u.get("skill", {})
	var cost := float(skill.get("cost", 100))
	_energy_bar.value = clampf(float(u["energy"]) / maxf(cost, 1.0), 0.0, 1.0)
	_energy_bar.fill_color = Pal.GOLD if float(u["energy"]) >= cost else Pal.ACCENT
	UI.clear(_status_row)
	for s in u.get("statuses", []):
		var kind := String(s["kind"])
		var col := _status_color(kind)
		var dot := ColorRect.new()
		dot.color = col
		dot.custom_minimum_size = Vector2(16, 8)
		_status_row.add_child(dot)
	if not bool(u["alive"]) and not _dead:
		_dead = true
		modulate = Color(0.45, 0.45, 0.5, 0.65)
		_name_label.add_theme_color_override("font_color", Pal.TEXT_FAINT)

func _status_color(kind: String) -> Color:
	match kind:
		"burn": return Pal.ACCENT
		"bleed": return Pal.BAD
		"stun": return Pal.GOLD
		"slow": return Pal.CYAN
		"marked": return Color("#ff3d7a")
		"buff": return Pal.GOOD
		"debuff": return Color("#b46bff")
		_: return Pal.TEXT_DIM

func flash(col: Color) -> void:
	var tw := create_tween()
	tw.tween_property(_frame, "modulate", Color(col.r * 1.6, col.g * 1.6, col.b * 1.6, 1.0), 0.06)
	tw.tween_property(_frame, "modulate", Color.WHITE, 0.16)

func shake() -> void:
	var start := position
	var tw := create_tween()
	tw.tween_property(self, "position", start + Vector2(8, 0), 0.04)
	tw.tween_property(self, "position", start - Vector2(8, 0), 0.04)
	tw.tween_property(self, "position", start, 0.04)
