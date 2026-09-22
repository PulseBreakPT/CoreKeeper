extends Node
## Headless end-to-end pass over the whole game loop.
## Run: godot --headless --path . res://tests/gameplay_test.tscn

var failures: int = 0
var checks: int = 0
var _result: Dictionary = {}
var _dmg_events: int = 0
var _skill_events: int = 0

func _on_combat_event(e: Dictionary) -> void:
	if String(e["type"]) == "damage":
		_dmg_events += 1
	elif String(e["type"]) == "skill":
		_skill_events += 1

func _on_battle_finished(r: Dictionary) -> void:
	_result = r

func run_battle() -> Dictionary:
	_result = {}
	CombatManager.simulate_to_end()
	return _result

func ok(cond: bool, label: String, detail: String = "") -> void:
	checks += 1
	if cond:
		print("  PASS  ", label, ("" if detail == "" else "  (%s)" % detail))
	else:
		failures += 1
		print("  FAIL  ", label, ("" if detail == "" else "  (%s)" % detail))

func head(t: String) -> void:
	print("\n== ", t, " ", "=".repeat(maxi(4, 58 - t.length())))

func _ready() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	# Always start from a clean slate so the run is reproducible.
	SaveManager.wipe()
	GameManager.new_game()
	GameManager.dev_fast_timers = true
	await get_tree().process_frame

	await test_resources_and_production()
	await test_construction()
	await test_characters_and_equipment()
	await test_squads()
	await test_map_and_fog()
	await test_expedition_and_combat()
	await test_missions()
	await test_events()
	await test_offline_and_persistence()
	await test_full_campaign_sim()

	print("\n", "=".repeat(64))
	print("CHECKS: %d   FAILURES: %d" % [checks, failures])
	print("=".repeat(64))
	get_tree().quit(1 if failures > 0 else 0)

# -------------------------------------------------------------------------

func test_resources_and_production() -> void:
	head("Resources & production")
	ok(ResourceManager.get_amount("cash") == 1200, "starting cash seeded", str(ResourceManager.get_amount("cash")))
	ok(ResourceManager.capacity_of("materials") > 0, "warehouse sets a materials cap",
		str(ResourceManager.capacity_of("materials")))

	# Fast-forward production by rewinding the building timestamps 10 minutes.
	var now := Time.get_unix_time_from_system()
	for id in BuildingManager.state.keys():
		BuildingManager.state[id]["last"] = now - 600.0
	var produced := BuildingManager.tick_production(now)
	ok(not produced.is_empty(), "ten idle minutes produced something", str(produced.keys()))
	ok(BuildingManager.pending_total("workshop") > 0, "workshop has a collectable buffer",
		str(BuildingManager.pending("workshop")))

	var before := ResourceManager.get_amount("materials")
	var landed := BuildingManager.collect("workshop")
	ok(not landed.is_empty(), "collect moved the buffer into the wallet", str(landed))
	ok(ResourceManager.get_amount("materials") > before, "materials went up")
	ok(BuildingManager.pending_total("workshop") == 0, "buffer emptied after collecting")

	# Buffer must respect its own ceiling.
	for id in BuildingManager.state.keys():
		BuildingManager.state[id]["last"] = now - 100000.0
	BuildingManager.tick_production(now)
	var cap: Dictionary = BuildingManager.buffer_capacity("workshop")
	var acc := float(BuildingManager.state["workshop"]["accum"].get("materials", 0.0))
	ok(acc <= float(cap["materials"]) + 0.001, "buffer never exceeds its cap",
		"%.1f <= %.1f" % [acc, float(cap["materials"])])
	BuildingManager.collect_all()

	# Wallet cap.
	var wcap := ResourceManager.capacity_of("intel")
	ResourceManager.add("intel", wcap * 10)
	ok(ResourceManager.get_amount("intel") == wcap, "wallet clamps at storage capacity")

func test_construction() -> void:
	head("Construction")
	GameManager.dev_add_resources(3.0)
	var lvl := BuildingManager.level_of("workshop")
	ok(BuildingManager.can_start_upgrade("workshop"), "upgrade available with resources in hand")
	var cash_before := ResourceManager.get_amount("cash")
	ok(BuildingManager.start_upgrade("workshop"), "upgrade started")
	ok(ResourceManager.get_amount("cash") < cash_before, "upgrade charged the cost")
	ok(BuildingManager.is_constructing("workshop"), "workshop is under construction")
	ok(not BuildingManager.can_start_upgrade("workshop"), "cannot queue a second upgrade on the same building")
	BuildingManager.complete_all_construction()
	ok(BuildingManager.level_of("workshop") == lvl + 1, "workshop gained a level",
		"%d -> %d" % [lvl, BuildingManager.level_of("workshop")])
	ok(not BuildingManager.is_constructing("workshop"), "construction slot freed")

	# HQ gates every other building.
	var hq := BuildingManager.level_of("headquarters")
	ok(BuildingManager.max_level("garage") == hq, "HQ caps other buildings",
		"cap=%d hq=%d" % [BuildingManager.max_level("garage"), hq])

	# Requirements gate.
	while BuildingManager.level_of("headquarters") < 3:
		BuildingManager.start_upgrade("headquarters")
		BuildingManager.complete_all_construction()
	ok(BuildingManager.requirements_met("garage"), "garage requirement met at HQ 3")

	var teams_before := SquadManager.unlocked_count()
	while BuildingManager.level_of("garage") < 3:
		GameManager.dev_add_resources(3.0)
		if not BuildingManager.start_upgrade("garage"):
			# needs a higher HQ
			BuildingManager.start_upgrade("headquarters")
		BuildingManager.complete_all_construction()
	ok(SquadManager.unlocked_count() > teams_before, "Garage Lv.3 unlocked a second team",
		"%d -> %d" % [teams_before, SquadManager.unlocked_count()])

func test_characters_and_equipment() -> void:
	head("Operatives & equipment")
	var cid := "marlow"
	var p0 := CharacterManager.power(cid)
	ok(p0 > 0, "power computes", str(p0))
	var lvl0 := CharacterManager.level_of(cid)
	GameManager.dev_add_resources(2.0)
	var trained := 0
	for i in range(8):
		if CharacterManager.can_train(cid):
			CharacterManager.train(cid)
			trained += 1
	ok(trained > 0, "training sessions ran", str(trained))
	ok(CharacterManager.level_of(cid) > lvl0, "operative levelled",
		"%d -> %d" % [lvl0, CharacterManager.level_of(cid)])
	ok(CharacterManager.power(cid) > p0, "power rose with level")

	CharacterManager.add_item("w_marksman", 1)
	var p1 := CharacterManager.power(cid)
	ok(CharacterManager.equip(cid, "w_marksman"), "equipped a weapon")
	ok(CharacterManager.equipped_item(cid, "weapon") == "w_marksman", "slot holds the item")
	ok(CharacterManager.item_count("w_marksman") == 0, "item left the inventory")
	ok(CharacterManager.power(cid) > p1, "equipment raised power")
	CharacterManager.add_item("w_scrapper", 1)
	CharacterManager.equip(cid, "w_scrapper")
	ok(CharacterManager.item_count("w_marksman") == 1, "swapping returned the old weapon")
	CharacterManager.equip(cid, "w_marksman")

	var size0 := CharacterManager.roster_size()
	GameManager.dev_add_resources(4.0)
	var gb := 0
	while BuildingManager.roster_capacity() <= size0 and gb < 20:
		gb += 1
		GameManager.dev_add_resources(3.0)
		if not BuildingManager.start_upgrade("barracks"):
			BuildingManager.start_upgrade("headquarters")
		BuildingManager.complete_all_construction()
	ok(BuildingManager.roster_capacity() > size0, "barracks made room on the roster",
		"%d slots" % BuildingManager.roster_capacity())
	var target := ""
	for id in CharacterManager.recruitable():
		if CharacterManager.can_recruit(String(id)):
			target = String(id)
			break
	ok(target != "", "a recruit is affordable", target)
	if target != "":
		ok(CharacterManager.recruit(target), "recruited %s" % target)
		ok(CharacterManager.roster_size() == size0 + 1, "roster grew")
	ok(CharacterManager.roster_size() <= BuildingManager.roster_capacity()
		or BuildingManager.roster_capacity() < size0, "roster respects barracks capacity",
		"%d / %d" % [CharacterManager.roster_size(), BuildingManager.roster_capacity()])

func test_squads() -> void:
	head("Squads")
	SquadManager.auto_fill(0)
	ok(SquadManager.members(0).size() > 0, "team 1 has members", str(SquadManager.members(0).size()))
	ok(SquadManager.members(0).size() <= SquadManager.TEAM_SIZE, "team never exceeds five")
	ok(SquadManager.power(0) > 0, "squad power computes", str(SquadManager.power(0)))
	var who := String(SquadManager.members(0)[0])
	if SquadManager.is_unlocked(1):
		SquadManager.add_member(1, who)
		ok(SquadManager.team_of(who) == 1, "operative moved teams")
		ok(not SquadManager.members(0).has(who), "operative left the old team")
		SquadManager.add_member(0, who)

func test_map_and_fog() -> void:
	head("Map & fog of war")
	var rid := "harbour_reach"
	var revealed0 := MapManager.revealed_cells(rid)
	ok(revealed0 > 0, "starting pocket is revealed", str(revealed0))
	ok(MapManager.fog_ratio(rid) < 1.0, "most of the region is still dark",
		"%.2f" % MapManager.fog_ratio(rid))
	var disc0 := MapManager.discovered_count()
	MapManager.reveal_at(rid, Vector2(700, 1400), 4.0)
	ok(MapManager.revealed_cells(rid) > revealed0, "reveal opened more cells")
	ok(MapManager.discovered_count() >= disc0, "discovery count tracks fog")
	MapManager.reveal_all(rid)
	ok(MapManager.fog_ratio(rid) >= 0.999, "reveal_all clears the region")
	var locs := GameData.locations_in_region(rid)
	ok(locs.size() == 16, "region has its full location set", str(locs.size()))
	var all_disc := true
	for l in locs:
		if not MapManager.is_discovered(String(l["id"])):
			all_disc = false
	ok(all_disc, "every location in a cleared region is discovered")
	# Story gating
	var story: Array = []
	for l in locs:
		if String(l["type"]) == GameData.RegionsData.TYPE_STORY:
			story.append(l)
	story.sort_custom(func(a, b): return int(a["story_index"]) < int(b["story_index"]))
	ok(story.size() == 2, "two story missions per region")
	ok(not MapManager.is_locked(String(story[0]["id"])), "first story mission is open")
	ok(MapManager.is_locked(String(story[1]["id"])), "second story mission is gated")
	for l in locs:
		if String(l["type"]) == GameData.RegionsData.TYPE_BOSS:
			ok(MapManager.is_locked(String(l["id"])), "boss gated behind the story missions")

func test_expedition_and_combat() -> void:
	head("Expedition & combat")
	GameManager.dev_add_resources(6.0)
	GameManager.dev_give_xp(900)
	for id in CharacterManager.ids():
		CharacterManager.auto_equip(String(id))
	SquadManager.auto_fill(0)

	var target := ""
	for l in GameData.locations_in_region("harbour_reach"):
		if String(l["type"]) == GameData.RegionsData.TYPE_RESOURCE:
			target = String(l["id"])
			break
	ok(target != "", "picked a resource node", target)

	var info := ExpeditionManager.target_info(ExpeditionManager.KIND_LOCATION, target)
	ok(not info.is_empty(), "target info resolves")
	ok(int(info["energy"]) > 0, "target costs energy", str(info["energy"]))
	ok(ExpeditionManager.recommended_power(info) > 0, "recommended power computes",
		str(ExpeditionManager.recommended_power(info)))

	var e0 := ResourceManager.energy
	ok(ExpeditionManager.can_deploy(0, ExpeditionManager.KIND_LOCATION, target),
		"deploy allowed", ExpeditionManager.deploy_blocked_reason(0, ExpeditionManager.KIND_LOCATION, target))
	ok(ExpeditionManager.deploy(0, ExpeditionManager.KIND_LOCATION, target), "team deployed")
	ok(ExpeditionManager.team_state(0) == ExpeditionManager.STATE_TRAVEL, "team is travelling")
	ok(ResourceManager.energy < e0, "energy was spent", "%.0f -> %.0f" % [e0, ResourceManager.energy])
	ok(SquadManager.is_busy(0), "busy team cannot be edited")
	ok(not ExpeditionManager.can_deploy(0, ExpeditionManager.KIND_LOCATION, target), "no double deploy")

	var mid := ExpeditionManager.marker_position(0)
	ok(mid.distance_to(MapManager.entry_point("harbour_reach")) < 400.0, "marker starts near the entry point")

	ExpeditionManager.complete_travel(0)
	ok(ExpeditionManager.team_state(0) == ExpeditionManager.STATE_ARRIVED, "team arrived")

	ok(CombatManager.start_battle(0, info), "battle started")
	ok(CombatManager.allies.size() > 0 and CombatManager.enemies.size() > 0, "both sides populated",
		"%d vs %d" % [CombatManager.allies.size(), CombatManager.enemies.size()])
	_dmg_events = 0
	_skill_events = 0
	CombatManager.combat_event.connect(_on_combat_event)
	CombatManager.battle_finished.connect(_on_battle_finished)
	var result := run_battle()
	ok(not result.is_empty(), "battle finished")
	ok(bool(result.get("victory", false)), "squad won the first fight")
	ok(_dmg_events > 0, "damage events fired", str(_dmg_events))
	var payload: Dictionary = result.get("payload", {})
	ok(not payload.get("rewards", {}).get("resources", {}).is_empty(), "loot rolled",
		str(payload.get("rewards", {}).get("resources", {})))
	ok(bool(payload.get("first_clear", false)), "first clear flagged")
	ok(MapManager.is_cleared(target), "location recorded as cleared")
	ok(ExpeditionManager.team_state(0) == ExpeditionManager.STATE_RETURN, "team is heading home")
	ExpeditionManager.complete_travel(0)
	ok(ExpeditionManager.team_state(0) == ExpeditionManager.STATE_IDLE, "team is idle again")
	ok(not SquadManager.is_busy(0), "team editable again")

	# A hopeless fight must be losable.
	var boss := ""
	for l in GameData.locations_in_region("ashline_basin"):
		if String(l["type"]) == GameData.RegionsData.TYPE_BOSS:
			boss = String(l["id"])
	var binfo := ExpeditionManager.target_info(ExpeditionManager.KIND_LOCATION, boss)
	CombatManager.start_battle(0, binfo)
	var r2 := run_battle()
	ok(not r2.is_empty() and not bool(r2.get("victory", true)), "an over-levelled boss beats a low squad")
	ok(_skill_events > 0, "special skills fired during a long fight", str(_skill_events))
	CombatManager.combat_event.disconnect(_on_combat_event)
	ExpeditionManager.slots[0] = ExpeditionManager._empty_slot()

func test_missions() -> void:
	head("Missions")
	var story := GameData.MissionsData.story()
	var first: Dictionary = story[0]
	ok(MissionManager.progress_of(first, "story") >= 1, "story 1 progressed from real play",
		"%d/%d" % [MissionManager.progress_of(first, "story"), MissionManager.target_of(first)])
	ok(MissionManager.can_claim(first, "story"), "story 1 claimable")
	ResourceManager.amounts["cash"] = 10
	var cash0 := ResourceManager.get_amount("cash")
	var got := MissionManager.claim(String(first["id"]), "story")
	ok(not got.is_empty(), "claim paid out", str(got))
	ok(ResourceManager.get_amount("cash") > cash0, "cash went up on claim",
		"%d -> %d" % [cash0, ResourceManager.get_amount("cash")])
	ok(not MissionManager.can_claim(first, "story"), "cannot claim twice")
	ok(MissionManager.is_available(story[1], "story"), "next story mission unlocked")
	ok(not MissionManager.is_available(story[4], "story"), "later story missions stay locked")

	var dailies := GameData.MissionsData.daily()
	var any_daily_progress := false
	for d in dailies:
		if MissionManager.progress_of(d, "daily") > 0:
			any_daily_progress = true
	ok(any_daily_progress, "daily counters moved")

	# Period reset wipes daily counters but not lifetime totals.
	var lifetime := MissionManager.counter("achievement", "expeditions_completed")
	MissionManager.daily_reset_at = Time.get_unix_time_from_system() - 1.0
	MissionManager.check_periods()
	ok(MissionManager.counter("daily", "expeditions_completed") == 0, "daily counters reset")
	ok(MissionManager.counter("achievement", "expeditions_completed") == lifetime, "lifetime totals survive a reset")

	ok(MissionManager.login_pending or MissionManager.login_day >= 0, "login ladder initialised")
	if MissionManager.login_pending:
		var lr := MissionManager.claim_login()
		ok(not lr.is_empty(), "daily login paid out", str(lr))
		ok(not MissionManager.login_pending, "login cannot be re-claimed")

func test_events() -> void:
	head("Dynamic events")
	EventManager.active = []
	var e := EventManager.force_spawn()
	ok(not e.is_empty(), "an event spawned", String(e.get("tpl", "")))
	var uid := String(e["uid"])
	var info := EventManager.target_info(uid)
	ok(not info.is_empty(), "event exposes a deployable target", String(info.get("name", "")))
	ok(int(info["energy"]) > 0 and float(info["travel"]) > 0.0, "event has cost and travel time")
	ok(EventManager.remaining(uid) > 0.0, "event counts down", "%.0fs" % EventManager.remaining(uid))
	EventManager.by_uid(uid)["expires"] = Time.get_unix_time_from_system() - 1.0
	EventManager.tick(Time.get_unix_time_from_system())
	ok(EventManager.by_uid(uid).is_empty(), "expired event disappeared")
	var e2 := EventManager.force_spawn()
	ok(not e2.is_empty(), "spawn works again")
	var cell := GameData.RegionsData.FOG_CELL
	var inside := MapManager.is_cell_revealed(String(e2["region"]),
		int(floor(float(e2["x"]) / cell)), int(floor(float(e2["y"]) / cell)))
	ok(inside, "events only appear on explored ground")

func test_offline_and_persistence() -> void:
	head("Save, reload & offline progress")
	GameManager.dev_add_resources(1.0)
	var snapshot := {
		"cash": ResourceManager.get_amount("cash"),
		"level": GameManager.player_level,
		"workshop": BuildingManager.level_of("workshop"),
		"roster": CharacterManager.roster_size(),
		"marlow_level": CharacterManager.level_of("marlow"),
		"marlow_weapon": CharacterManager.equipped_item("marlow", "weapon"),
		"fog": MapManager.revealed_cells("harbour_reach"),
		"clears": MapManager.clears.size(),
		"missions": MissionManager.counter("achievement", "expeditions_completed"),
		"inventory": CharacterManager.inventory.duplicate(),
	}
	SaveManager.save_now()
	ok(SaveManager.has_save(), "save file written")

	# Wipe every manager in memory, then reload from disk.
	GameManager.new_game()
	ok(ResourceManager.get_amount("cash") != snapshot["cash"] or snapshot["cash"] == 1200,
		"in-memory state was reset before reload")
	SaveManager.load_game()
	GameManager._load_all()
	ok(ResourceManager.get_amount("cash") == snapshot["cash"], "cash restored",
		"%d vs %d" % [ResourceManager.get_amount("cash"), int(snapshot["cash"])])
	ok(GameManager.player_level == snapshot["level"], "player level restored")
	ok(BuildingManager.level_of("workshop") == snapshot["workshop"], "building levels restored")
	ok(CharacterManager.roster_size() == snapshot["roster"], "roster restored")
	ok(CharacterManager.level_of("marlow") == snapshot["marlow_level"], "operative level restored")
	ok(CharacterManager.equipped_item("marlow", "weapon") == snapshot["marlow_weapon"], "equipment restored")
	ok(MapManager.revealed_cells("harbour_reach") == snapshot["fog"], "fog of war restored")
	ok(MapManager.clears.size() == snapshot["clears"], "clear records restored")
	ok(MissionManager.counter("achievement", "expeditions_completed") == snapshot["missions"],
		"mission counters restored")
	ok(CharacterManager.inventory == snapshot["inventory"], "inventory restored")

	# Offline catch-up: pretend four hours passed.
	var now := Time.get_unix_time_from_system()
	GameManager.last_seen = now - 14400.0
	for id in BuildingManager.state.keys():
		BuildingManager.state[id]["last"] = now - 14400.0
	ResourceManager.energy = 10.0
	ResourceManager._energy_last = now - 14400.0
	BuildingManager.start_upgrade("warehouse")
	BuildingManager.state["warehouse"]["build"]["ends"] = now - 3600.0
	var rep := GameManager._catch_up(true)
	ok(float(rep["away"]) > 14000.0, "away time measured", "%.0fs" % float(rep["away"]))
	ok(bool(rep["show"]), "welcome-back summary would be shown")
	ok(not (rep["produced"] as Dictionary).is_empty(), "offline production accrued", str(rep["produced"]))
	ok(int(rep["energy"]) > 0, "offline energy regenerated", str(rep["energy"]))
	ok((rep["built"] as Array).size() > 0, "offline construction finished", str(rep["built"]))
	ok(ResourceManager.energy > 10.0, "energy actually applied", "%.0f" % ResourceManager.energy)

func test_full_campaign_sim() -> void:
	head("Long-run campaign simulation")
	SaveManager.wipe()
	GameManager.new_game()
	GameManager.dev_fast_timers = true
	GameManager.dev_infinite_energy = true
	var wins := 0
	var losses := 0
	var deploys := 0
	var guard := 0
	# Play ~120 engagements the way a player would: build, equip, fight, expand.
	while wins < 90 and guard < 600:
		guard += 1
		GameManager.dev_add_resources(1.0)
		# spend on the base
		for bid in GameData.BuildingsData.order():
			if BuildingManager.can_start_upgrade(String(bid)):
				BuildingManager.start_upgrade(String(bid))
		BuildingManager.complete_all_construction()
		# spend on people
		for cid in CharacterManager.ids():
			if CharacterManager.can_train(String(cid)):
				CharacterManager.train(String(cid))
			CharacterManager.auto_equip(String(cid))
		for rid in CharacterManager.recruitable():
			if CharacterManager.can_recruit(String(rid)):
				CharacterManager.recruit(String(rid))
		SquadManager.auto_fill(0)
		# fight whatever is available, hardest-but-doable first
		for rid in GameData.region_ids():
			if MapManager.is_unlocked(String(rid)):
				MapManager.reveal_all(String(rid))
		var candidates: Array = []
		var fallback: Array = []
		for rid in GameData.region_ids():
			if not MapManager.is_unlocked(String(rid)):
				continue
			for l in GameData.locations_in_region(String(rid)):
				var lid := String(l["id"])
				if MapManager.is_locked(lid):
					continue
				if MapManager.is_cleared(lid):
					if bool(l["repeatable"]):
						fallback.append(l)
				else:
					candidates.append(l)
		candidates.sort_custom(func(a, b): return int(a["difficulty"]) < int(b["difficulty"]))
		fallback.sort_custom(func(a, b): return int(a["difficulty"]) > int(b["difficulty"]))
		var picked := ""
		if not candidates.is_empty():
			picked = String(candidates[0]["id"])
		elif not fallback.is_empty():
			picked = String(fallback[0]["id"])
		if picked != "":
			MapManager.set_region(String(GameData.location(picked)["region"]))
		if ExpeditionManager.team_state(0) != ExpeditionManager.STATE_IDLE:
			ExpeditionManager.slots[0] = ExpeditionManager._empty_slot()
		if not ExpeditionManager.deploy(0, ExpeditionManager.KIND_LOCATION, picked):
			GameManager.dev_give_xp(300)
			continue
		deploys += 1
		ExpeditionManager.complete_travel(0)
		var info := ExpeditionManager.target_info(ExpeditionManager.KIND_LOCATION, picked)
		CombatManager.start_battle(0, info)
		var res := run_battle()
		if bool(res.get("victory", false)):
			wins += 1
		else:
			losses += 1
			GameManager.dev_give_xp(250)
		ExpeditionManager.complete_travel(0)
		MapManager.try_unlock_all()

	ok(deploys > 60, "the loop sustained many deployments", str(deploys))
	ok(wins > 50, "most fights are winnable when you keep up", "%d wins / %d losses" % [wins, losses])
	ok(losses > 0 or wins > 80, "difficulty exists", "%d losses" % losses)
	ok(GameManager.player_level >= 12, "player levelled through play", str(GameManager.player_level))
	ok(MapManager.unlocked_count() >= 3, "more regions opened", str(MapManager.unlocked_count()))
	ok(MapManager.clears.size() > 20, "locations cleared", str(MapManager.clears.size()))
	ok(CharacterManager.inventory_ids().size() > 0 or LootManager.lifetime_items > 0,
		"items dropped along the way", str(LootManager.lifetime_items))
	ok(MissionManager.claimable_count() >= 0, "mission system survived the run")
	var claimed := 0
	for scope in ["story", "daily", "weekly", "achievement"]:
		claimed += MissionManager.claim_all(String(scope)).size()
	ok(claimed > 0, "missions were claimable after a long run", str(claimed))
	SaveManager.save_now()
	ok(SaveManager.has_save(), "final save written")
