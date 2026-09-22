extends Control
## Developer tools. Reachable only after five taps on the level badge, and kept
## visibly separate from the game so it can never be mistaken for real content.

var _body: VBoxContainer

func _init() -> void:
	UI.full_rect(self)
	mouse_filter = Control.MOUSE_FILTER_STOP

func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.08, 0.02, 0.02, 0.94)
	UI.full_rect(bg)
	add_child(bg)

	var root := UI.vbox(Pal.GAP_S)
	UI.full_rect(root)
	root.offset_left = Pal.GAP
	root.offset_right = -Pal.GAP
	root.offset_top = 70
	root.offset_bottom = -40
	add_child(root)

	var head := UI.hbox(Pal.GAP_S)
	var titles := UI.vbox(2)
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_child(UI.label("DEVELOPER MODE", Pal.FS_TITLE, Pal.BAD))
	titles.add_child(UI.label("Not part of the game. Used for testing.", Pal.FS_MICRO, Pal.TEXT_DIM))
	head.add_child(titles)
	head.add_child(UI.icon_button("close", func(): queue_free(), 96.0, Pal.TEXT))
	root.add_child(head)
	root.add_child(UI.rule(Pal.BAD))

	var scroll := UI.scroll()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(scroll)
	_body = UI.vbox(Pal.GAP_S)
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_body)
	_rebuild()

func _rebuild() -> void:
	UI.clear(_body)
	_toggle("Infinite Energy", GameManager.dev_infinite_energy, func(on):
		GameManager.dev_infinite_energy = on
		ResourceManager.refresh_energy()
		SaveManager.mark_dirty())
	_toggle("Fast Timers (all durations ×0.12)", GameManager.dev_fast_timers, func(on):
		GameManager.dev_fast_timers = on
		SaveManager.mark_dirty())
	_body.add_child(UI.rule())
	_action("Add Cash ×25,000", func(): ResourceManager.force_add("cash", 25000))
	_action("Add All Resources", func(): GameManager.dev_add_resources(1.0))
	_action("Give 500 XP (player + everyone)", func(): GameManager.dev_give_xp(500))
	_action("Give 6 Random Items", func(): GameManager.dev_give_items(6))
	_action("Complete Construction", func():
		BuildingManager.complete_all_construction()
		UIManager.say("All construction finished", "good"))
	_action("Complete Expedition Travel", func():
		for i in range(SquadManager.TEAM_COUNT):
			ExpeditionManager.complete_travel(i)
		UIManager.say("Travel timers cleared", "good"))
	_action("Reveal Current Region", func():
		MapManager.reveal_all(MapManager.current_region)
		UIManager.say("Fog cleared", "good"))
	_action("Unlock Next Region", func(): GameManager.dev_unlock_next_region())
	_action("Spawn Dynamic Event", func():
		var e := EventManager.force_spawn()
		UIManager.say("Event spawned" if not e.is_empty() else "No explored ground to spawn in",
			"good" if not e.is_empty() else "warn"))
	_action("Recruit Everyone", func():
		for id in CharacterManager.recruitable():
			CharacterManager.grant_character(String(id))
		UIManager.say("Full roster granted", "good"))
	_action("Save Now", func():
		SaveManager.save_now()
		UIManager.say("Saved", "good"))
	_body.add_child(UI.rule(Pal.BAD))
	var reset := UI.button("RESET SAVE — WIPES EVERYTHING", func():
		var confirm := ConfirmationDialog.new()
		confirm.dialog_text = "Delete the save and start over?"
		confirm.ok_button_text = "WIPE"
		add_child(confirm)
		confirm.popup_centered(Vector2i(760, 400))
		confirm.confirmed.connect(func():
			GameManager.dev_reset_save()
			get_tree().reload_current_scene()), TapButton.Kind.DANGER, 140.0)
	reset.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_child(reset)
	var off := UI.button("TURN DEVELOPER MODE OFF", func():
		GameManager.set_dev_mode(false)
		GameManager.dev_infinite_energy = false
		GameManager.dev_fast_timers = false
		SaveManager.mark_dirty()
		queue_free(), TapButton.Kind.GHOST, 120.0)
	off.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_child(off)

	var info := UI.label("Save file: %s" % ProjectSettings.globalize_path(SaveManager.SAVE_PATH),
		Pal.FS_MICRO, Pal.TEXT_FAINT)
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_child(info)

func _action(text: String, cb: Callable) -> void:
	var b := UI.button(text, func():
		cb.call()
		_rebuild(), TapButton.Kind.SECONDARY, 120.0)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_font_size_override("font_size", Pal.FS_SMALL)
	_body.add_child(b)

func _toggle(text: String, state: bool, cb: Callable) -> void:
	var b := UI.button("%s  ·  %s" % [text, "ON" if state else "OFF"], func():
		cb.call(not state)
		_rebuild(), TapButton.Kind.SUCCESS if state else TapButton.Kind.GHOST, 120.0)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.add_theme_font_size_override("font_size", Pal.FS_SMALL)
	_body.add_child(b)

func request_close() -> void:
	queue_free()
