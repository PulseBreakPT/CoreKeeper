extends Node
## Story / daily / weekly missions, achievements and the daily login ladder.
## Counters live in three scopes so a daily reset never touches lifetime totals.

signal progress_changed()
signal mission_completed(mission_id: String)
signal mission_claimed(mission_id: String, reward: Dictionary)
signal claimable_count_changed(count: int)

var total: Dictionary = {}
var daily: Dictionary = {}
var weekly: Dictionary = {}
var claimed: Dictionary = {}          ## mission_id -> true (story/achievements, permanent)
var claimed_period: Dictionary = {}   ## mission_id -> true (daily/weekly, cleared on reset)
var daily_reset_at: float = 0.0
var weekly_reset_at: float = 0.0
var login_streak: int = 0
var login_day: int = -1
var login_pending: bool = false
var _last_claimable := -1

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func reset_new_game() -> void:
	total = {}
	daily = {}
	weekly = {}
	claimed = {}
	claimed_period = {}
	var now := Time.get_unix_time_from_system()
	daily_reset_at = _next_day(now)
	weekly_reset_at = _next_week(now)
	login_streak = 0
	login_day = -1
	login_pending = true
	progress_changed.emit()

static func _day_index(unix: float) -> int:
	return int(floor(unix / 86400.0))

static func _next_day(unix: float) -> float:
	return float(_day_index(unix) + 1) * 86400.0

static func _next_week(unix: float) -> float:
	# Unix epoch day 0 was a Thursday; align weekly resets to Monday 00:00 UTC.
	var d := _day_index(unix)
	var since_monday := ((d - 4) % 7 + 7) % 7
	return float(d - since_monday + 7) * 86400.0

func check_periods(now: float = -1.0) -> Dictionary:
	if now < 0.0:
		now = Time.get_unix_time_from_system()
	var out := {"daily": false, "weekly": false}
	if now >= daily_reset_at:
		daily = {}
		for m in GameData.MissionsData.daily():
			claimed_period.erase(String(m["id"]))
		daily_reset_at = _next_day(now)
		out["daily"] = true
	if now >= weekly_reset_at:
		weekly = {}
		for m in GameData.MissionsData.weekly():
			claimed_period.erase(String(m["id"]))
		weekly_reset_at = _next_week(now)
		out["weekly"] = true
	var today := _day_index(now)
	if today != login_day:
		if login_day >= 0 and today == login_day + 1:
			login_streak += 1
		elif login_day >= 0:
			login_streak = 0
		login_day = today
		login_pending = true
		out["login"] = true
	if out["daily"] or out["weekly"] or out.get("login", false):
		progress_changed.emit()
		SaveManager.mark_dirty()
	return out

# ---- Counters -----------------------------------------------------------

func track(key: String, amount: int = 1) -> void:
	if amount == 0:
		return
	total[key] = int(total.get(key, 0)) + amount
	daily[key] = int(daily.get(key, 0)) + amount
	weekly[key] = int(weekly.get(key, 0)) + amount
	_after_change()

func track_set(key: String, value: int) -> void:
	total[key] = value
	daily[key] = value
	weekly[key] = value
	_after_change()

func track_max(key: String, value: int) -> void:
	if value > int(total.get(key, 0)):
		total[key] = value
	if value > int(daily.get(key, 0)):
		daily[key] = value
	if value > int(weekly.get(key, 0)):
		weekly[key] = value
	_after_change()

func _after_change() -> void:
	progress_changed.emit()
	var c := claimable_count()
	if c != _last_claimable:
		_last_claimable = c
		claimable_count_changed.emit(c)
	SaveManager.mark_dirty()

func counter(scope: String, key: String) -> int:
	match scope:
		GameData.MissionsData.CAT_DAILY: return int(daily.get(key, 0))
		GameData.MissionsData.CAT_WEEKLY: return int(weekly.get(key, 0))
		_: return int(total.get(key, 0))

## Live metrics that are read rather than counted.
func _live_value(key: String) -> int:
	match key:
		"roster_size": return CharacterManager.roster_size()
		"regions_unlocked": return MapManager.unlocked_count()
		"teams_unlocked": return SquadManager.unlocked_count()
		"squad_power": return SquadManager.best_power()
		"locations_discovered_live": return MapManager.discovered_count()
		_: return -1

func progress_of(mission: Dictionary, scope: String) -> int:
	var key := String(mission["objective"]["key"])
	var live := _live_value(key)
	if live >= 0:
		return live
	return counter(scope, key)

func target_of(mission: Dictionary) -> int:
	return int(mission["objective"]["target"])

func is_complete(mission: Dictionary, scope: String) -> bool:
	return progress_of(mission, scope) >= target_of(mission)

func is_claimed(mission_id: String, scope: String) -> bool:
	if scope == GameData.MissionsData.CAT_DAILY or scope == GameData.MissionsData.CAT_WEEKLY:
		return bool(claimed_period.get(mission_id, false))
	return bool(claimed.get(mission_id, false))

## Story missions unlock in order.
func is_available(mission: Dictionary, scope: String) -> bool:
	if scope != GameData.MissionsData.CAT_STORY:
		return true
	var list := GameData.MissionsData.story()
	for m in list:
		if String(m["id"]) == String(mission["id"]):
			return true
		if not is_claimed(String(m["id"]), scope):
			return false
	return true

func can_claim(mission: Dictionary, scope: String) -> bool:
	if is_claimed(String(mission["id"]), scope):
		return false
	if not is_available(mission, scope):
		return false
	return is_complete(mission, scope)

func claim(mission_id: String, scope: String) -> Dictionary:
	var mission := GameData.MissionsData.lookup(mission_id)
	if mission.is_empty() or not can_claim(mission, scope):
		return {}
	if scope == GameData.MissionsData.CAT_DAILY or scope == GameData.MissionsData.CAT_WEEKLY:
		claimed_period[mission_id] = true
	else:
		claimed[mission_id] = true
	var granted := LootManager.grant_simple(mission["reward"])
	mission_claimed.emit(mission_id, mission["reward"])
	_after_change()
	return granted

func claimable_count() -> int:
	var n := 0
	for scope in GameData.MissionsData.all_by_category().keys():
		for m in GameData.MissionsData.all_by_category()[scope]:
			if can_claim(m, String(scope)):
				n += 1
	if login_pending:
		n += 1
	return n

func claimable_in(scope: String) -> int:
	var n := 0
	for m in GameData.MissionsData.all_by_category().get(scope, []):
		if can_claim(m, scope):
			n += 1
	return n

func claim_all(scope: String) -> Array:
	var got: Array = []
	for m in GameData.MissionsData.all_by_category().get(scope, []):
		if can_claim(m, scope):
			var r := claim(String(m["id"]), scope)
			if not r.is_empty():
				got.append({"mission": m, "granted": r})
	return got

# ---- Daily login --------------------------------------------------------

func login_reward() -> Dictionary:
	var ladder := GameData.MissionsData.login_rewards()
	return ladder[login_streak % ladder.size()]

func claim_login() -> Dictionary:
	if not login_pending:
		return {}
	login_pending = false
	var r := LootManager.grant_simple(login_reward())
	_after_change()
	return r

func seconds_to_daily_reset() -> float:
	return maxf(daily_reset_at - Time.get_unix_time_from_system(), 0.0)

func seconds_to_weekly_reset() -> float:
	return maxf(weekly_reset_at - Time.get_unix_time_from_system(), 0.0)

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {
		"total": total.duplicate(), "daily": daily.duplicate(), "weekly": weekly.duplicate(),
		"claimed": claimed.duplicate(), "claimed_period": claimed_period.duplicate(),
		"daily_reset_at": daily_reset_at, "weekly_reset_at": weekly_reset_at,
		"login_streak": login_streak, "login_day": login_day, "login_pending": login_pending,
	}

func load_state(d: Dictionary) -> void:
	total = _ints(d.get("total", {}))
	daily = _ints(d.get("daily", {}))
	weekly = _ints(d.get("weekly", {}))
	claimed = {}
	var c = d.get("claimed", {})
	if typeof(c) == TYPE_DICTIONARY:
		for k in c.keys():
			claimed[String(k)] = true
	claimed_period = {}
	var cp = d.get("claimed_period", {})
	if typeof(cp) == TYPE_DICTIONARY:
		for k in cp.keys():
			claimed_period[String(k)] = true
	var now := Time.get_unix_time_from_system()
	daily_reset_at = float(d.get("daily_reset_at", _next_day(now)))
	weekly_reset_at = float(d.get("weekly_reset_at", _next_week(now)))
	login_streak = int(d.get("login_streak", 0))
	login_day = int(d.get("login_day", -1))
	login_pending = bool(d.get("login_pending", true))
	progress_changed.emit()

static func _ints(src) -> Dictionary:
	var out: Dictionary = {}
	if typeof(src) == TYPE_DICTIONARY:
		for k in src.keys():
			out[String(k)] = int(src[k])
	return out
