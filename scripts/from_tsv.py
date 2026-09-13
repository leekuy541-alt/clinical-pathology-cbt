# -*- coding: utf-8 -*-
"""Load TSV banks (11 columns, tab-separated, optional \\n in fields as || )."""
from mid_lib import build, write_bank, qa

def load_tsv(path, prefix, start=1, width=2):
    rows = []
    text = open(path, encoding="utf-8").read()
    for line in text.splitlines():
        line = line.strip("\n")
        if not line or line.startswith("#"):
            continue
        parts = [p.replace("||", "\n") for p in line.split("\t")]
        if len(parts) < 11:
            raise SystemExit(f"bad cols {len(parts)}: {line[:80]}")
        rows.append(parts[:11])
    out = []
    for i, r in enumerate(rows):
        stem, correct, w1, w2, w3, w4, ec, e1, e2, e3, e4 = r
        out.append(build(f"{prefix}{str(start+i).zfill(width)}", stem, correct, [w1,w2,w3,w4], ec, [e1,e2,e3,e4], i))
    return out
