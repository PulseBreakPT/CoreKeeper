class_name Pal
extends RefCounted
## Colour and metric tokens. Everything visual reads from here so the whole
## interface can be retuned in one place.

const BG          := Color("#0b0e12")
const BG_DEEP     := Color("#070a0d")
const PANEL       := Color("#141a22")
const PANEL_HI    := Color("#1b232d")
const PANEL_SOFT  := Color("#10161d")
const LINE        := Color("#26313d")
const LINE_SOFT   := Color("#1a222b")
const TEXT        := Color("#e6edf5")
const TEXT_DIM    := Color("#8a97a6")
const TEXT_FAINT  := Color("#5d6975")
const ACCENT      := Color("#ff7a35")
const ACCENT_DEEP := Color("#c14f16")
const CYAN        := Color("#35c8ff")
const GOOD        := Color("#4fd6a0")
const WARN        := Color("#ffc24a")
const BAD         := Color("#ff5b5b")
const GOLD        := Color("#ffab2e")
const SHADOW      := Color(0, 0, 0, 0.55)

## Design space is 1080 px wide; heights flex with the device.
const REF_W := 1080.0

# Touch metrics, in design pixels. 48dp on a typical phone is ~126 px here.
const TAP_MIN := 126.0
const GAP_S := 12.0
const GAP := 22.0
const GAP_L := 36.0
const PAD := 28.0
const RADIUS := 20.0
const RADIUS_S := 12.0

const HEADER_H := 190.0
const NAV_H := 170.0

const FS_MICRO := 24
const FS_SMALL := 28
const FS_BODY := 33
const FS_LABEL := 30
const FS_TITLE := 44
const FS_BIG := 58
const FS_HUGE := 82

static func panel_box(fill: Color = PANEL, border: Color = LINE, radius: float = RADIUS,
		border_w: int = 2) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(int(radius))
	sb.content_margin_left = PAD
	sb.content_margin_right = PAD
	sb.content_margin_top = 18
	sb.content_margin_bottom = 18
	return sb

static func flat_box(fill: Color, radius: float = RADIUS_S) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.set_corner_radius_all(int(radius))
	return sb

static func rarity(name: String) -> Color:
	match name:
		"Rare": return Color("#4aa3ff")
		"Epic": return Color("#b46bff")
		"Legendary": return GOLD
		_: return Color("#8a97a6")

static func difficulty_color(d: int) -> Color:
	match d:
		1: return GOOD
		2: return Color("#9fd44f")
		3: return WARN
		4: return Color("#ff8a3d")
		_: return BAD

static func difficulty_label(d: int) -> String:
	match d:
		1: return "LOW"
		2: return "MODERATE"
		3: return "HIGH"
		4: return "SEVERE"
		_: return "EXTREME"

static func power_verdict(squad: int, recommended: int) -> Dictionary:
	if recommended <= 0:
		return {"text": "UNKNOWN", "color": TEXT_DIM}
	var r := float(squad) / float(recommended)
	if r >= 1.25:
		return {"text": "FAVOURABLE", "color": GOOD}
	if r >= 0.95:
		return {"text": "EVEN", "color": Color("#9fd44f")}
	if r >= 0.7:
		return {"text": "RISKY", "color": WARN}
	return {"text": "OVERMATCHED", "color": BAD}
