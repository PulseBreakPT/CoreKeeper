extends RefCounted
## Temporary single-player map events. EventManager spawns and expires these.

static func templates() -> Array:
	return [
		{"id": "abandoned_convoy", "name": "Abandoned Convoy", "weight": 20,
		 "blurb": "Someone left in a hurry. The trailers are still loaded.",
		 "lifetime": 900.0, "difficulty": 2, "color": "#e0762e",
		 "enemies": ["runner", "grunt", "shooter"],
		 "rewards": {"fuel": 420, "materials": 320, "cash": 260}},
		{"id": "supply_drop", "name": "Supply Drop", "weight": 18,
		 "blurb": "A pallet came down on the wrong side of the line.",
		 "lifetime": 720.0, "difficulty": 1, "color": "#6fd0ff",
		 "enemies": ["grunt", "grunt"],
		 "rewards": {"supplies": 520, "cash": 300}},
		{"id": "distress_signal", "name": "Distress Signal", "weight": 14,
		 "blurb": "An old frequency, a repeating sequence, and a location that should be empty.",
		 "lifetime": 600.0, "difficulty": 3, "color": "#ff6a3d",
		 "enemies": ["shooter", "bruiser", "medic", "grunt"],
		 "rewards": {"cash": 700, "intel": 90}, "item_pool": ["a_medweave", "c_stimpack"]},
		{"id": "rare_target", "name": "Rare Target", "weight": 10,
		 "blurb": "A name off the Ledger is moving through the area, briefly and badly guarded.",
		 "lifetime": 480.0, "difficulty": 4, "color": "#ff3d7a",
		 "enemies": ["elite", "shooter", "runner", "medic"],
		 "rewards": {"cash": 1400, "intel": 180, "tokens": 4}, "item_pool": ["w_arcwelder", "a_ghostshell", "c_deadhand"]},
		{"id": "hidden_cache", "name": "Hidden Cache", "weight": 16,
		 "blurb": "Marked on an old survey nobody bothered to destroy.",
		 "lifetime": 1080.0, "difficulty": 2, "color": "#c9a24a",
		 "enemies": ["grunt", "runner"],
		 "rewards": {"materials": 600, "cash": 380}, "item_pool": ["c_coldiron", "c_plating"]},
		{"id": "enemy_patrol", "name": "Enemy Patrol", "weight": 16,
		 "blurb": "They are sweeping the district on a fixed route. Predictable is exploitable.",
		 "lifetime": 540.0, "difficulty": 3, "color": "#ff5b5b",
		 "enemies": ["grunt", "grunt", "shooter", "bruiser"],
		 "rewards": {"cash": 620, "supplies": 340, "materials": 220}},
		{"id": "black_market", "name": "Black Market Shipment", "weight": 6,
		 "blurb": "A crate that three organisations are pretending not to know about.",
		 "lifetime": 420.0, "difficulty": 5, "color": "#b46bff",
		 "enemies": ["elite", "elite", "bruiser", "shooter", "medic"],
		 "rewards": {"cash": 2600, "intel": 320, "tokens": 10}, "item_pool": ["w_blacksale", "w_quietman", "a_ceramic"]},
	]

static func by_id(id: String) -> Dictionary:
	for t in templates():
		if t["id"] == id:
			return t
	return {}
