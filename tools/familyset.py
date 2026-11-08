"""Registry of every animal family. Add a family module under tools/families/ and list it here."""
import importlib, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'families'))
ORDER = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits']
FAMILIES = [importlib.import_module(n) for n in ORDER]

def all_species():
    """[(family module, id, (name, stage, blurb, recipe))] with ids checked unique across families."""
    seen, out = {}, []
    for fam in FAMILIES:
        for sid, spec in fam.SPECIES.items():
            if sid in seen: raise SystemExit(f"species id '{sid}' appears in both {seen[sid]} and {fam.FAMILY}")
            seen[sid] = fam.FAMILY
            out.append((fam, sid, spec))
    return out

assert FAMILIES[0].IS_FREE, 'the first family must be free'
