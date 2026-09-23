"""Extract original decorative artwork from the user-supplied Nexus Word reference.

Only static artwork is reused: logo and letter pieces. No screenshot panels,
scores, buttons or gameplay text are baked into the interface.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

SOURCE = Path('/tmp/nexus-target.png')
DEST = Path('/app/src/assets/nexus')
DEST.mkdir(parents=True, exist_ok=True)
image = Image.open(SOURCE).convert('RGB')

def extract(name, box, threshold=145):
    crop = image.crop(box)
    barrier = crop.convert('L').point(lambda value: 255 if value < threshold else 0)
    barrier = barrier.filter(ImageFilter.MaxFilter(3))
    # Flood only the background outside the closed, dark cartoon outlines.
    flood = Image.new('L', (crop.width + 4, crop.height + 4), 0)
    flood.paste(barrier, (2, 2))
    ImageDraw.floodfill(flood, (0, 0), 128)
    alpha = flood.crop((2, 2, crop.width + 2, crop.height + 2)).point(lambda v: 0 if v == 128 else 255)
    if name in ('letra-r', 'pilha'):
        pixels, mask = crop.load(), alpha.load()
        for y in range(crop.height):
            for x in range(crop.width):
                r, g, b = pixels[x, y]
                if g > r * 1.06 and g > b * 1.1:
                    mask[x, y] = 0
    if True:
        # Keep the single connected illustration, not nearby lettering/leaves.
        w, h = alpha.size
        values = bytearray(alpha.tobytes())
        best = []
        logo_parts = []
        for start in range(w*h):
            if not values[start]:
                continue
            values[start] = 0
            queue, component = deque([start]), []
            while queue:
                pos = queue.popleft()
                component.append(pos)
                x, y = pos % w, pos // w
                for nxt in (pos-1 if x else -1, pos+1 if x+1<w else -1, pos-w if y else -1, pos+w if y+1<h else -1):
                    if nxt >= 0 and values[nxt]:
                        values[nxt] = 0
                        queue.append(nxt)
            if len(component) > len(best):
                best = component
            if len(component) > 1000:
                logo_parts.extend(component)
        clean = bytearray(w*h)
        for pos in (logo_parts if name == 'logo' else best):
            clean[pos] = 255
        alpha = Image.frombytes('L', (w, h), bytes(clean))
    alpha = alpha.filter(ImageFilter.GaussianBlur(.4))
    result = crop.convert('RGBA')
    result.putalpha(alpha)
    result.save(DEST / f'{name}.webp', lossless=True)
    return result

pieces = [
    extract('logo', (199, 85, 740, 348), 125),
    extract('pilha', (43, 642, 380, 918), 148),
    extract('letra-p', (24, 148, 160, 292), 148),
    extract('letra-r', (30, 327, 174, 470), 145),
    extract('letra-s', (798, 170, 928, 306), 145),
    extract('letra-a', (748, 313, 912, 473), 145),
    extract('singular', (44, 1037, 190, 1227), 135),
    extract('troca', (497, 1051, 633, 1204), 145),
]
sheet = Image.new('RGB', (800, 620), '#d7e5ef')
for i, piece in enumerate(pieces):
    piece.thumbnail((250, 250))
    sheet.paste(piece, ((i % 3)*265, (i//3)*205), piece)
sheet.save('/tmp/nexus-art-extracted.png')