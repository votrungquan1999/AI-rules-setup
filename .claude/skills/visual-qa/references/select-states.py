"""Chooses which visual-QA states to re-capture and re-review, from what git says changed since the last run.

Run from the project root, twice:
  python3 select-states.py                   before capture: prints the tour files to run
  python3 select-states.py --after-capture   after capture: prints the <feature>/<state>s to review
Each writes <archiveRoot>/_selection.json; a summary goes to stderr.
"""

import fnmatch
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

TOUR = re.compile(r"e2e/visual/[^/]+\.tour\.ts")


def git(*args: str) -> list[str]:
    out = subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout
    return [path for path in out.split("\0") if path]


def content_hash(path: str) -> str | None:
    """None for a file that no longer exists, so a deletion reads as a change."""
    file = Path(path)
    return f"sha256:{hashlib.sha256(file.read_bytes()).hexdigest()}" if file.is_file() else None


def current_baseline() -> dict:
    """The code this run captures: HEAD, plus the content of everything uncommitted."""
    dirty = set(git("diff", "--name-only", "-z", "--relative", "HEAD"))
    dirty |= set(git("ls-files", "--others", "--exclude-standard", "-z"))
    commit = git("rev-parse", "HEAD")[0].strip()
    return {"commit": commit, "dirty": {path: content_hash(path) for path in sorted(dirty)}}


def commit_exists(commit: str) -> bool:
    return subprocess.run(["git", "cat-file", "-e", f"{commit}^{{commit}}"], capture_output=True).returncode == 0


def changed_since(baseline: dict) -> set[str]:
    """Files whose content differs from what the last run captured."""
    # Against the working tree, so uncommitted edits count; untracked files are invisible to diff.
    changed = set(git("diff", "--name-only", "-z", "--relative", baseline["commit"]))
    changed |= set(git("ls-files", "--others", "--exclude-standard", "-z"))
    # Git has no record of uncommitted content, so the last run's baseline kept a hash of it;
    # a file dirty then and reverted since is a change git cannot see.
    dirty = baseline["dirty"]
    return {path for path in changed | set(dirty) if path not in dirty or dirty[path] != content_hash(path)}


def full_run_reason(baseline: dict | None, usable: bool, changed: set[str], shared: list[str]) -> str | None:
    if not baseline:
        return "no baseline in the manifest (a first run, or one from before baselines)"
    if not usable:
        return f"the last run's commit {baseline['commit'][:7]} is gone (rebased?)"
    # A shared path (root layout, global CSS, lockfile) frames every screen but is in no state's sources.
    for path in sorted(changed):
        for pattern in shared:
            # Literal first: to fnmatch, a Next.js "[lang]" is a character set, not a folder name.
            if path == pattern or fnmatch.fnmatch(path, pattern):
                return f'{path} matches shared path "{pattern}"'
    return None


def moment(stamp: str) -> datetime:
    """Parsed, not compared as text: snap() and the manifest write different precisions."""
    return datetime.fromisoformat(stamp)


def captured_at(archive: Path, key: str) -> datetime:
    return moment(json.loads((archive / f"{key}.meta.json").read_text())["capturedAt"])


def feature_of(key: str) -> str:
    """Keys are <viewport>/<feature>/<state>."""
    return key.split("/")[1]


def state_of(key: str) -> str:
    """The review unit: one reviewer judges every viewport of a state together."""
    return key.split("/", 1)[1]


def tour(feature: str) -> str:
    """Tours are named after their feature; that convention is what makes a partial run possible."""
    return f"e2e/visual/{feature}.tour.ts"


def count(n: int, noun: str) -> str:
    return f"{n} {noun}{'' if n == 1 else 's'}"


def load_manifest(archive: Path) -> dict:
    """A first run has no manifest: no states known, no baseline, so everything is new."""
    path = archive / "manifest.json"
    return json.loads(path.read_text()) if path.is_file() else {"states": {}}


def before_capture(archive: Path, shared: list[str]) -> tuple[list[str], int]:
    manifest = load_manifest(archive)
    states = manifest["states"]
    baseline = manifest.get("baseline")
    # With no commit to diff against (an older manifest, a rebase), re-run everything.
    usable = bool(baseline) and commit_exists(baseline["commit"])
    changed = changed_since(baseline) if usable else set()
    reason = full_run_reason(baseline, usable, changed, shared)

    capture = sorted(
        key
        for key, entry in states.items()
        if reason
        or changed & {*entry["sources"], tour(feature_of(key))}
        # No sources: no diff can prove it unchanged.
        or not entry["sources"]
        # No capture on disk (a failed tour, a deleted file): there is no picture to carry forward.
        or not (archive / f"{key}.meta.json").is_file()
    )
    # A newer catalogue has entries the old review never asked about; the pictures are still current.
    catalogue = content_hash(str(Path(__file__).parent / "defect-catalogue.md"))
    stale = [key for key, entry in states.items() if entry.get("reviewedAgainst") != catalogue]
    # A capture newer than its review was never judged, e.g. the reviewer failed after the baseline moved on.
    stale += [
        key for key, entry in states.items() if key not in capture and captured_at(archive, key) > moment(entry["reviewedAt"])
    ]
    review = sorted({state_of(key) for key in capture + stale})

    if reason:
        features = sorted(path.name.removesuffix(".tour.ts") for path in Path("e2e/visual").glob("*.tour.ts"))
    else:
        # A new or edited tour runs even when the manifest lists none of its screens yet.
        touring = {path.split("/")[-1].removesuffix(".tour.ts") for path in changed if TOUR.fullmatch(path)}
        features = sorted({feature_of(key) for key in capture} | {f for f in touring if Path(tour(f)).is_file()})

    if reason:
        print(f"full run: {reason}", file=sys.stderr)
    for key in sorted(key for key, entry in states.items() if not entry["sources"]):
        print(f"no sources, so re-captured every run: {key}", file=sys.stderr)
    recaptured = {state_of(key) for key in capture}
    carried = {state_of(key) for key in states} - set(review)
    print(
        f"capture {count(len(recaptured), 'state')} ({count(len(features), 'tour')}), "
        f"review {len(review) - len(recaptured)} more, carry {len(carried)}",
        file=sys.stderr,
    )

    selection = {
        "selectedAt": datetime.now(timezone.utc).isoformat(),
        "baseline": current_baseline(),
        "catalogueVersion": catalogue,
        "features": features,
        "capture": capture,
        "review": review,
    }
    archive.mkdir(parents=True, exist_ok=True)
    (archive / "_selection.json").write_text(json.dumps(selection, indent=2))
    return [tour(feature) for feature in features], 0


def after_capture(archive: Path) -> tuple[list[str], int]:
    selection = json.loads((archive / "_selection.json").read_text())
    known = load_manifest(archive)["states"]
    # Screens a re-run tour captured for the first time.
    new = {
        str(meta.relative_to(archive)).removesuffix(".meta.json")
        for feature in selection["features"]
        for meta in archive.glob(f"*/{feature}/**/*.meta.json")
        if not meta.parts[len(archive.parts)].startswith("_")
    } - set(known)
    # A capture older than the selection is the previous picture: the tour failed, or no longer takes it.
    selected_at = moment(selection["selectedAt"])
    missed = [
        key
        for key in selection["capture"]
        if not (archive / f"{key}.meta.json").is_file() or captured_at(archive, key) < selected_at
    ]
    for key in missed:
        print(f"NOT CAPTURED: {key}", file=sys.stderr)
    if missed:
        # Without a new baseline the next run still sees these states' changes.
        del selection["baseline"]
        (archive / "_selection.json").write_text(json.dumps(selection, indent=2))

    review = {*selection["review"], *map(state_of, new)} - set(map(state_of, missed))
    return sorted(review), 1 if missed else 0


def main(argv: list[str]) -> int:
    config = json.loads(Path("visual-qa.json").read_text())
    archive = Path(config.get("archiveRoot", ".visual-qa"))
    if "sharedPaths" not in config:
        # Treating a missing list as empty would carry every screen through a layout change.
        print('visual-qa.json has no "sharedPaths": list the files every screen depends on (see node-setup.md)', file=sys.stderr)
        return 2
    lines, code = after_capture(archive) if "--after-capture" in argv else before_capture(archive, config["sharedPaths"])
    for line in lines:
        print(line)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
