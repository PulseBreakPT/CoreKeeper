extends RefCounted
## Factory for every bottom sheet in the game.

const BuildingSheet := preload("res://ui/sheets/building_sheet.gd")
const LocationSheet := preload("res://ui/sheets/location_sheet.gd")
const SquadSheet := preload("res://ui/sheets/squad_sheet.gd")
const CharacterSheet := preload("res://ui/sheets/character_sheet.gd")

static func building_sheet(bid: String) -> BottomSheet:
	return BuildingSheet.new(bid)

static func location_sheet(kind: String, target_id: String) -> BottomSheet:
	return LocationSheet.new(kind, target_id)

static func squad_sheet(team: int) -> BottomSheet:
	return SquadSheet.new(team)

static func character_sheet(cid: String) -> BottomSheet:
	return CharacterSheet.new(cid)

## Full wallet: amounts, caps and live production rates.
static func resources_sheet() -> BottomSheet:
	var s := BottomSheet.new("Stockpile", "Storage is capped by the Warehouse", 0.74)
	var rates: Dictionary = {}
	for bid in BuildingManager.state.keys():
		for res in BuildingManager.production_per_minute(String(bid)).keys():
			rates[res] = float(rates.get(res, 0.0)) + float(BuildingManager.production_per_minute(String(bid))[res])
	for res in GameData.RESOURCES:
		var r := String(res)
		var amount := ResourceManager.get_amount(r)
		var cap := ResourceManager.capacity_of(r)
		var card := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
		var v := UI.vbox(8)
		card.add_child(v)
		var row := UI.hbox(Pal.GAP_S)
		row.add_child(IconView.new(r, GameData.resource_color(r), 44.0, 3.5))
		row.add_child(UI.label(GameData.resource_label(r).to_upper(), Pal.FS_SMALL, Pal.TEXT))
		row.add_child(UI.hfill())
		var full := amount >= cap
		row.add_child(UI.label("%s / %s" % [GameData.fmt(float(amount)), GameData.fmt(float(cap))],
			Pal.FS_SMALL, Pal.WARN if full else Pal.TEXT_DIM))
		v.add_child(row)
		var bar := StatBar.new(12.0, Pal.WARN if full else GameData.resource_color(r))
		bar.value = 0.0 if cap <= 0 else clampf(float(amount) / float(cap), 0.0, 1.0)
		v.add_child(bar)
		var note := ""
		if rates.has(r):
			note = "+%s / min" % GameData.fmt(float(rates[r]))
		elif r == "tokens":
			note = "Earned from bosses, first clears and events"
		else:
			note = "From expeditions and rewards"
		if full:
			note += "  ·  STORAGE FULL"
		v.add_child(UI.label(note, Pal.FS_MICRO, Pal.WARN if full else Pal.TEXT_FAINT))
		s.body.add_child(card)
	return s

static func energy_sheet() -> BottomSheet:
	var s := BottomSheet.new("Energy", "Spent on every deployment", 0.55)
	var e := ResourceManager.energy
	var m := ResourceManager.energy_max
	var v := UI.vbox(Pal.GAP_S)
	s.body.add_child(v)
	var bar := StatBar.new(22.0, Pal.WARN)
	bar.value = 0.0 if m <= 0 else e / float(m)
	v.add_child(bar)
	v.add_child(UI.label("%d / %d" % [int(floor(e)), m], Pal.FS_BIG, Pal.TEXT))
	v.add_child(UI.label("One point every %s" % GameData.fmt_time(ResourceManager.energy_seconds_per_point()),
		Pal.FS_SMALL, Pal.TEXT_DIM))
	if ResourceManager.seconds_to_full_energy() > 0.0:
		v.add_child(UI.label("Full in %s" % GameData.fmt_time(ResourceManager.seconds_to_full_energy()),
			Pal.FS_SMALL, Pal.CYAN))
	else:
		v.add_child(UI.label("At capacity", Pal.FS_SMALL, Pal.GOOD))
	v.add_child(UI.rule())
	v.add_child(UI.wrap_label("The Medical Center shortens the regeneration cycle and the Headquarters raises the ceiling. Levelling up refills part of the bar.", Pal.FS_SMALL, Pal.TEXT_DIM))
	if GameManager.dev_infinite_energy:
		v.add_child(UI.chip("DEV: INFINITE ENERGY", Pal.BAD, Pal.FS_SMALL))
	return s

static func item_sheet(item_id: String) -> BottomSheet:
	var it := GameData.item(item_id)
	var rc := Pal.rarity(String(it["rarity"]))
	var s := BottomSheet.new(String(it["name"]), "%s %s" % [String(it["rarity"]),
		GameData.ItemsData.slot_label(String(it["slot"]))], 0.72)
	var head := UI.hbox(Pal.GAP)
	head.add_child(IconView.new(String(it["slot"]), rc, 110.0, 5.0))
	var side := UI.vbox(6)
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	side.add_child(UI.chip(String(it["rarity"]), rc))
	side.add_child(UI.stat_block("Item Power", "+%d" % GameData.ItemsData.item_power(it), Pal.CYAN, Pal.FS_TITLE))
	side.add_child(UI.label("In storage: %d" % CharacterManager.item_count(item_id), Pal.FS_SMALL, Pal.TEXT_DIM))
	head.add_child(side)
	s.body.add_child(head)
	s.body.add_child(UI.wrap_label(String(it["desc"]), Pal.FS_SMALL, Pal.TEXT_DIM))
	s.body.add_child(UI.rule())
	var g := UI.grid(2, Pal.GAP_S)
	for k in it["stats"].keys():
		var key := String(k)
		var val := float(it["stats"][k])
		var text := "+%s" % GameData.fmt(val)
		if key == "crit" or key == "crit_dmg":
			text = "+%d%%" % int(round(val * 100.0))
		elif val < 0.0:
			text = GameData.fmt(val)
		var p := UI.panel(Pal.PANEL_SOFT, Pal.LINE_SOFT, Pal.RADIUS_S)
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var vv := UI.vbox(2)
		vv.add_child(UI.label(_stat_label(key), Pal.FS_MICRO, Pal.TEXT_FAINT))
		vv.add_child(UI.label(text, Pal.FS_BODY, Pal.GOOD if val >= 0.0 else Pal.BAD))
		p.add_child(vv)
		g.add_child(p)
	s.body.add_child(g)
	s.body.add_child(UI.label("ORIGIN", Pal.FS_MICRO, Pal.TEXT_FAINT))
	s.body.add_child(UI.label(String(it["origin"]), Pal.FS_SMALL, Pal.TEXT_DIM))

	if CharacterManager.item_count(item_id) > 0:
		s.body.add_child(UI.rule())
		s.body.add_child(UI.label("FIT TO", Pal.FS_MICRO, Pal.TEXT_FAINT))
		for cid in CharacterManager.ids():
			var who := String(cid)
			var def := GameData.character(who)
			var cur := CharacterManager.equipped_item(who, String(it["slot"]))
			var cur_p := 0 if cur == "" else GameData.ItemsData.item_power(GameData.item(cur))
			var delta := GameData.ItemsData.item_power(it) - cur_p
			var b := UI.button("%s   %s%d PWR" % [String(def["codename"]),
				"+" if delta >= 0 else "", delta],
				func():
					if CharacterManager.equip(who, item_id):
						UIManager.say("Fitted to %s" % String(def["codename"]), "good")
						s.close(),
				TapButton.Kind.SUCCESS if delta > 0 else TapButton.Kind.SECONDARY, 118.0)
			b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			b.disabled = CharacterManager.item_count(item_id) <= 0
			s.body.add_child(b)
	return s

static func _stat_label(k: String) -> String:
	match k:
		"hp": return "HP"
		"attack": return "ATTACK"
		"defense": return "DEFENCE"
		"speed": return "SPEED"
		"crit": return "CRIT CHANCE"
		"crit_dmg": return "CRIT DAMAGE"
		_: return k.to_upper()

static func recruit_sheet() -> BottomSheet:
	var s := BottomSheet.new("Recruitment", "Roster %d / %d — raise the Barracks for more room"
		% [CharacterManager.roster_size(), BuildingManager.roster_capacity()], 0.84)
	var pool := CharacterManager.recruitable()
	if pool.is_empty():
		s.body.add_child(UI.label("Everyone is already on the books.", Pal.FS_BODY, Pal.TEXT_DIM))
		return s
	for id in pool:
		var cid := String(id)
		var def := GameData.character(cid)
		var cost := CharacterManager.recruit_cost(cid)
		var rc := Pal.rarity(String(def["rarity"]))
		var card := UI.panel(Pal.PANEL, rc.lerp(Pal.BG, 0.45), Pal.RADIUS_S)
		var v := UI.vbox(10)
		card.add_child(v)
		var row := UI.hbox(Pal.GAP_S)
		var pt := Portrait.for_character(cid)
		pt.custom_minimum_size = Vector2(130, 160)
		row.add_child(pt)
		var info := UI.vbox(4)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(UI.label(String(def["codename"]), Pal.FS_BODY, Pal.TEXT))
		info.add_child(UI.label(String(def["name"]), Pal.FS_MICRO, Pal.TEXT_DIM))
		var tags := UI.hbox(8)
		tags.add_child(UI.chip(String(def["rarity"]), rc))
		tags.add_child(UI.chip(String(def["klass"]), GameData.CharactersData.class_color(String(def["klass"]))))
		info.add_child(tags)
		info.add_child(UI.resource_row(cost, Pal.FS_MICRO, 26.0, true))
		row.add_child(info)
		v.add_child(row)
		v.add_child(UI.wrap_label(String(def["bio"]), Pal.FS_MICRO, Pal.TEXT_FAINT))
		var reason := ""
		if CharacterManager.roster_size() >= BuildingManager.roster_capacity():
			reason = "Roster is full — upgrade the Barracks"
		elif not ResourceManager.can_afford(cost):
			reason = "Not enough resources"
		if reason != "":
			v.add_child(UI.label(reason, Pal.FS_MICRO, Pal.WARN))
		var b := UI.button("RECRUIT", func():
			if CharacterManager.recruit(cid):
				UIManager.say("%s joined the organisation" % String(def["codename"]), "good")
				s.close()
			else:
				UIManager.say("Cannot recruit right now", "bad"),
			TapButton.Kind.PRIMARY, 118.0)
		b.disabled = not CharacterManager.can_recruit(cid)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(b)
		s.body.add_child(card)
	return s
