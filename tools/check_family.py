"""Validate a family module: stages step up by one, every list has a guaranteed fallback, every species is
reachable (BFS), and every branch is reachable under some stat vector (so no branch is shadowed).
Usage: python3 tools/check_family.py fox"""
import importlib, itertools, sys, os
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'families'))
mod = importlib.import_module(sys.argv[1] if len(sys.argv) > 1 else 'fox')
S, EVO, BABIES, LINE = mod.SPECIES, mod.EVO, mod.BABIES, mod.LINE
bad = 0
def err(m):
    global bad; bad += 1; print('ERROR', m)
for p, lst in EVO.items():
    if p not in S: err(f'{p} not a species')
    leads = {r.get('lead') for c, r in lst if set(r) == {'lead'}}
    if not (any(r == {} for c, r in lst) or leads >= {'meat', 'veggie', 'pasta'}): err(f'no fallback for {p}')
    for c, r in lst:
        if c not in S: err(f'{p} -> {c} missing')
        elif S[c][1] != S[p][1] + 1: err(f'stage jump {p} -> {c}')
for sid, (name, stage, blurb, rec) in S.items():
    if stage < 5 and sid not in EVO: err(f'{sid} has no evolutions')
    if sid not in LINE: err(f'{sid} has no line')
reach = set(BABIES); fr = list(BABIES)
while fr:
    x = fr.pop()
    for c, _ in EVO.get(x, []):
        if c not in reach: reach.add(c); fr.append(c)
if set(S) - reach: err(f'unreachable species: {sorted(set(S) - reach)}')
def meets(r, v):
    return (v['mist'] >= r.get('mist_min', 0) and v['mist'] <= r.get('mist_max', 10**9) and v['train'] >= r.get('train', 0)
            and v['wins'] >= r.get('wins', 0) and v['smarts'] >= r.get('smarts', 0) and (not r.get('heavy') or v['heavy'])
            and ('lead' not in r or v['lead'] == r['lead']))
vecs = [dict(mist=a, train=b, wins=c, smarts=d, heavy=f, lead=g) for a, b, c, d, f, g in
        itertools.product([0, 1, 2, 4, 6], [0, 3, 5], [0, 2, 3, 5], [0, 12, 20, 40], [False, True], ['meat', 'veggie', 'pasta'])]
for p, lst in EVO.items():
    for i, (c, r) in enumerate(lst):
        if not any(meets(r, v) and not any(meets(r2, v) for _, r2 in lst[:i]) for v in vecs): err(f'branch {p} -> {c} is shadowed')
by = {}
for s in S.values(): by[s[1]] = by.get(s[1], 0) + 1
print(f"{mod.FAMILY}: {len(S)} species, per stage {dict(sorted(by.items()))}, babies {BABIES}")
print('OK' if not bad else f'{bad} problems'); sys.exit(1 if bad else 0)
