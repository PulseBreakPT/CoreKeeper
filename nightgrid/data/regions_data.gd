extends RefCounted
## Five regions. Locations are laid out deterministically from a per-region seed so
## every install sees the same world, but the layout is authored data, not hand-typed.

const MAP_W := 1400.0
const MAP_H := 2600.0
const FOG_CELL := 200.0

const TYPE_RESOURCE := "resource_node"
const TYPE_CACHE := "supply_cache"
const TYPE_EXPLORE := "exploration"
const TYPE_WAREHOUSE := "warehouse"
const TYPE_CONVOY := "convoy"
const TYPE_CAMP := "npc_camp"
const TYPE_INTEL := "intel_point"
const TYPE_ELITE := "elite"
const TYPE_STORY := "story"
const TYPE_BOSS := "boss"

static func type_label(t: String) -> String:
	match t:
		TYPE_RESOURCE: return "Resource Node"
		TYPE_CACHE: return "Supply Cache"
		TYPE_EXPLORE: return "Exploration Site"
		TYPE_WAREHOUSE: return "Abandoned Warehouse"
		TYPE_CONVOY: return "Convoy"
		TYPE_CAMP: return "Enemy Camp"
		TYPE_INTEL: return "Intelligence Point"
		TYPE_ELITE: return "Elite Target"
		TYPE_STORY: return "Story Mission"
		TYPE_BOSS: return "Regional Boss"
		_: return t.capitalize()

static func type_color(t: String) -> Color:
	match t:
		TYPE_RESOURCE: return Color("#5fd08a")
		TYPE_CACHE: return Color("#6fd0ff")
		TYPE_EXPLORE: return Color("#9aa7b4")
		TYPE_WAREHOUSE: return Color("#c9a24a")
		TYPE_CONVOY: return Color("#e0762e")
		TYPE_CAMP: return Color("#ff6a3d")
		TYPE_INTEL: return Color("#b46bff")
		TYPE_ELITE: return Color("#ff3d7a")
		TYPE_STORY: return Color("#ffd24a")
		TYPE_BOSS: return Color("#ff2e2e")
		_: return Color("#8a97a6")

## difficulty -> travel seconds, energy, reward multiplier
static func difficulty_profile(d: int) -> Dictionary:
	match d:
		1: return {"travel": 10.0, "energy": 6, "mult": 1.0}
		2: return {"travel": 20.0, "energy": 9, "mult": 1.6}
		3: return {"travel": 30.0, "energy": 12, "mult": 2.4}
		4: return {"travel": 60.0, "energy": 16, "mult": 3.6}
		_: return {"travel": 120.0, "energy": 22, "mult": 5.5}

static func regions() -> Array:
	return [
		{
			"id": "harbour_reach", "name": "Harbour Reach",
			"subtitle": "Container terminals and flooded slipways on the city's north lip.",
			"faction": "dock_syndicate", "rec_level": 1, "seed": 1207,
			"unlock_player_level": 1, "unlock_after": "",
			"palette": {"bg": "#0a1018", "ground": "#12202c", "line": "#1d3648", "accent": "#4a9eda"},
			"resources": ["materials", "fuel"],
		},
		{
			"id": "sable_quarter", "name": "Sable Quarter",
			"subtitle": "Gambling floors, private clinics and a great deal of laundered money.",
			"faction": "velvet_cartel", "rec_level": 6, "seed": 2411,
			"unlock_player_level": 4, "unlock_after": "harbour_reach",
			"palette": {"bg": "#120a14", "ground": "#22122a", "line": "#3a1f46", "accent": "#c25fa8"},
			"resources": ["cash", "supplies"],
		},
		{
			"id": "iron_verge", "name": "Iron Verge",
			"subtitle": "Rolling mills that never cooled down and a union that never disbanded.",
			"faction": "slagworks_union", "rec_level": 13, "seed": 3617,
			"unlock_player_level": 8, "unlock_after": "sable_quarter",
			"palette": {"bg": "#150d08", "ground": "#2a1a0f", "line": "#48301a", "accent": "#e0762e"},
			"resources": ["materials", "fuel", "cash"],
		},
		{
			"id": "null_district", "name": "Null District",
			"subtitle": "Blocks that do not appear on any municipal map, and are maintained anyway.",
			"faction": "quietline", "rec_level": 21, "seed": 4903,
			"unlock_player_level": 13, "unlock_after": "iron_verge",
			"palette": {"bg": "#070f12", "ground": "#0f2028", "line": "#1a3a45", "accent": "#6fd0ff"},
			"resources": ["intel", "supplies"],
		},
		{
			"id": "ashline_basin", "name": "Ashline Basin",
			"subtitle": "Where the fires were left burning on purpose. The Court holds the basin floor.",
			"faction": "ash_court", "rec_level": 30, "seed": 6113,
			"unlock_player_level": 19, "unlock_after": "null_district",
			"palette": {"bg": "#160809", "ground": "#2c1012", "line": "#4a1d20", "accent": "#ff5b5b"},
			"resources": ["intel", "cash", "materials", "tokens"],
		},
	]

static func region_by_id(id: String) -> Dictionary:
	for r in regions():
		if r["id"] == id:
			return r
	return {}

## Per-type place names, cycled per region.
static func _name_pool(region_id: String, t: String) -> Array:
	var pools := {
		"harbour_reach": {
			TYPE_RESOURCE: ["Slipway Scrapfield", "Bulk Ore Hopper"],
			TYPE_CACHE: ["Pilot House Stash", "Buoy Yard Drop"],
			TYPE_EXPLORE: ["Silted Dry Dock", "Ferry Terminal Ruin"],
			TYPE_WAREHOUSE: ["Bonded Shed 4", "Cold Store Annex"],
			TYPE_CONVOY: ["Night Haulage Run"],
			TYPE_CAMP: ["Gantry Encampment", "Breakwater Post"],
			TYPE_INTEL: ["Port Authority Relay"],
			TYPE_ELITE: ["Container Stack 19"],
			TYPE_STORY: ["A Foot In The Door", "Cutting The Manifest"],
			TYPE_BOSS: ["The Harbourmaster's Office"],
		},
		"sable_quarter": {
			TYPE_RESOURCE: ["Vault Counting Room", "Bonded Cellars"],
			TYPE_CACHE: ["Coat Check Drop", "Valet Tunnel Cache"],
			TYPE_EXPLORE: ["Shuttered Theatre", "Private Clinic Wing"],
			TYPE_WAREHOUSE: ["Silk Storage", "Auction Annex"],
			TYPE_CONVOY: ["Armoured Takings Run"],
			TYPE_CAMP: ["House Security Muster", "Backlot Checkpoint"],
			TYPE_INTEL: ["Concierge Switchboard"],
			TYPE_ELITE: ["The Upper Floor"],
			TYPE_STORY: ["Table Stakes", "Closing The House"],
			TYPE_BOSS: ["Madame Ortolan's Salon"],
		},
		"iron_verge": {
			TYPE_RESOURCE: ["Slag Heap Seven", "Billet Yard"],
			TYPE_CACHE: ["Tool Crib Cache", "Shift Locker Room"],
			TYPE_EXPLORE: ["Collapsed Rolling Shed", "Quench Tank Row"],
			TYPE_WAREHOUSE: ["Pattern Store", "Ingot Depot"],
			TYPE_CONVOY: ["Ore Train Siding"],
			TYPE_CAMP: ["Picket Line Camp", "Furnace Watch Post"],
			TYPE_INTEL: ["Works Control Tower"],
			TYPE_ELITE: ["Blast Floor Gantry"],
			TYPE_STORY: ["Breaking The Shift", "The Long Pour"],
			TYPE_BOSS: ["Number Three Furnace"],
		},
		"null_district": {
			TYPE_RESOURCE: ["Unlisted Substation", "Cable Vault"],
			TYPE_CACHE: ["Dead Drop Nine", "Courier Locker"],
			TYPE_EXPLORE: ["Address With No Number", "Grey Stairwell"],
			TYPE_WAREHOUSE: ["Archive Repository", "Evidence Store"],
			TYPE_CONVOY: ["Unmarked Transfer"],
			TYPE_CAMP: ["Section Muster Point", "Perimeter Watch"],
			TYPE_INTEL: ["Trunk Line Exchange"],
			TYPE_ELITE: ["The Handler's Floor"],
			TYPE_STORY: ["Nothing On Record", "The Registry"],
			TYPE_BOSS: ["Central Filing"],
		},
		"ashline_basin": {
			TYPE_RESOURCE: ["Cinder Flats", "Clinker Quarry"],
			TYPE_CACHE: ["Fallback Cache", "Buried Pallet Drop"],
			TYPE_EXPLORE: ["Burned Terrace Row", "The Standing Chimneys"],
			TYPE_WAREHOUSE: ["Tithe Store", "Ash Granary"],
			TYPE_CONVOY: ["Court Tribute Column"],
			TYPE_CAMP: ["Levy Encampment", "Smoke Line Post"],
			TYPE_INTEL: ["The Watchfires"],
			TYPE_ELITE: ["Court Blade Barrow"],
			TYPE_STORY: ["Into The Basin", "The Last Ledger"],
			TYPE_BOSS: ["The Magistrate's Kiln"],
		},
	}
	var rp: Dictionary = pools.get(region_id, pools["harbour_reach"])
	return rp.get(t, ["Unmarked Site"])

## Composition plan: [type, difficulty offset, count]
static func _plan() -> Array:
	return [
		[TYPE_RESOURCE, 1, 2],
		[TYPE_CACHE, 1, 2],
		[TYPE_EXPLORE, 1, 2],
		[TYPE_WAREHOUSE, 2, 2],
		[TYPE_CONVOY, 2, 1],
		[TYPE_CAMP, 3, 2],
		[TYPE_INTEL, 3, 1],
		[TYPE_ELITE, 4, 1],
		[TYPE_STORY, 3, 2],
		[TYPE_BOSS, 5, 1],
	]

static func _squad_for(t: String, difficulty: int) -> Array:
	match t:
		TYPE_RESOURCE, TYPE_CACHE:
			return ["grunt", "grunt"]
		TYPE_EXPLORE:
			return ["grunt", "runner"]
		TYPE_WAREHOUSE:
			return ["grunt", "shooter", "bruiser"]
		TYPE_CONVOY:
			return ["runner", "shooter", "grunt", "bruiser"]
		TYPE_CAMP:
			return ["grunt", "grunt", "shooter", "medic"]
		TYPE_INTEL:
			return ["shooter", "shooter", "runner", "medic"]
		TYPE_ELITE:
			return ["elite", "shooter", "bruiser", "medic"]
		TYPE_STORY:
			return ["grunt", "shooter", "bruiser", "medic", "runner"] if difficulty >= 4 else ["grunt", "shooter", "bruiser", "runner"]
		TYPE_BOSS:
			return ["boss", "bruiser", "shooter", "medic", "elite"]
		_:
			return ["grunt", "grunt"]

static func _rewards_for(t: String, region: Dictionary, difficulty: int) -> Dictionary:
	var prof: Dictionary = difficulty_profile(difficulty)
	var m: float = float(prof["mult"])
	var lvl: int = int(region["rec_level"])
	var scale: float = m * (1.0 + 0.16 * float(lvl - 1))
	var r: Dictionary = {}
	match t:
		TYPE_RESOURCE:
			for res in region["resources"]:
				r[res] = int(round(120.0 * scale))
		TYPE_CACHE:
			r["supplies"] = int(round(90.0 * scale))
			r["cash"] = int(round(110.0 * scale))
		TYPE_EXPLORE:
			r["intel"] = int(round(18.0 * scale))
			r["cash"] = int(round(70.0 * scale))
		TYPE_WAREHOUSE:
			r["materials"] = int(round(150.0 * scale))
			r["cash"] = int(round(90.0 * scale))
		TYPE_CONVOY:
			r["fuel"] = int(round(130.0 * scale))
			r["cash"] = int(round(160.0 * scale))
		TYPE_CAMP:
			r["cash"] = int(round(140.0 * scale))
			r["materials"] = int(round(80.0 * scale))
			r["supplies"] = int(round(60.0 * scale))
		TYPE_INTEL:
			r["intel"] = int(round(55.0 * scale))
			r["cash"] = int(round(80.0 * scale))
		TYPE_ELITE:
			r["cash"] = int(round(240.0 * scale))
			r["materials"] = int(round(160.0 * scale))
			r["intel"] = int(round(28.0 * scale))
		TYPE_STORY:
			r["cash"] = int(round(200.0 * scale))
			r["materials"] = int(round(140.0 * scale))
			r["supplies"] = int(round(110.0 * scale))
		TYPE_BOSS:
			r["cash"] = int(round(420.0 * scale))
			r["materials"] = int(round(300.0 * scale))
			r["fuel"] = int(round(220.0 * scale))
			r["intel"] = int(round(70.0 * scale))
	return r

## All locations for a region, deterministic.
static func locations_for(region_id: String) -> Array:
	var region: Dictionary = region_by_id(region_id)
	if region.is_empty():
		return []
	var rng := RandomNumberGenerator.new()
	rng.seed = int(region["seed"])
	var out: Array = []
	# Jittered grid so markers never overlap: 4 columns x 6 rows of cells.
	var cols := 4
	var rows := 6
	var cells: Array = []
	for rr in range(rows):
		for cc in range(cols):
			cells.append(Vector2(cc, rr))
	# deterministic shuffle
	for i in range(cells.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = cells[i]
		cells[i] = cells[j]
		cells[j] = tmp

	var idx := 0
	var name_counters: Dictionary = {}
	var base_level: int = int(region["rec_level"])
	for entry in _plan():
		var t: String = entry[0]
		var diff: int = int(entry[1])
		var count: int = int(entry[2])
		for k in range(count):
			var cell: Vector2 = cells[idx % cells.size()]
			# Boss always sits at the top of the map (deepest part of the region).
			if t == TYPE_BOSS:
				cell = Vector2(float(cols) * 0.5 - 0.5, 0.0)
			var cw := MAP_W / float(cols)
			var ch := MAP_H / float(rows)
			var pos := Vector2(
				cell.x * cw + cw * 0.5 + rng.randf_range(-cw * 0.22, cw * 0.22),
				cell.y * ch + ch * 0.5 + rng.randf_range(-ch * 0.18, ch * 0.18)
			)
			var pool: Array = _name_pool(region_id, t)
			var ci: int = int(name_counters.get(t, 0))
			name_counters[t] = ci + 1
			var lvl: int = base_level + (diff - 1) * 2 + k
			var prof: Dictionary = difficulty_profile(diff)
			var loc := {
				"id": "%s_%s_%d" % [region_id, t, k],
				"region": region_id,
				"name": String(pool[ci % pool.size()]),
				"type": t,
				"pos": pos,
				"level": lvl,
				"difficulty": diff,
				"energy": int(prof["energy"]),
				"travel": float(prof["travel"]),
				"enemies": _squad_for(t, diff),
				"rewards": _rewards_for(t, region, diff),
				"xp": int(round(26.0 * float(prof["mult"]) * (1.0 + 0.12 * float(lvl - 1)))),
				"player_xp": int(round(22.0 * float(prof["mult"]) * (1.0 + 0.06 * float(lvl - 1)))),
				"repeatable": t != TYPE_STORY and t != TYPE_BOSS,
				"reveals": 2.4 if t == TYPE_INTEL else (1.8 if t == TYPE_EXPLORE else 1.1),
				"faction": region["faction"],
				"story_index": ci if t == TYPE_STORY else -1,
			}
			out.append(loc)
			idx += 1
	return out

static func all_locations() -> Dictionary:
	var d: Dictionary = {}
	for r in regions():
		for loc in locations_for(String(r["id"])):
			d[loc["id"]] = loc
	return d
