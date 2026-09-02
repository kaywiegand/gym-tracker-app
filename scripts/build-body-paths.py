import re, json, sys, os

SRC = os.path.join(os.path.dirname(__file__), '..', 'docs', 'references', 'body.svg')
s = open(SRC).read()

# split into the two labelled groups
groups = {}
for name in ('front', 'back'):
    m = re.search(r'<g id="%s" transform="matrix\(([^)]+)\)"' % name, s)
    a, b, c, d_, e, f = [float(v) for v in m.group(1).split(',')]
    start = m.end()
    # group ends at the matching </g> -- these groups are flat (paths only)
    end = s.index('</g>', start)
    body = s[start:end]
    paths = re.findall(r'\sd="([^"]+)"', body)
    groups[name] = {'m': (a, b, c, d_, e, f), 'paths': paths}


def bbox(d, m):
    a, b, c, d_, e, f = m
    nums = [float(x) for x in re.findall(r'-?\d+\.?\d*(?:e-?\d+)?', d)]
    xs, ys = [], []
    for i in range(0, len(nums) - 1, 2):
        x, y = nums[i], nums[i + 1]
        xs.append(a * x + c * y + e)
        ys.append(b * x + d_ * y + f)
    return min(xs), min(ys), max(xs), max(ys)


def classify(nx, ny, side, w, h):
    """nx, ny = centre of the path's bbox, normalised inside its own figure."""
    outer = nx < 0.315 or nx > 0.685
    # head stays neutral
    if ny < 0.135:
        return None
    # hands and feet are not a trainable region
    if 0.46 < ny < 0.60 and (nx < 0.17 or nx > 0.83):
        return None
    if ny > 0.93:
        return None
    if outer:
        if ny < 0.26:
            return 'shoulders'
        if ny < 0.47:
            return 'arms'
        return 'legs'
    # centre column
    if ny < 0.19:
        return 'shoulders'          # traps / neck line
    if side == 'front':
        if ny < 0.30:
            return 'chest'
        # Down to the hip crease, not to the navel: the lower abdominals sit
        # around 0.46 and were falling into 'legs', so the BIA trunk segment
        # left a hole exactly where the belly is.
        if ny < 0.48:
            return 'core'
        return 'legs'
    if ny < 0.42:
        return 'back'
    return 'legs'

out = {}
for name, g in groups.items():
    boxes = [bbox(d, g['m']) for d in g['paths']]
    x0 = min(b[0] for b in boxes); x1 = max(b[2] for b in boxes)
    y0 = min(b[1] for b in boxes); y1 = max(b[3] for b in boxes)
    W, H = x1 - x0, y1 - y0
    items = []
    for d, b in zip(g['paths'], boxes):
        cx = ((b[0] + b[2]) / 2 - x0) / W
        cy = ((b[1] + b[3]) / 2 - y0) / H
        # The drawing carries one path spanning the whole figure -- the body
        # silhouette the muscle segments are laid on top of. Filling it with a
        # status colour washed the entire body in one colour; it has to render
        # as background so only the segments carry meaning.
        is_base = (b[2] - b[0]) / W > 0.9 and (b[3] - b[1]) / H > 0.9
        # Anatomical side, for the BIA segment view (muscle/fat are reported
        # per right arm / left arm / trunk / right leg / left leg).
        # The figure is MIRRORED between views: in the front view the
        # person's right arm sits on the LEFT of the image, in the back view
        # on the right. Getting this backwards silently swaps every segment
        # value, so it is derived per view rather than from cx alone.
        region_now = None if is_base else classify(cx, cy, name, W, H)
        # Midline paths have no side. Traps and the neck are classified as
        # 'shoulders' for the heat map, but they are not an arm -- leaving
        # them side-less lets the BIA segment view tell them from the delts.
        midline = abs(cx - 0.5) < 0.03 or (region_now == 'shoulders' and 0.32 < cx < 0.68)
        if is_base or midline:
            side = None
        elif name == 'front':
            side = 'right' if cx < 0.5 else 'left'
        else:
            side = 'left' if cx < 0.5 else 'right'

        items.append({
            'd': d,
            'region': region_now,
            'base': is_base,
            'side': side,
            'cx': round(cx, 3), 'cy': round(cy, 3),
        })
    out[name] = {'m': g['m'], 'items': items, 'box': [x0, y0, W, H]}

json.dump(out, open(sys.argv[1], 'w'))
from collections import Counter
for n, g in out.items():
    print(n, Counter(i['region'] for i in g['items']))
