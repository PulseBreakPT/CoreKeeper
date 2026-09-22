extends Node
## Reward rolls. Difficulty and target type decide how much drops and how good it is.

signal loot_granted(bundle: Dictionary)

var _rng := RandomNumberGenerator.new()
var last_bundle: Dictionary = {}
var lifetime_items: int = 0

func _ready() -> void:
	_rng.randomize()

## rarity weights per difficulty tier
func _rarity_weights(difficulty: int, boss: bool) -> Dictionary:
	var w := {"Common": 60.0, "Rare": 28.0, "Epic": 10.0, "Legendary": 2.0}
	var d := float(maxi(difficulty, 1))
	w["Common"] = maxf(70.0 - 13.0 * d, 8.0)
	w["Rare"] = 24.0 + 3.0 * d
	w["Epic"] = 4.0 + 5.0 * d
	w["Legendary"] = 0.4 + 1.6 * d
	if boss:
		w["Common"] = 0.0
		w["Rare"] = 30.0
		w["Epic"] = 50.0
		w["Legendary"] = 20.0
	return w

func _roll_rarity(difficulty: int, boss: bool) -> String:
	var w := _rarity_weights(difficulty, boss)
	var total := 0.0
	for v in w.values():
		total += float(v)
	var r := _rng.randf() * total
	for k in ["Legendary", "Epic", "Rare", "Common"]:
		r -= float(w[k])
		if r <= 0.0:
			return String(k)
	return "Common"

func _random_item(difficulty: int, boss: bool, pool: Array = []) -> String:
	if not pool.is_empty():
		return String(pool[_rng.randi_range(0, pool.size() - 1)])
	for attempt in range(4):
		var rarity := _roll_rarity(difficulty, boss)
		var ids: Array = GameData.ItemsData.by_rarity(rarity)
		if not ids.is_empty():
			return String(ids[_rng.randi_range(0, ids.size() - 1)])
	return "w_scrapper"

func drop_chance(difficulty: int, type_id: String) -> float:
	var base := 0.16 + 0.10 * float(difficulty)
	match type_id:
		GameData.RegionsData.TYPE_WAREHOUSE: base += 0.16
		GameData.RegionsData.TYPE_ELITE: base += 0.24
		GameData.RegionsData.TYPE_STORY: base += 0.20
		GameData.RegionsData.TYPE_BOSS: base = 1.0
		GameData.RegionsData.TYPE_RESOURCE: base -= 0.08
	return clampf(base, 0.05, 1.0)

## Builds the reward bundle for a finished engagement.
func roll_rewards(info: Dictionary, first_clear: bool) -> Dictionary:
	var difficulty := int(info.get("difficulty", 1))
	var type_id := String(info.get("type", "npc_camp"))
	var boss := type_id == GameData.RegionsData.TYPE_BOSS
	var resources: Dictionary = {}
	var base: Dictionary = info.get("rewards", {})
	var mult := 1.0
	if first_clear:
		mult = 2.0
	for k in base.keys():
		var v := float(base[k]) * mult * _rng.randf_range(0.9, 1.15)
		resources[k] = maxi(int(round(v)), 1)

	var items: Array = []
	var pool: Array = info.get("item_pool", [])
	var chance := drop_chance(difficulty, type_id)
	if _rng.randf() < chance:
		items.append(_random_item(difficulty, boss, pool))
	if boss:
		items.append(_random_item(difficulty, true, pool))
	if first_clear and items.is_empty():
		items.append(_random_item(difficulty, false, pool))
	if difficulty >= 4 and _rng.randf() < 0.35:
		items.append(_random_item(difficulty, false, pool))

	var tokens := 0
	if boss:
		tokens += 8 + difficulty
	if first_clear:
		tokens += 3
	if difficulty >= 4 and _rng.randf() < 0.4:
		tokens += 2
	if tokens > 0:
		resources["tokens"] = int(resources.get("tokens", 0)) + tokens

	return {
		"resources": resources,
		"items": items,
		"first_clear": first_clear,
		"character_xp": int(info.get("xp", 0)),
		"player_xp": int(info.get("player_xp", 0)),
	}

## Puts a bundle into the wallet and inventory. Returns what actually landed.
func grant(bundle: Dictionary) -> Dictionary:
	var landed := ResourceManager.add_many(bundle.get("resources", {}), "loot")
	var got_items: Array = []
	for iid in bundle.get("items", []):
		if GameData.items.has(String(iid)):
			CharacterManager.add_item(String(iid), 1)
			got_items.append(String(iid))
			lifetime_items += 1
	last_bundle = {"resources": landed, "items": got_items}
	loot_granted.emit(last_bundle)
	SaveManager.mark_dirty()
	return last_bundle

## Used by missions, login rewards and the dev menu.
func grant_simple(d: Dictionary) -> Dictionary:
	var res: Dictionary = {}
	for k in d.keys():
		if GameData.RESOURCES.has(String(k)):
			res[k] = int(d[k])
	var bundle := {"resources": res, "items": d.get("items", [])}
	var out := grant(bundle)
	if d.has("player_xp"):
		GameManager.add_player_xp(int(d["player_xp"]))
		out["player_xp"] = int(d["player_xp"])
	return out

func save_state() -> Dictionary:
	return {"lifetime_items": lifetime_items}

func load_state(d: Dictionary) -> void:
	lifetime_items = int(d.get("lifetime_items", 0))
