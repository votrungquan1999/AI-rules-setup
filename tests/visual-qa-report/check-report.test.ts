import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Black-box tests for the SHIPPED script: run the real .py against a report on disk.
const SCRIPT = join(__dirname, "../../skills/claude-code/visual-qa/references/check-report.py");

/** A report that follows node-report.md's format exactly, with nothing wrong in it. */
const CLEAN = `# Report

## Counts

- **2 findings** — 1 blocking, 1 degraded, 0 cosmetic
- **1 root causes** account for 2 of the 2 entries

## Root causes

### RC1 — Names never wrap (2 findings)

Covers findings 1, 2.

## Findings

### 1. The button is pushed off screen

<img src="images/01-a.png" width="640" alt="a">

- **Where:** [a.ts:2](../src/a.ts#L2).
- **Severity:** Blocking.

### 2. The page scrolls sideways

- **Where:** [a.ts:1-3](../src/a.ts#L1-L3), same page as [finding 1](#1-the-button-is-pushed-off-screen).
- **Severity:** Degraded.
`;

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Lays out <project>/src/a.ts (3 lines) and <project>/qa/{README.md,images/01-a.png}; returns the README path. */
function project(readme: string, images: string[] = ["01-a.png"]): string {
	const root = mkdtempSync(join(tmpdir(), "check-report-"));
	dirs.push(root);
	mkdirSync(join(root, "src"));
	writeFileSync(join(root, "src", "a.ts"), "one\ntwo\nthree\n");
	mkdirSync(join(root, "qa", "images"), { recursive: true });
	for (const image of images) writeFileSync(join(root, "qa", "images", image), "png");
	const path = join(root, "qa", "README.md");
	writeFileSync(path, readme);
	return path;
}

function run(readmePath: string): { code: number | null; out: string } {
	const result = spawnSync("python3", [SCRIPT, readmePath], { encoding: "utf8" });
	return { code: result.status, out: result.stdout + result.stderr };
}

describe("check-report.py", () => {
	it("passes a report with nothing wrong in it, so a clean run is not buried in noise", () => {
		const { code, out } = run(project(CLEAN));

		expect(out).toContain("problems: 0");
		expect(code).toBe(0);
	});

	it("flags a finding that carries no severity label", () => {
		const report = CLEAN.replace("- **Severity:** Degraded.\n", "");

		const { code, out } = run(project(report));

		expect(out).toContain("NO SEVERITY: finding 2");
		expect(code).toBe(1);
	});

	it("flags a stated total that does not match the findings actually listed", () => {
		const report = CLEAN.replace("- **2 findings** —", "- **3 findings** —");

		const { out } = run(project(report));

		expect(out).toContain("TOTAL MISMATCH: says 3 findings, lists 2");
	});

	it("flags a severity breakdown that disagrees with the labels on the findings", () => {
		const report = CLEAN.replace("1 blocking, 1 degraded", "0 blocking, 2 degraded");

		const { out } = run(project(report));

		expect(out).toContain("SEVERITY MISMATCH: blocking says 0, labelled 1");
		expect(out).toContain("SEVERITY MISMATCH: degraded says 2, labelled 1");
	});

	it("flags a root cause whose heading claims a different number of findings than it lists", () => {
		const report = CLEAN.replace("(2 findings)", "(3 findings)");

		const { out } = run(project(report));

		expect(out).toContain("ROOT CAUSE MISMATCH: RC1 says 3 findings, lists 2");
	});

	it("flags a root-cause total that is not the sum of what the causes list", () => {
		const report = CLEAN.replace("account for 2 of", "account for 3 of");

		const { out } = run(project(report));

		expect(out).toContain("ROOT CAUSE TOTAL MISMATCH: says 3, causes list 2");
	});

	it("flags a cited line range that runs past the end of the file, instead of crashing on the range", () => {
		const report = CLEAN.replace("#L1-L3", "#L1-L9");

		const { out } = run(project(report));

		expect(out).toContain("LINE OUT OF RANGE: ../src/a.ts#L1-L9 (file has 3 lines)");
	});

	it("flags a link to a source file that does not exist", () => {
		const report = CLEAN.replace("(../src/a.ts#L2)", "(../src/moved.ts#L2)");

		const { out } = run(project(report));

		expect(out).toContain("MISSING FILE: ../src/moved.ts#L2");
	});

	it("flags an evidence image the report shows but the images folder does not hold", () => {
		const { out } = run(project(CLEAN, []));

		expect(out).toContain("MISSING IMAGE: images/01-a.png");
	});

	it("flags a link to a heading that does not exist, as happens after a finding is renamed", () => {
		const report = CLEAN.replace("### 1. The button is pushed off screen", "### 1. The button is hidden");

		const { out } = run(project(report));

		expect(out).toContain("BROKEN ANCHOR: #1-the-button-is-pushed-off-screen");
	});

	it("flags an image sitting in the images folder that no finding shows", () => {
		const { out } = run(project(CLEAN, ["01-a.png", "99-stray.png"]));

		expect(out).toContain("UNUSED IMAGE: images/99-stray.png");
	});
});
