extends Node
## Static content tables, loaded once. Pure data access — no gameplay logic here.

const BuildingsData := preload("res://data/buildings_data.gd")
const CharactersData := preload("res://data/characters_data.gd")
const ItemsData := preload("res://data/items_data.gd")
const RegionsData := preload("res://data/regions_data.gd")
const MissionsData := preload("res://data/missions_data.gd")
const EventsData := preload("res://data/events_data.gd")
const EnemiesData := preload("res://data/enemies_data.gd")

const RESOURCES := ["cash", "materials", "fuel", "intel", "supplies", "tokens"]
const HEADER_RESOURCES := ["cash", "materials", "fuel"]

var buildings: Dictionary = {}
var characters: Dictionary = {}
var items: Dictionary = {}
var locations: Dictionary = {}
var regions: Array = []

func _ready() -> void:
	buildings = BuildingsData.all()
	characters = CharactersData.all()
	items = ItemsData.all()
	regions = RegionsData.regions()
	locations = RegionsData.all_locations()

func building(id: String) -> Dictionary:
	return buildings.get(id, {})

func character(id: String) -> Dictionary:
	return characters.get(id, {})

func item(id: String) -> Dictionary:
	return items.get(id, {})

func location(id: String) -> Dictionary:
	return locations.get(id, {})

func region(id: String) -> Dictionary:
	return RegionsData.region_by_id(id)

func region_ids() -> Array:
	var out: Array = []
	for r in regions:
		out.append(r["id"])
	return out

func locations_in_region(region_id: String) -> Array:
	var out: Array = []
	for id in locations.keys():
		if locations[id]["region"] == region_id:
			out.append(locations[id])
	return out

static func resource_label(res: String) -> String:
	match res:
		"cash": return "Cash"
		"materials": return "Materials"
		"fuel": return "Fuel"
		"intel": return "Intel"
		"supplies": return "Supplies"
		"tokens": return "Tokens"
		_: return res.capitalize()

static func resource_color(res: String) -> Color:
	match res:
		"cash": return Color("#6fe09a")
		"materials": return Color("#d0a86a")
		"fuel": return Color("#ff9b4a")
		"intel": return Color("#7fb8ff")
		"supplies": return Color("#e0d06a")
		"tokens": return Color("#ff5fae")
		_: return Color("#9aa7b4")

## Compact number formatting: 1234 -> 1,234 ; 45200 -> 45.2K ; 3120000 -> 3.12M
static func fmt(n: float) -> String:
	var a := absf(n)
	var sign_s := "-" if n < 0 else ""
	if a < 10000.0:
		return sign_s + _thousands(int(round(a)))
	if a < 1000000.0:
		return sign_s + ("%.1fK" % (a / 1000.0)).replace(".0K", "K")
	if a < 1000000000.0:
		return sign_s + ("%.2fM" % (a / 1000000.0))
	return sign_s + ("%.2fB" % (a / 1000000000.0))

static func _thousands(v: int) -> String:
	var s := str(absi(v))
	var out := ""
	var c := 0
	for i in range(s.length() - 1, -1, -1):
		out = s[i] + out
		c += 1
		if c % 3 == 0 and i > 0:
			out = "," + out
	return ("-" if v < 0 else "") + out

## Short duration: 95 -> 1m 35s ; 3700 -> 1h 01m
static func fmt_time(seconds: float) -> String:
	var s := int(maxf(seconds, 0.0))
	if s < 60:
		return "%ds" % s
	if s < 3600:
		return "%dm %02ds" % [s / 60, s % 60]
	if s < 86400:
		return "%dh %02dm" % [s / 3600, (s % 3600) / 60]
	return "%dd %02dh" % [s / 86400, (s % 86400) / 3600]
