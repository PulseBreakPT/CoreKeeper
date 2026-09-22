extends Node

func _ready() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	print("BOOT ok=", GameManager.booted_ok, " level=", GameManager.player_level)
	print("cash=", ResourceManager.get_amount("cash"), " roster=", CharacterManager.roster_size())
	print("buildings=", BuildingManager.total_levels(), " locations=", GameData.locations.size())
	print("team0=", SquadManager.members(0))
	get_tree().quit(0)
