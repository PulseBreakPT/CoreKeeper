extends GameScreen
## MISSIONS tab: story chain, dailies, weeklies, achievements and daily login.

var _tabs: HBoxContainer
var _list: VBoxContainer
var _scope: String = GameData.MissionsData.CAT_STORY
var _reset_label: Label

func build() -> void:
	var col := UI.vbox(Pal.GAP_S)
	UI.full_rect(col)
	add_child(col)

	var pad := UI.margin(Pal.GAP, Pal.GAP_S, Pal.GAP, 0)
	col.add_child(pad)
	var head := UI.vbox(Pal.GAP_S)
	pad.add_child(head)
	_tabs = UI.hbox(8)
	head.add_child(_tabs)
	_reset_label = UI.label("", Pal.FS_MICRO, Pal.TEXT_FAINT)
	head.add_child(_reset_label)

	var scroll := UI.scroll()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	var pad2 := UI.margin(Pal.GAP, 0, Pal.GAP, Pal.GAP + 40.0)
	pad2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(pad2)
	_list = UI.vbox(Pal.GAP_S)
	pad2.add_child(_list)

	MissionManager.progress_changed.connect(refresh)

func refresh() -> void:
	if _list == null:
		return
	UI.clear(_tabs)
	for cat in GameData.MissionsData.categories():
		var c := String(cat)
		var n := MissionManager.claimable_in(c)
		var text := GameData.MissionsData.category_label(c)
		if c == GameData.MissionsData.CAT_ACHIEVEMENT:
			text = "PROOF"
		if n > 0:
			text += " (%d)" % n
		var b := UI.button(text, func():
			_scope = c
			refresh(), TapButton.Kind.PRIMARY if c == _scope else TapButton.Kind.GHOST, 92.0)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_font_size_override("font_size", Pal.FS_MICRO)
		_tabs.add_child(b)

	match _scope:
		GameData.MissionsData.CAT_DAILY:
			_reset_label.text = "Resets in %s" % GameData.fmt_time(MissionManager.seconds_to_daily_reset())
		GameData.MissionsData.CAT_WEEKLY:
			_reset_label.text = "Resets in %s" % GameData.fmt_time(MissionManager.seconds_to_weekly_reset())
		GameData.MissionsData.CAT_STORY:
			_reset_label.text = "Completed in order — each one opens the next"
		_:
			_reset_label.text = "Permanent records, claimed once"

	UI.clear(_list)

	if _scope == GameData.MissionsData.CAT_DAILY:
		_list.add_child(_login_card())

	var claimable := MissionManager.claimable_in(_scope)
	if claimable > 1:
		var all := UI.button("CLAIM ALL (%d)" % claimable, func():
			var got := MissionManager.claim_all(_scope)
			UIManager.say("%d rewards collected" % got.size(), "good")
			refresh(), TapButton.Kind.SUCCESS, 118.0)
		all.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_list.add_child(all)

	for m in GameData.MissionsData.all_by_category().get(_scope, []):
		_list.add_child(_mission_card(m))

var _tick := 0.0

func _process(delta: float) -> void:
	_tick += delta
	if _tick < 0.4:
		return
	_tick = 0.0
	if visible and _reset_label != null:
		match _scope:
			GameData.MissionsData.CAT_DAILY:
				_reset_label.text = "Resets in %s" % GameData.fmt_time(MissionManager.seconds_to_daily_reset())
			GameData.MissionsData.CAT_WEEKLY:
				_reset_label.text = "Resets in %s" % GameData.fmt_time(MissionManager.seconds_to_weekly_reset())

func _login_card() -> Control:
	var pending := MissionManager.login_pending
	var card := UI.panel(Pal.PANEL.lerp(Pal.BG_DEEP, 0.1), Pal.GOLD if pending else Pal.LINE, Pal.RADIUS_S)
	var v := UI.vbox(10)
	card.add_child(v)
	var row := UI.hbox(Pal.GAP_S)
	var left := UI.vbox(2)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(UI.label("DAILY LOGIN", Pal.FS_MICRO, Pal.TEXT_FAINT))
	left.add_child(UI.label("Day %d of the cycle" % ((MissionManager.login_streak % 7) + 1),
		Pal.FS_BODY, Pal.GOLD if pending else Pal.TEXT_DIM))
	row.add_child(left)
	if pending:
		var b := UI.button("CLAIM", func():
			var got := MissionManager.claim_login()
			var main: Node = Engine.get_main_loop().current_scene
			if main and main.has_method("open_overlay"):
				main.call("open_overlay", RewardOverlay.simple("DAILY LOGIN", got))
			refresh(), TapButton.Kind.SUCCESS, 104.0)
		b.custom_minimum_size = Vector2(220, 104)
		row.add_child(b)
	else:
		row.add_child(UI.chip("CLAIMED", Pal.GOOD, Pal.FS_SMALL))
	v.add_child(row)
	v.add_child(UI.resource_row(MissionManager.login_reward(), Pal.FS_SMALL, 30.0))
	return card

func _mission_card(m: Dictionary) -> Control:
	var mid := String(m["id"])
	var available := MissionManager.is_available(m, _scope)
	var claimed := MissionManager.is_claimed(mid, _scope)
	var progress := MissionManager.progress_of(m, _scope)
	var target := MissionManager.target_of(m)
	var can := MissionManager.can_claim(m, _scope)
	var border: Color = Pal.LINE
	if can:
		border = Pal.GOOD
	elif claimed:
		border = Pal.LINE_SOFT
	elif not available:
		border = Pal.LINE_SOFT

	var card := UI.panel(Pal.PANEL if available else Pal.PANEL_SOFT, border, Pal.RADIUS_S)
	var v := UI.vbox(8)
	card.add_child(v)
	var row := UI.hbox(Pal.GAP_S)
	var left := UI.vbox(3)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(UI.label(String(m["name"]).to_upper(), Pal.FS_SMALL,
		Pal.TEXT if available else Pal.TEXT_FAINT))
	left.add_child(UI.label(String(m["desc"]), Pal.FS_MICRO, Pal.TEXT_DIM))
	row.add_child(left)
	if claimed:
		row.add_child(UI.chip("DONE", Pal.GOOD, Pal.FS_MICRO))
	elif not available:
		row.add_child(IconView.new("lock", Pal.TEXT_FAINT, 40.0, 3.5))
	v.add_child(row)

	if not claimed:
		var bar := StatBar.new(12.0, Pal.GOOD if can else Pal.ACCENT)
		bar.value = 0.0 if target <= 0 else clampf(float(progress) / float(target), 0.0, 1.0)
		v.add_child(bar)
		v.add_child(UI.label("%d / %d" % [mini(progress, target), target], Pal.FS_MICRO, Pal.TEXT_DIM))

	var rrow := UI.hbox(Pal.GAP_S)
	rrow.add_child(UI.resource_row(m["reward"], Pal.FS_MICRO, 26.0))
	if m["reward"].has("player_xp"):
		rrow.add_child(UI.chip("+%d XP" % int(m["reward"]["player_xp"]), Pal.ACCENT))
	for iid in m["reward"].get("items", []):
		rrow.add_child(UI.chip(String(GameData.item(String(iid))["name"]), Pal.GOLD))
	rrow.add_child(UI.hfill())
	v.add_child(rrow)

	if can:
		var b := UI.button("CLAIM", func():
			var got := MissionManager.claim(mid, _scope)
			var main: Node = Engine.get_main_loop().current_scene
			if main and main.has_method("open_overlay"):
				main.call("open_overlay", RewardOverlay.simple(String(m["name"]), got))
			refresh(), TapButton.Kind.SUCCESS, 112.0)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(b)
	return card
