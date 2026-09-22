extends Node
## Wallet + energy. Nothing else touches the numbers directly.

signal changed(resource_id: String, value: int)
signal energy_changed(value: float, maximum: int)
signal capacity_changed()

const BASE_ENERGY_MAX := 100
const BASE_ENERGY_SECONDS := 24.0   ## seconds per energy point at Medical Center level 0

var amounts: Dictionary = {}
var energy: float = 100.0
var energy_max: int = BASE_ENERGY_MAX
var _energy_last: float = 0.0

func _ready() -> void:
	for r in GameData.RESOURCES:
		amounts[r] = 0
	_energy_last = Time.get_unix_time_from_system()

func reset_new_game() -> void:
	amounts = {"cash": 1200, "materials": 900, "fuel": 400, "intel": 60, "supplies": 350, "tokens": 25}
	energy = float(BASE_ENERGY_MAX)
	energy_max = BASE_ENERGY_MAX
	_energy_last = Time.get_unix_time_from_system()
	_emit_all()

func _emit_all() -> void:
	for r in GameData.RESOURCES:
		changed.emit(r, get_amount(r))
	energy_changed.emit(energy, energy_max)

func get_amount(res: String) -> int:
	return int(amounts.get(res, 0))

func capacity() -> Dictionary:
	var wl := BuildingManager.level_of("warehouse")
	return GameData.BuildingsData.storage_for_warehouse(wl)

func capacity_of(res: String) -> int:
	return int(capacity().get(res, 99999))

func is_full(res: String) -> bool:
	return get_amount(res) >= capacity_of(res)

## Adds and returns what actually landed in the wallet (capped).
func add(res: String, qty: int, _reason: String = "") -> int:
	if qty <= 0:
		return 0
	var cap := capacity_of(res)
	var before := get_amount(res)
	var after := mini(before + qty, cap)
	amounts[res] = after
	var gained := after - before
	if gained != 0:
		changed.emit(res, after)
		SaveManager.mark_dirty()
	return gained

func add_many(bundle: Dictionary, reason: String = "") -> Dictionary:
	var landed: Dictionary = {}
	for k in bundle.keys():
		if not GameData.RESOURCES.has(k):
			continue
		var g := add(String(k), int(bundle[k]), reason)
		if g > 0:
			landed[k] = g
	return landed

func can_afford(cost: Dictionary) -> bool:
	for k in cost.keys():
		if not GameData.RESOURCES.has(k):
			continue
		if get_amount(String(k)) < int(cost[k]):
			return false
	return true

func missing(cost: Dictionary) -> Dictionary:
	var out: Dictionary = {}
	for k in cost.keys():
		if not GameData.RESOURCES.has(k):
			continue
		var need := int(cost[k]) - get_amount(String(k))
		if need > 0:
			out[k] = need
	return out

func spend(cost: Dictionary) -> bool:
	if not can_afford(cost):
		return false
	for k in cost.keys():
		if not GameData.RESOURCES.has(k):
			continue
		amounts[k] = get_amount(String(k)) - int(cost[k])
		changed.emit(String(k), int(amounts[k]))
	SaveManager.mark_dirty()
	return true

# ---- Energy -------------------------------------------------------------

func energy_seconds_per_point() -> float:
	var med := BuildingManager.level_of("medical_center")
	var factor := maxf(0.35, 1.0 - 0.04 * float(med))
	return BASE_ENERGY_SECONDS * factor

func energy_max_value() -> int:
	return BASE_ENERGY_MAX + 5 * BuildingManager.level_of("headquarters")

func refresh_energy(now: float = -1.0) -> float:
	if now < 0.0:
		now = Time.get_unix_time_from_system()
	energy_max = energy_max_value()
	if GameManager.dev_infinite_energy:
		energy = float(energy_max)
		_energy_last = now
		energy_changed.emit(energy, energy_max)
		return 0.0
	var dt := maxf(now - _energy_last, 0.0)
	if dt <= 0.0:
		return 0.0
	var gained := dt / energy_seconds_per_point()
	var before := energy
	energy = minf(energy + gained, float(energy_max))
	_energy_last = now
	if not is_equal_approx(before, energy):
		energy_changed.emit(energy, energy_max)
	return energy - before

func seconds_to_full_energy() -> float:
	if energy >= float(energy_max):
		return 0.0
	return (float(energy_max) - energy) * energy_seconds_per_point()

func has_energy(cost: int) -> bool:
	if GameManager.dev_infinite_energy:
		return true
	return energy >= float(cost)

func spend_energy(cost: int) -> bool:
	if GameManager.dev_infinite_energy:
		return true
	if energy < float(cost):
		return false
	energy -= float(cost)
	energy_changed.emit(energy, energy_max)
	SaveManager.mark_dirty()
	return true

func grant_energy(v: float) -> void:
	energy = clampf(energy + v, 0.0, float(energy_max_value()))
	energy_changed.emit(energy, energy_max)
	SaveManager.mark_dirty()

# ---- Persistence --------------------------------------------------------

func save_state() -> Dictionary:
	return {"amounts": amounts.duplicate(), "energy": energy, "energy_last": _energy_last}

func load_state(d: Dictionary) -> void:
	var a = d.get("amounts", {})
	for r in GameData.RESOURCES:
		amounts[r] = int(a.get(r, 0)) if typeof(a) == TYPE_DICTIONARY else 0
	energy = float(d.get("energy", BASE_ENERGY_MAX))
	_energy_last = float(d.get("energy_last", Time.get_unix_time_from_system()))
	energy_max = energy_max_value()
	_emit_all()
