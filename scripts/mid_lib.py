# -*- coding: utf-8 -*-
"""Helpers for mid-level 국시-style bank generation (original items)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

HEADLINE = re.compile(
    r"^(다음 중 )?(기본 |가장 흔히 쓰는 |대표적인 )?.{0,18}(은|는|이란)\?$"
)


def build(qid, stem, correct, wrongs, ec, wes, rot, image=None, major=None):
    wrongs = list(wrongs)[:4]
    wes = list(wes)[:4]
    while len(wes) < 4:
        wes.append("같은 분류의 이웃 개념으로, 이 조건의 정답이 아니다.")
    answer_index = rot % 5
    choices = wrongs[:]
    choices.insert(answer_index, correct)
    ew = []
    wi = 0
    for i in range(5):
        if i == answer_index:
            ew.append("")
        else:
            ew.append(wes[wi])
            wi += 1
    rec = {
        "id": qid,
        "stem": stem,
        "choices": choices,
        "answerIndex": answer_index,
        "explainCorrect": ec,
        "explainWrong": ew,
    }
    if image:
        rec["image"] = image
        rec["major"] = major or ""
    return rec


def from_rows(prefix, rows, start=1, width=2):
    out = []
    for i, r in enumerate(rows):
        stem, correct, w1, w2, w3, w4, ec, e1, e2, e3, e4 = r[:11]
        extra = r[11] if len(r) > 11 else {}
        q = build(
            f"{prefix}{str(start + i).zfill(width)}",
            stem,
            correct,
            [w1, w2, w3, w4],
            ec,
            [e1, e2, e3, e4],
            i,
            image=extra.get("image") if isinstance(extra, dict) else None,
            major=extra.get("major") if isinstance(extra, dict) else None,
        )
        out.append(q)
    return out


def write_bank(name, arr):
    path = DATA / name
    path.write_text(json.dumps(arr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {name} {len(arr)}")


def qa(arr, label, allow_short=False):
    warns = []
    idxs = [0, 0, 0, 0, 0]
    neg = 0
    for q in arr:
        idxs[q["answerIndex"]] += 1
        if HEADLINE.match(q["stem"].split("\n")[0].strip()) and not allow_short:
            warns.append(f"headline {q['id']}: {q['stem'][:40]}")
        if "않는" in q["stem"] or "아닌" in q["stem"]:
            neg += 1
        if len(q["choices"]) != 5:
            warns.append(f"choices {q['id']}")
        if q["explainWrong"][q["answerIndex"]] != "":
            warns.append(f"ew {q['id']}")
        for e in q["explainWrong"]:
            if e and e.endswith("정답이 아니다.") and "이웃" not in e and "다른" not in e:
                pass
    print(
        f"QA {label}: n={len(arr)} ans={idxs} neg={neg} ({100*neg/len(arr):.0f}%) warns={len(warns)}"
    )
    for w in warns[:12]:
        print(" ", w)
    return warns
