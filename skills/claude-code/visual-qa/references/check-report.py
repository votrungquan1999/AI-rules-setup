"""Mechanical audit of a visual-QA report: links, images, counts and root-cause arithmetic.

Usage: python3 check-report.py [path/to/README.md]   (defaults to ./README.md)
Prints one line per problem, then "problems: N". Exits 1 when N > 0.
"""

import re
import sys
import urllib.parse
from pathlib import Path

FINDING = re.compile(r"^### (\d+)\. ", re.M)
SEVERITY = re.compile(r"^- \*\*Severity:\*\* (Blocking|Degraded|Cosmetic)\b", re.M)
TOTAL = re.compile(r"^- \*\*(\d+) findings\*\* — (\d+) blocking, (\d+) degraded, (\d+) cosmetic", re.M)
ROOT_CAUSE = re.compile(r"^### (RC\d+) — .*?\((\d+) findings?", re.M)
COVERS = re.compile(r"Covers findings? ([\d, ]+)\.")
ROOT_CAUSE_TOTAL = re.compile(r"^- \*\*\d+ root causes?\*\* account for (\d+)", re.M)
SOURCE_LINK = re.compile(r"\]\((\.\./[^)]+)\)")
IMAGE = re.compile(r'<img src="([^"]+)"')
HEADING = re.compile(r"^#{1,6} (.+)$", re.M)
ANCHOR_LINK = re.compile(r"\]\(#([^)]+)\)")


def slug(heading: str) -> str:
    """GitHub's anchor for a heading: lowercase, punctuation dropped, spaces to hyphens."""
    return re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
LINE_RANGE = re.compile(r"^L(\d+)(?:-L(\d+))?$")


def findings(text: str) -> dict[int, str]:
    """Each numbered finding's body, from its heading to the next heading of any level."""
    blocks = {}
    for match in FINDING.finditer(text):
        rest = text[match.end():]
        end = re.search(r"^#{2,3} ", rest, re.M)
        blocks[int(match.group(1))] = rest[: end.start()] if end else rest
    return blocks


def check(report: Path) -> list[str]:
    text = report.read_text(encoding="utf8")
    problems = []

    blocks = findings(text)
    labelled = {"blocking": 0, "degraded": 0, "cosmetic": 0}
    for number, body in blocks.items():
        severity = SEVERITY.search(body)
        if severity:
            labelled[severity.group(1).lower()] += 1
        else:
            problems.append(f"NO SEVERITY: finding {number}")

    # Counts are derived by this script, never typed from memory.
    stated = TOTAL.search(text)
    if stated:
        if int(stated.group(1)) != len(blocks):
            problems.append(f"TOTAL MISMATCH: says {stated.group(1)} findings, lists {len(blocks)}")
        for level, said in zip(labelled, stated.groups()[1:]):
            if int(said) != labelled[level]:
                problems.append(f"SEVERITY MISMATCH: {level} says {said}, labelled {labelled[level]}")

    covered = 0
    for match in ROOT_CAUSE.finditer(text):
        name, claimed = match.group(1), int(match.group(2))
        rest = text[match.end():]
        end = re.search(r"^#{2,3} ", rest, re.M)
        covers = COVERS.search(rest[: end.start()] if end else rest)
        listed = [n for n in covers.group(1).replace(" ", "").split(",") if n] if covers else []
        covered += len(listed)
        if claimed != len(listed):
            problems.append(f"ROOT CAUSE MISMATCH: {name} says {claimed} findings, lists {len(listed)}")

    total = ROOT_CAUSE_TOTAL.search(text)
    if total and int(total.group(1)) != covered:
        problems.append(f"ROOT CAUSE TOTAL MISMATCH: says {total.group(1)}, causes list {covered}")

    anchors = {slug(heading) for heading in HEADING.findall(text)}
    for anchor in ANCHOR_LINK.findall(text):
        if anchor not in anchors:
            problems.append(f"BROKEN ANCHOR: #{anchor}")

    shown = IMAGE.findall(text)
    for image in shown:
        if not (report.parent / image).is_file():
            problems.append(f"MISSING IMAGE: {image}")
    folder = report.parent / "images"
    if folder.is_dir():
        for file in sorted(folder.iterdir()):
            if f"images/{file.name}" not in shown:
                problems.append(f"UNUSED IMAGE: images/{file.name}")

    for target in SOURCE_LINK.findall(text):
        path, _, fragment = target.partition("#")
        source = report.parent / urllib.parse.unquote(path)
        if not source.is_file():
            problems.append(f"MISSING FILE: {target}")
            continue
        lines = LINE_RANGE.match(fragment)
        if lines:
            last = int(lines.group(2) or lines.group(1))
            length = len(source.read_text(encoding="utf8").splitlines())
            if last > length:
                problems.append(f"LINE OUT OF RANGE: {target} (file has {length} lines)")

    return problems


def main(argv: list[str]) -> int:
    problems = check(Path(argv[1] if len(argv) > 1 else "README.md"))
    for problem in problems:
        print(problem)
    print(f"problems: {len(problems)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
