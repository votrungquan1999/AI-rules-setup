import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/** The manifest fields the selection reads and the orchestrator writes (manifest-format.md). */
interface Manifest {
	baseline: { commit: string; dirty: Record<string, string | null> };
	catalogueVersion: string;
	states: Record<string, ManifestState>;
}

interface ManifestState {
	sources: string[];
	reviewedAt: string;
	reviewedAgainst: string;
	[field: string]: unknown;
}

// Black-box tests for the SHIPPED script: run the real .py against a git repo on disk.
const REFERENCES = join(__dirname, "../../skills/claude-code/visual-qa/references");
const SCRIPT = join(REFERENCES, "select-states.py");
const CATALOGUE = `sha256:${createHash("sha256")
	.update(readFileSync(join(REFERENCES, "defect-catalogue.md")))
	.digest("hex")}`;

const CAPTURED = "2026-09-22T10:00:00Z";
const REVIEWED = "2026-09-22T11:00:00Z";

/** Two features, one state each, captured and reviewed clean at the committed code. */
const STATES: Record<string, string[]> = {
	"setup/empty": ["src/setup.tsx"],
	"day/vote": ["src/day.tsx"],
};

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Runs git in the fixture repo with a throwaway identity and no signing. */
function git(root: string, ...args: string[]): string {
	const result = spawnSync(
		"git",
		["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
		{
			cwd: root,
			encoding: "utf8",
		},
	);
	if (result.status !== 0) throw new Error(result.stderr);
	return result.stdout.trim();
}

/** Writes a file under the fixture root, creating its folders. */
function write(root: string, path: string, content: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(join(root, path), content);
}

/** Writes pretty JSON under the fixture root. */
function writeJson(root: string, path: string, value: unknown): void {
	write(root, path, JSON.stringify(value, null, 2));
}

/** A project whose last visual-QA run captured and reviewed every state at the current commit. */
function project(): string {
	const root = mkdtempSync(join(tmpdir(), "select-states-"));
	dirs.push(root);
	git(root, "init", "-q");
	write(root, ".gitignore", ".visual-qa/\n");
	writeJson(root, "visual-qa.json", { archiveRoot: ".visual-qa", sharedPaths: ["src/layout.tsx"] });
	write(root, "src/layout.tsx", "layout\n");
	for (const [state, sources] of Object.entries(STATES)) {
		for (const source of sources) write(root, source, `${source}\n`);
		write(root, `e2e/visual/${state.split("/")[0]}.tour.ts`, "tour\n");
	}
	git(root, "add", ".");
	git(root, "commit", "-qm", "init");

	const states: Record<string, unknown> = {};
	for (const [state, sources] of Object.entries(STATES)) {
		writeJson(root, `.visual-qa/1280x720/${state}.meta.json`, { state, sources, capturedAt: CAPTURED });
		states[`1280x720/${state}`] = {
			sources,
			capturedAt: CAPTURED,
			reviewedAt: REVIEWED,
			reviewedAgainst: CATALOGUE,
			verdict: "clean",
			openFindings: [],
		};
	}
	writeJson(root, ".visual-qa/manifest.json", {
		baseline: { commit: git(root, "rev-parse", "HEAD"), dirty: {} },
		catalogueVersion: CATALOGUE,
		states,
	});
	return root;
}

/** What running the listed tours does: each re-run feature's states get a fresh capture. */
function recapture(root: string, tours: string[]): void {
	for (const [state, sources] of Object.entries(STATES)) {
		if (!tours.includes(`e2e/visual/${state.split("/")[0]}.tour.ts`)) continue;
		const path = join(root, `.visual-qa/1280x720/${state}.meta.json`);
		const meta = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { state, sources };
		write(
			root,
			`.visual-qa/1280x720/${state}.meta.json`,
			JSON.stringify({ ...meta, capturedAt: new Date().toISOString() }),
		);
	}
}

/** Edits the fixture's manifest in place. */
function patchManifest(root: string, patch: (manifest: Manifest) => void): void {
	const path = join(root, ".visual-qa/manifest.json");
	const manifest = JSON.parse(readFileSync(path, "utf8"));
	patch(manifest);
	writeFileSync(path, JSON.stringify(manifest, null, 2));
}

/** A fixture state that must exist; a missing one is a broken fixture, not a result. */
function stateEntry(manifest: Manifest, state: string): ManifestState {
	const entry = manifest.states[`1280x720/${state}`];
	if (!entry) throw new Error(`fixture manifest has no state ${state}`);
	return entry;
}

/** Edits one state's capture sidecar in place, as snap() would rewrite it. */
function patchSidecar(root: string, state: string, patch: Record<string, unknown>): void {
	const path = join(root, `.visual-qa/1280x720/${state}.meta.json`);
	writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), ...patch }));
}

/** The script's content-hash format, for baselines written by hand. */
function sha256(content: string): string {
	return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

/** A never-committed source of day/vote, recorded in the baseline as it was at the last run. */
function uncommittedSource(root: string): string {
	const path = "src/vote-card.tsx";
	write(root, path, "card\n");
	patchManifest(root, (manifest) => {
		manifest.baseline.dirty[path] = sha256("card\n");
		stateEntry(manifest, "day/vote").sources.push(path);
	});
	return path;
}

/** What the orchestrator does once review is done: adopt the run's baseline, stamp the reviews. */
function recordRun(root: string, reviewed: string[]): void {
	const selection = JSON.parse(readFileSync(join(root, ".visual-qa/_selection.json"), "utf8"));
	patchManifest(root, (manifest) => {
		// A run with a failed capture records no baseline; the old one keeps those states selected.
		if (selection.baseline) manifest.baseline = selection.baseline;
		for (const state of reviewed) {
			const entry = stateEntry(manifest, state);
			entry.reviewedAt = new Date().toISOString();
			entry.reviewedAgainst = selection.catalogueVersion;
		}
	});
}

/** Non-empty stdout lines, sorted so assertions ignore order. */
function lines(text: string): string[] {
	return text.split("\n").filter(Boolean).sort();
}

/** Runs the shipped script from the fixture root, as the orchestrator does. */
function run(root: string, ...args: string[]) {
	return spawnSync("python3", [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
}

/** The real flow: select, capture what it names, then ask what to review. */
function select(root: string, capture = recapture) {
	const before = run(root);
	const tours = lines(before.stdout);
	capture(root, tours);
	const after = run(root, "--after-capture");
	return {
		tours,
		review: lines(after.stdout),
		code: after.status,
		out: before.stdout + before.stderr + after.stdout + after.stderr,
	};
}

describe("select-states.py", () => {
	it("re-runs only the tour whose state's source changed in a commit since the last run", () => {
		const root = project();
		write(root, "src/day.tsx", "changed\n");
		git(root, "commit", "-qam", "change day");

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts"]);
		expect(review).toEqual(["day/vote"]);
	});

	it("re-runs a state whose never-committed source was edited since the last run, which git diff alone cannot see", () => {
		const root = project();
		write(root, uncommittedSource(root), "edited\n");

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts"]);
		expect(review).toEqual(["day/vote"]);
	});

	it("does not re-run a state whose never-committed source is unchanged since the last run, or uncommitted work would force a full run every time", () => {
		const root = project();
		uncommittedSource(root);

		const { tours, review } = select(root);

		expect(tours).toEqual([]);
		expect(review).toEqual([]);
	});

	it("re-runs a state whose source had uncommitted edits at the last run and was reverted since, though git sees no change", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			manifest.baseline.dirty["src/day.tsx"] = sha256("work in progress\n");
		});

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts"]);
		expect(review).toEqual(["day/vote"]);
	});

	it("re-runs everything when a shared path changes, since the root layout is in no state's sources yet frames every screen", () => {
		const root = project();
		write(root, "src/layout.tsx", "new layout\n");

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts", "e2e/visual/setup.tour.ts"]);
		expect(review).toEqual(["day/vote", "setup/empty"]);
	});

	it("re-runs everything when the last run's commit is gone, as after a rebase, since nothing can be diffed against it", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			manifest.baseline.commit = "0".repeat(40);
		});

		const { tours, review, code } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts", "e2e/visual/setup.tour.ts"]);
		expect(review).toEqual(["day/vote", "setup/empty"]);
		expect(code).toBe(0);
	});

	it("re-runs everything when the manifest predates baselines, since its captures belong to no known commit", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			delete (manifest as Partial<Manifest>).baseline;
		});

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts", "e2e/visual/setup.tour.ts"]);
		expect(review).toEqual(["day/vote", "setup/empty"]);
	});

	it("records the baseline a run captured against, so re-running with no edits selects nothing, uncommitted work included", () => {
		const root = project();
		write(root, "src/day.tsx", "uncommitted edit\n");
		write(root, "src/vote-card.tsx", "never committed\n");
		const first = select(root);
		recordRun(root, first.review);

		const { tours, review } = select(root);

		expect(first.review).toEqual(["day/vote"]);
		expect(tours).toEqual([]);
		expect(review).toEqual([]);
	});

	it("re-reviews every state without re-capturing when the defect catalogue changed, or new entries would never be checked", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			for (const entry of Object.values(manifest.states)) entry.reviewedAgainst = "sha256:older-catalogue";
		});

		const { tours, review } = select(root);
		recordRun(root, review);
		const next = select(root);

		expect(tours).toEqual([]);
		expect(review).toEqual(["day/vote", "setup/empty"]);
		expect(next.review).toEqual([]);
	});

	it("reviews a capture that is newer than its last review, as when the reviewer failed, though nothing changed since", () => {
		const root = project();
		patchSidecar(root, "day/vote", { capturedAt: "2026-09-22T12:00:00.5Z" });

		const { tours, review } = select(root);

		expect(tours).toEqual([]);
		expect(review).toEqual(["day/vote"]);
	});

	it("re-captures a state whose capture is missing, since there is no picture to carry forward", () => {
		const root = project();
		rmSync(join(root, ".visual-qa/1280x720/day/vote.meta.json"));

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts"]);
		expect(review).toEqual(["day/vote"]);
	});

	it("re-captures a state that recorded no sources every time, since no diff can prove it unchanged", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			stateEntry(manifest, "day/vote").sources = [];
		});

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts"]);
		expect(review).toEqual(["day/vote"]);
	});

	it("re-runs a feature whose tour changed, since the tour decides how each of its screens is reached", () => {
		const root = project();
		write(root, "e2e/visual/setup.tour.ts", "tour with a new step\n");

		const { tours, review } = select(root);

		expect(tours).toEqual(["e2e/visual/setup.tour.ts"]);
		expect(review).toEqual(["setup/empty"]);
	});

	it("runs a new tour and reviews the screens it captures, though the manifest has never heard of them", () => {
		const root = project();
		write(root, "e2e/visual/results.tour.ts", "tour\n");

		const { tours, review } = select(root, (root, tours) => {
			recapture(root, tours);
			if (!tours.includes("e2e/visual/results.tour.ts")) return;
			const meta = { state: "results/podium", sources: ["src/results.tsx"], capturedAt: new Date().toISOString() };
			writeJson(root, ".visual-qa/1280x720/results/podium.meta.json", meta);
		});

		expect(tours).toEqual(["e2e/visual/results.tour.ts"]);
		expect(review).toEqual(["results/podium"]);
	});

	it("refuses to review a stale picture when a tour failed to re-capture it, and keeps the state selected for next time", () => {
		const root = project();
		write(root, "src/day.tsx", "changed\n");

		const failed = select(root, () => {});
		recordRun(root, failed.review);
		const next = select(root);

		expect(failed.review).toEqual([]);
		expect(failed.code).toBe(1);
		expect(failed.out).toContain("NOT CAPTURED: 1280x720/day/vote");
		expect(next.tours).toEqual(["e2e/visual/day.tour.ts"]);
	});

	it("runs every tour and reviews every capture on a project's first run, when there is no manifest yet", () => {
		const root = project();
		rmSync(join(root, ".visual-qa"), { recursive: true });

		const { tours, review, code } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts", "e2e/visual/setup.tour.ts"]);
		expect(review).toEqual(["day/vote", "setup/empty"]);
		expect(code).toBe(0);
	});

	it("stops and says what to add when the config names no shared paths, rather than treating every layout change as local", () => {
		const root = project();
		writeJson(root, "visual-qa.json", { archiveRoot: ".visual-qa" });

		const result = run(root);

		expect(result.status).toBe(2);
		expect(result.stderr).toContain('visual-qa.json has no "sharedPaths"');
		expect(result.stdout).toBe("");
	});

	it("names the shared file that forced a full run, so an expensive run is never a mystery", () => {
		const root = project();
		write(root, "src/layout.tsx", "new layout\n");

		const { out } = select(root);

		expect(out).toContain('full run: src/layout.tsx matches shared path "src/layout.tsx"');
	});

	it("counts what it re-captures, re-reviews and carries, so a run's cost and its skipped screens are known up front", () => {
		const root = project();
		write(root, "src/day.tsx", "changed\n");

		const { out } = select(root);

		expect(out).toContain("capture 1 state (1 tour), review 0 more, carry 1");
	});

	it("names each state that recorded no sources, so its tour gets fixed instead of paying for a re-run every time", () => {
		const root = project();
		patchManifest(root, (manifest) => {
			stateEntry(manifest, "day/vote").sources = [];
		});

		const { out } = select(root);

		expect(out).toContain("no sources, so re-captured every run: 1280x720/day/vote");
	});

	it("matches a shared path written out literally, though Next.js brackets read as a wildcard character set", () => {
		const root = project();
		const layout = "src/app/[lang]/layout.tsx";
		writeJson(root, "visual-qa.json", { archiveRoot: ".visual-qa", sharedPaths: [layout] });
		write(root, layout, "layout\n");
		git(root, "add", ".");
		git(root, "commit", "-qm", "lang layout");
		patchManifest(root, (manifest) => {
			manifest.baseline.commit = git(root, "rev-parse", "HEAD");
		});
		write(root, layout, "new layout\n");

		const { tours } = select(root);

		expect(tours).toEqual(["e2e/visual/day.tour.ts", "e2e/visual/setup.tour.ts"]);
	});
});
