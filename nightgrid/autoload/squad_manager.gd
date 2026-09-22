extends Node
## Three teams of up to five operatives. A given operative sits in one team at most.

signal squads_changed()

const TEAM_COUNT := 3
const TEAM_SIZE := 5

var teams: Array = [[], [], []]

func reset_new_game() -> void:
	teams = [[], [], []]
	for id in CharacterManager.ids():
		if teams[0].size() < TEAM_SIZE:
			teams[0].append(id)
	squads_changed.emit()

func unlocked_count() -> int:
	return BuildingManager.teams_unlocked()

func is_unlocked(team: int) -> bool:
	return team >= 0 and team < unlocked_count()

func unlock_hint(team: int) -> String:
	if team == 1:
		return "Garage Lv.3"
	if team == 2:
		return "Garage Lv.6"
	return ""

func team_name(team: int) -> String:
	return "Team %d" % (team + 1)

func members(team: int) -> Array:
	if team < 0 or team >= TEAM_COUNT:
		return []
	var out: Array = []
	for id in teams[team]:
		if CharacterManager.has(String(id)):
			out.append(id)
	return out

func team_of(char_id: String) -> int:
	for i in range(TEAM_COUNT):
		if teams[i].has(char_id):
			return i
	return -1

func is_busy(team: int) -> bool:
	return ExpeditionManager.team_state(team) != ExpeditionManager.STATE_IDLE

func add_member(team: int, char_id: String) -> bool:
	if not is_unlocked(team) or is_busy(team):
		return false
	if not CharacterManager.has(char_id):
		return false
	if members(team).size() >= TEAM_SIZE:
		return false
	var cur := team_of(char_id)
	if cur == team:
		return false
	if cur >= 0:
		if is_busy(cur):
			return false
		teams[cur].erase(char_id)
	teams[team].append(char_id)
	squads_changed.emit()
	SaveManager.mark_dirty()
	return true

func remove_member(team: int, char_id: String) -> bool:
	if not is_unlocked(team) or is_busy(team):
		return false
	if not teams[team].has(char_id):
		return false
	teams[team].erase(char_id)
	squads_changed.emit()
	SaveManager.mark_dirty()
	return true

func toggle_member(team: int, char_id: String) -> bool:
	if teams[team].has(char_id):
		return remove_member(team, char_id)
	return add_member(team, char_id)

func power(team: int) -> int:
	var p := 0
	for id in members(team):
		p += CharacterManager.power(String(id))
	return p

func best_power() -> int:
	var best := 0
	for i in range(unlocked_count()):
		best = maxi(best, power(i))
	return best

## Fill a team with the strongest unassigned operatives.
func auto_fill(team: int) -> int:
	if not is_unlocked(team) or is_busy(team):
		return 0
	var pool: Array = []
	for id in CharacterManager.ids():
		if team_of(String(id)) == -1:
			pool.append(id)
	pool.sort_custom(func(a, b): return CharacterManager.power(String(a)) > CharacterManager.power(String(b)))
	var added := 0
	for id in pool:
		if members(team).size() >= TEAM_SIZE:
			break
		if add_member(team, String(id)):
			added += 1
	return added

func prune() -> void:
	for i in range(TEAM_COUNT):
		var keep: Array = []
		for id in teams[i]:
			if CharacterManager.has(String(id)) and not keep.has(id):
				keep.append(id)
		teams[i] = keep
	squads_changed.emit()

func save_state() -> Dictionary:
	return {"teams": teams.duplicate(true)}

func load_state(d: Dictionary) -> void:
	teams = [[], [], []]
	var t = d.get("teams", [])
	if typeof(t) == TYPE_ARRAY:
		for i in range(mini(t.size(), TEAM_COUNT)):
			if typeof(t[i]) == TYPE_ARRAY:
				for id in t[i]:
					teams[i].append(String(id))
	prune()
