extends Node
## Thin UI coordinator: which tab is showing, what is stacked on top of it,
## and the toast queue. The Main scene owns the actual nodes.

signal tab_requested(tab: String)
signal tab_changed(tab: String)
signal toast(text: String, kind: String)
signal sheet_closed()
signal overlay_state_changed(depth: int)

const TAB_BASE := "BASE"
const TAB_MAP := "MAP"
const TAB_OPERATIVES := "OPERATIVES"
const TAB_MISSIONS := "MISSIONS"
const TAB_INVENTORY := "INVENTORY"

var current_tab: String = TAB_BASE
var _stack_depth := 0

func tabs() -> Array:
	return [TAB_BASE, TAB_MAP, TAB_OPERATIVES, TAB_MISSIONS, TAB_INVENTORY]

func go_to(tab: String) -> void:
	tab_requested.emit(tab)

func notify_tab(tab: String) -> void:
	current_tab = tab
	tab_changed.emit(tab)

func say(text: String, kind: String = "info") -> void:
	toast.emit(text, kind)

func set_stack_depth(d: int) -> void:
	if d == _stack_depth:
		return
	_stack_depth = d
	overlay_state_changed.emit(d)

func stack_depth() -> int:
	return _stack_depth
