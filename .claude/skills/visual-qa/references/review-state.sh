#!/usr/bin/env bash
# Reviews one captured state with a lean headless agent, saves its JSON, prints one line.
#
# Usage: review-state.sh <archive-root> <feature>/<state> [notes-file]
# Output: <archive-root>/_reviews/<feature>/<state>.json
#
# A default agent starts at ~46k tokens: 149 tool definitions, MCP servers, the skills list
# and the project's rules. This one gets only the Read tool, no settings and no MCP, and runs
# from outside any repo so no CLAUDE.md or rules are found: ~1.7k tokens before it starts.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
archive="$(cd "$1" && pwd)"
state="$2"
out="$archive/_reviews/$state.json"
mkdir -p "$(dirname "$out")"

# Every viewport in one call: a layout that breaks at one width shows only side by side.
message="Review the state $state. Read each sidecar first; the images it lists are relative to its viewport folder."
found=0
for meta in "$archive"/*/"$state".meta.json; do
	[ -f "$meta" ] || continue
	viewport="$(basename "$(dirname "$(dirname "$meta")")")"
	[ "$viewport" = "_reference" ] && continue
	message+=$'\n'"- $viewport: sidecar $meta, images relative to $archive/$viewport/"
	reference="$archive/_reference/$viewport/$state.png"
	[ -f "$reference" ] && message+=" (last accepted capture: $reference)"
	found=1
done
if [ "$found" = 0 ]; then
	echo "$state: FAILED, no capture under $archive"
	exit 1
fi

# Project-specific capture artifacts (a dev-tools badge, mocked text) the generic prompt cannot know.
if [ -n "${3:-}" ]; then message+=$'\n\nKnown artifacts in this project, never findings:\n'"$(cat "$3")"; fi

# One fixed folder: every call then opens with identical text, which the prompt cache reuses.
workdir="${TMPDIR:-/tmp}/visual-qa-review"
mkdir -p "$workdir"
cd "$workdir"

claude -p "$message" \
	--model opus \
	--tools Read --allowedTools Read \
	--strict-mcp-config --setting-sources "" \
	--add-dir "$archive" \
	--system-prompt-file "$here/reviewer-prompt.md" \
	--append-system-prompt-file "$here/defect-catalogue.md" \
	--output-format json </dev/null >"$out.raw" 2>&1 || true

# Keep the review, drop the transcript; the caller reads only the printed line.
python3 - "$out.raw" "$out" "$state" <<'PY'
import json, os, sys
raw_path, out_path, state = sys.argv[1:]
raw = open(raw_path).read()
try:
    result = next(e for e in json.loads(raw[raw.index("["):]) if e.get("type") == "result")
    text = result["result"]
    review = json.loads(text[text.index("{"):text.rindex("}") + 1])
except Exception:
    print(f"{state}: FAILED, see {raw_path}")
    sys.exit(1)
review["costUsd"] = round(result.get("total_cost_usd", 0), 4)
json.dump(review, open(out_path, "w"), indent=2)
os.remove(raw_path)
print(f"{state}: {len(review.get('findings', []))} findings, {len(review.get('offList', []))} off-list (${review['costUsd']:.3f})")
PY
