"""Per-species Technicolor body colour. A family's LINE_COLORS gives one colour per line, which makes
look-alike species (hawk/falcon, hornback/pincher) identical in colour. This spreads each line's colour
over hue and lightness with a golden-ratio sequence, so neighbours in the species list land far apart.
Used by gen_ts.py and gen_swift.py. Optional per-species overrides: a family module may define COLOR_OVERRIDES = {id: '#RRGGBB'}."""
import colorsys

PHI = 0.6180339887


def _hex_to_hls(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r, g, b)


def _hls_to_hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h % 1.0, min(0.86, max(0.22, l)), min(0.75, max(0.08, s)))
    return '#%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))


def _rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def _dist(a, b):
    # weighted RGB distance (redmean) is close enough to perceptual for picking apart neighbours
    ra, rb = _rgb(a), _rgb(b)
    rm = (ra[0] + rb[0]) / 2
    dr, dg, db = ra[0] - rb[0], ra[1] - rb[1], ra[2] - rb[2]
    return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) ** 0.5


def _candidates(h, l, s, stage):
    out = []
    for i in range(-5, 6):            # about +-35 degrees of hue
        for j in range(-5, 6):        # about +-22% lightness
            ds = 0.05 if stage >= 5 else 0.0
            out.append(_hls_to_hex(h + i * 0.0115, l + j * 0.045, s + ds))
    return out


def body_colors(species):
    """species: list of (family_module, id, stage). Returns {id: '#RRGGBB'} for families that define LINE_COLORS.
    Within each (family, line) group, each species takes the candidate colour farthest from those already
    chosen, so look-alike neighbours get clearly different colours while the group still reads as one line."""
    groups = {}
    for fam, sid, stage in species:
        if getattr(fam, 'LINE_COLORS', None):
            groups.setdefault((fam.FAMILY, fam.LINE[sid]), []).append((fam, sid, stage))
    out = {}
    for (_, line), members in groups.items():
        base_hex = members[0][0].LINE_COLORS[line]
        if line == 'baby' or len(members) == 1:
            for fam, sid, stage in members:
                out[sid] = getattr(fam, 'COLOR_OVERRIDES', {}).get(sid, base_hex)
            continue
        h, l, s = _hex_to_hls(base_hex)
        chosen = [base_hex]
        for fam, sid, stage in members:
            ov = getattr(fam, 'COLOR_OVERRIDES', {}).get(sid)
            if ov:
                out[sid] = ov
                chosen.append(ov)
                continue
            cands = _candidates(h, l, s, stage)
            best = max(cands, key=lambda c: (min(_dist(c, o) for o in chosen), -_dist(c, base_hex)))
            out[sid] = best
            chosen.append(best)
    return out
