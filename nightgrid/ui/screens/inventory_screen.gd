extends GameScreen
## INVENTORY tab: everything in storage, filtered by slot.

const Sheets := preload("res://ui/sheets/sheets.gd")

var _tabs: HBoxContainer
var _grid: GridContainer
var _empty: Label
var _filter: String = "all"
var _summary: HBoxContainer

func build() -> void:
	var col := UI.vbox(Pal.GAP_S)
	UI.full_rect(col)
	add_child(col)
	var pad := UI.margin(Pal.GAP, Pal.GAP_S, Pal.GAP, 0)
	col.add_child(pad)
	var head := UI.vbox(Pal.GAP_S)
	pad.add_child(head)
	_summary = UI.hbox(Pal.GAP_S)
	head.add_child(_summary)
	_tabs = UI.hbox(8)
	head.add_child(_tabs)

	var scroll := UI.scroll()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	var pad2 := UI.margin(Pal.GAP, 0, Pal.GAP, Pal.GAP + 40.0)
	pad2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(pad2)
	var inner := UI.vbox(Pal.GAP_S)
	pad2.add_child(inner)
	_empty = UI.label("Storage is empty. Loot drops from expeditions, caches and bosses.",
		Pal.FS_SMALL, Pal.TEXT_DIM)
	_empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	inner.add_child(_empty)
	_grid = UI.grid(2, Pal.GAP_S)
	inner.add_child(_grid)

	CharacterManager.inventory_changed.connect(refresh)
	CharacterManager.roster_changed.connect(refresh)

func refresh() -> void:
	if _grid == null:
		return
	UI.clear(_tabs)
	var options := [["all", "ALL"], ["weapon", "WEAPON"], ["armor", "ARMOR"], ["accessory", "ACCESSORY"]]
	for o in options:
		var key := String(o[0])
		var b := UI.button(String(o[1]), func():
			_filter = key
			refresh(), TapButton.Kind.PRIMARY if _filter == key else TapButton.Kind.GHOST, 92.0)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_font_size_override("font_size", Pal.FS_MICRO)
		_tabs.add_child(b)

	UI.clear(_summary)
	var total := 0
	for id in CharacterManager.inventory_ids():
		total += CharacterManager.item_count(String(id))
	var equipped := 0
	for cid in CharacterManager.ids():
		for slot in GameData.ItemsData.slots():
			if CharacterManager.equipped_item(String(cid), String(slot)) != "":
				equipped += 1
	_summary.add_child(_stat("In storage", str(total), Pal.TEXT))
	_summary.add_child(_stat("Fitted", str(equipped), Pal.GOOD))
	_summary.add_child(_stat("Catalogue", "%d types" % GameData.items.size(), Pal.TEXT_DIM))

	UI.clear(_grid)
	var shown := 0
	for id in CharacterManager.inventory_ids():
		var iid := String(id)
		var it := GameData.item(iid)
		if _filter != "all" and String(it["slot"]) != _filter:
			continue
		shown += 1
		_grid.add_child(_card(iid))
	_empty.visible = shown == 0
	if shown == 0 and total > 0:
		_empty.text = "Nothing in this category yet."
	elif shown == 0:
		_empty.text = "Storage is empty. Loot drops from expeditions, caches and bosses."

func _stat(caption: String, value: String, col: Color) -> Control:
	var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := UI.vbox(2)
	v.add_child(UI.label(caption.to_upper(), Pal.FS_MICRO, Pal.TEXT_FAINT))
	v.add_child(UI.label(value, Pal.FS_BODY, col))
	p.add_child(v)
	return p

func _card(iid: String) -> Control:
	var it := GameData.item(iid)
	var rc := Pal.rarity(String(it["rarity"]))
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 280)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_stylebox_override("normal", Pal.panel_box(Pal.PANEL, rc.lerp(Pal.BG, 0.45), Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("hover", Pal.panel_box(Pal.PANEL, rc, Pal.RADIUS_S, 2))
	b.add_theme_stylebox_override("pressed", Pal.panel_box(Pal.PANEL_HI, rc, Pal.RADIUS_S, 2))
	b.pressed.connect(func():
		var main: Node = Engine.get_main_loop().current_scene
		if main and main.has_method("open_sheet"):
			main.call("open_sheet", Sheets.item_sheet(iid)))
	var v := UI.vbox(6)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 14
	v.offset_right = -14
	v.offset_top = 12
	v.offset_bottom = -12
	var icon_wrap := CenterContainer.new()
	icon_wrap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	icon_wrap.add_child(IconView.new(String(it["slot"]), rc, 92.0, 5.0))
	v.add_child(icon_wrap)
	var name_l := UI.label(String(it["name"]), Pal.FS_MICRO, Pal.TEXT)
	name_l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(name_l)
	var row := UI.hbox(6)
	row.add_child(UI.chip(String(it["rarity"]), rc))
	row.add_child(UI.hfill())
	row.add_child(UI.label("×%d" % CharacterManager.item_count(iid), Pal.FS_MICRO, Pal.TEXT_DIM))
	v.add_child(row)
	var prow := UI.hbox(6)
	prow.add_child(IconView.new("power", Pal.CYAN, 22.0, 3.0))
	prow.add_child(UI.label("+%d" % GameData.ItemsData.item_power(it), Pal.FS_MICRO, Pal.CYAN))
	v.add_child(prow)
	b.add_child(v)
	return b
