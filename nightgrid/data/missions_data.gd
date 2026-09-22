extends RefCounted
## Mission / achievement definitions. Progress counters live in MissionManager.

const CAT_STORY := "story"
const CAT_DAILY := "daily"
const CAT_WEEKLY := "weekly"
const CAT_ACHIEVEMENT := "achievement"

static func categories() -> Array:
	return [CAT_STORY, CAT_DAILY, CAT_WEEKLY, CAT_ACHIEVEMENT]

static func category_label(c: String) -> String:
	match c:
		CAT_STORY: return "STORY"
		CAT_DAILY: return "DAILY"
		CAT_WEEKLY: return "WEEKLY"
		_: return "ACHIEVEMENTS"

static func story() -> Array:
	return [
		{"id": "s01", "name": "Lights On", "desc": "Collect production from any building.",
		 "objective": {"key": "resources_collected", "target": 1},
		 "reward": {"cash": 300, "materials": 200, "player_xp": 30}},
		{"id": "s02", "name": "Raise The Roof", "desc": "Upgrade any building to level 2.",
		 "objective": {"key": "buildings_upgraded", "target": 1},
		 "reward": {"cash": 400, "materials": 250, "player_xp": 40}},
		{"id": "s03", "name": "First Job", "desc": "Complete one expedition.",
		 "objective": {"key": "expeditions_completed", "target": 1},
		 "reward": {"cash": 500, "supplies": 200, "player_xp": 60, "items": ["c_optic"]}},
		{"id": "s04", "name": "Eyes Open", "desc": "Discover 3 locations on the map.",
		 "objective": {"key": "locations_discovered", "target": 3},
		 "reward": {"intel": 120, "cash": 400, "player_xp": 60}},
		{"id": "s05", "name": "Crew Of Five", "desc": "Recruit until the roster holds 5 operatives.",
		 "objective": {"key": "roster_size", "target": 5},
		 "reward": {"cash": 800, "supplies": 300, "player_xp": 90}},
		{"id": "s06", "name": "Sharpen Up", "desc": "Promote an operative to level 5.",
		 "objective": {"key": "character_level_reached", "target": 5},
		 "reward": {"cash": 900, "materials": 500, "player_xp": 110, "items": ["c_ledger"]}},
		{"id": "s07", "name": "Hold The Reach", "desc": "Defeat the Harbour Reach boss.",
		 "objective": {"key": "bosses_defeated", "target": 1},
		 "reward": {"cash": 1600, "materials": 900, "tokens": 15, "player_xp": 200}},
		{"id": "s08", "name": "Expansion", "desc": "Unlock a second region.",
		 "objective": {"key": "regions_unlocked", "target": 2},
		 "reward": {"cash": 2000, "intel": 250, "tokens": 20, "player_xp": 260}},
		{"id": "s09", "name": "Second Crew", "desc": "Unlock Team 2 by raising the Garage to level 3.",
		 "objective": {"key": "teams_unlocked", "target": 2},
		 "reward": {"cash": 2400, "fuel": 700, "player_xp": 300}},
		{"id": "s10", "name": "Deep Work", "desc": "Win 25 engagements.",
		 "objective": {"key": "combats_won", "target": 25},
		 "reward": {"cash": 3200, "materials": 1400, "tokens": 25, "player_xp": 420, "items": ["w_quietman"]}},
	]

static func daily() -> Array:
	return [
		{"id": "d01", "name": "Shift Work", "desc": "Complete 3 expeditions.",
		 "objective": {"key": "expeditions_completed", "target": 3},
		 "reward": {"cash": 600, "supplies": 220, "player_xp": 50}},
		{"id": "d02", "name": "Maintenance", "desc": "Upgrade 2 buildings.",
		 "objective": {"key": "buildings_upgraded", "target": 2},
		 "reward": {"materials": 450, "cash": 350, "player_xp": 45}},
		{"id": "d03", "name": "Body Count", "desc": "Defeat 10 enemies.",
		 "objective": {"key": "enemies_defeated", "target": 10},
		 "reward": {"cash": 450, "fuel": 260, "player_xp": 40}},
		{"id": "d04", "name": "Stockpile", "desc": "Collect 1000 Materials.",
		 "objective": {"key": "collected_materials", "target": 1000},
		 "reward": {"cash": 520, "supplies": 180, "player_xp": 45}},
		{"id": "d05", "name": "Recon", "desc": "Discover 3 locations.",
		 "objective": {"key": "locations_discovered", "target": 3},
		 "reward": {"intel": 90, "cash": 380, "player_xp": 40}},
		{"id": "d06", "name": "Sparring", "desc": "Promote any operative once.",
		 "objective": {"key": "characters_upgraded", "target": 1},
		 "reward": {"cash": 400, "materials": 300, "player_xp": 35}},
	]

static func weekly() -> Array:
	return [
		{"id": "w01", "name": "Full Week", "desc": "Complete 15 expeditions.",
		 "objective": {"key": "expeditions_completed", "target": 15},
		 "reward": {"cash": 2600, "materials": 1200, "tokens": 10, "player_xp": 220}},
		{"id": "w02", "name": "Construction Drive", "desc": "Upgrade 8 buildings.",
		 "objective": {"key": "buildings_upgraded", "target": 8},
		 "reward": {"cash": 2400, "fuel": 1100, "tokens": 8, "player_xp": 200}},
		{"id": "w03", "name": "Clean Sweep", "desc": "Defeat 80 enemies.",
		 "objective": {"key": "enemies_defeated", "target": 80},
		 "reward": {"cash": 2800, "supplies": 900, "tokens": 8, "player_xp": 240}},
		{"id": "w04", "name": "Trophy Hunt", "desc": "Defeat 1 Boss.",
		 "objective": {"key": "bosses_defeated", "target": 1},
		 "reward": {"cash": 3200, "intel": 400, "tokens": 14, "player_xp": 300}},
		{"id": "w05", "name": "Cartography", "desc": "Discover 12 locations.",
		 "objective": {"key": "locations_discovered", "target": 12},
		 "reward": {"intel": 520, "cash": 2000, "tokens": 6, "player_xp": 200}},
	]

static func achievements() -> Array:
	return [
		{"id": "a01", "name": "Groundbreaking", "desc": "Upgrade buildings 5 times.",
		 "objective": {"key": "buildings_upgraded", "target": 5},
		 "reward": {"cash": 700, "materials": 400, "player_xp": 60}},
		{"id": "a02", "name": "Contractor", "desc": "Upgrade buildings 25 times.",
		 "objective": {"key": "buildings_upgraded", "target": 25},
		 "reward": {"cash": 2600, "materials": 1600, "tokens": 10, "player_xp": 220}},
		{"id": "a03", "name": "Operator", "desc": "Complete 10 expeditions.",
		 "objective": {"key": "expeditions_completed", "target": 10},
		 "reward": {"cash": 1100, "supplies": 500, "player_xp": 100}},
		{"id": "a04", "name": "Veteran Handler", "desc": "Complete 50 expeditions.",
		 "objective": {"key": "expeditions_completed", "target": 50},
		 "reward": {"cash": 4200, "materials": 2200, "tokens": 20, "player_xp": 420}},
		{"id": "a05", "name": "Blooded", "desc": "Defeat 50 enemies.",
		 "objective": {"key": "enemies_defeated", "target": 50},
		 "reward": {"cash": 1200, "fuel": 700, "player_xp": 110}},
		{"id": "a06", "name": "Butcher's Bill", "desc": "Defeat 250 enemies.",
		 "objective": {"key": "enemies_defeated", "target": 250},
		 "reward": {"cash": 4800, "supplies": 2000, "tokens": 22, "player_xp": 480}},
		{"id": "a07", "name": "Cartographer", "desc": "Discover 20 locations.",
		 "objective": {"key": "locations_discovered", "target": 20},
		 "reward": {"intel": 420, "cash": 1400, "player_xp": 150}},
		{"id": "a08", "name": "Headhunter", "desc": "Defeat 3 bosses.",
		 "objective": {"key": "bosses_defeated", "target": 3},
		 "reward": {"cash": 5200, "intel": 700, "tokens": 30, "player_xp": 560, "items": ["c_coldiron"]}},
		{"id": "a09", "name": "Quartermaster", "desc": "Collect 20000 Materials.",
		 "objective": {"key": "collected_materials", "target": 20000},
		 "reward": {"cash": 2600, "materials": 1400, "tokens": 12, "player_xp": 210}},
		{"id": "a10", "name": "Full Roster", "desc": "Hold 8 operatives.",
		 "objective": {"key": "roster_size", "target": 8},
		 "reward": {"cash": 3000, "supplies": 1400, "tokens": 15, "player_xp": 260}},
		{"id": "a11", "name": "Warlord", "desc": "Reach a Squad Power of 6000.",
		 "objective": {"key": "squad_power", "target": 6000},
		 "reward": {"cash": 5000, "materials": 2400, "tokens": 25, "player_xp": 500}},
		{"id": "a12", "name": "The Whole Map", "desc": "Unlock all 5 regions.",
		 "objective": {"key": "regions_unlocked", "target": 5},
		 "reward": {"cash": 9000, "intel": 1500, "tokens": 50, "player_xp": 900, "items": ["a_bulwark"]}},
	]

static func all_by_category() -> Dictionary:
	return {
		CAT_STORY: story(),
		CAT_DAILY: daily(),
		CAT_WEEKLY: weekly(),
		CAT_ACHIEVEMENT: achievements(),
	}

static func lookup(id: String) -> Dictionary:
	for c in all_by_category().values():
		for m in c:
			if m["id"] == id:
				return m
	return {}

## Daily login ladder, 7 days then repeats.
static func login_rewards() -> Array:
	return [
		{"cash": 500, "materials": 300},
		{"fuel": 400, "supplies": 250},
		{"cash": 900, "intel": 80},
		{"materials": 800, "supplies": 400},
		{"cash": 1400, "tokens": 5},
		{"intel": 200, "fuel": 900},
		{"cash": 2500, "tokens": 12, "items": ["c_plating"]},
	]
