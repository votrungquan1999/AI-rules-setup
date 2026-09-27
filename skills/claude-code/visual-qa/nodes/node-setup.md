# Node: Setup

Wire a project for visual QA. Done once per project; later runs skip straight to [node-capture.md](./node-capture.md).

## Pick the workspace

- **The project already has Playwright** → work inside the project. Tours and the helper live under its e2e folder.
- **No Playwright, only a live URL, or the repo must stay untouched** → make a standalone workspace outside the repo (for example a scratch folder). Install Playwright there with `npm init -y && npm install -D @playwright/test`. Read the repo's source only to find how to reach states and to cite `file:line`.

**Safety check before pointing at a live URL.** Tours click buttons and submit forms. Against an app with a backend, that creates real records. Only drive a live site when it has no backend, or the user has said it is fine.

## Ask the viewport question once

Ask the user which preset to capture, then write the answer into `visual-qa.json` so it is never asked again:

- `desktop`: 1280×720
- `desktop-mobile`: 1280×720 and 375×812
- `desktop-mobile-dark`: both of those, in light and dark
- `full`: 375×812, 768×1024, 1280×720, 1920×1080

**If you cannot ask** (running as a subagent, unattended), use `desktop-mobile` and say so at the top of the report. Mobile is where layouts break hardest, and desktop shows whether the layout breaks between the two.

## Files to create

**`visual-qa.json`** at the workspace root:

```jsonc
{
  "archiveRoot": ".visual-qa",          // gitignored working area
  "reportDir": "qa-visual-defects",     // the report, committed by the user if they want
  "viewportPreset": "desktop-mobile",
  "sharedPaths": [                      // files every screen depends on; a change re-runs every tour
    "src/app/layout.tsx", "src/app/globals.css", "tailwind.config.*",
    "package.json", "pnpm-lock.yaml", "scripts/seed*.ts",
    "visual-qa.json", "playwright.visual.config.ts", "e2e/visual/snap.ts", "e2e/visual/visual.auth.ts"
  ],
  "stabilize": {
    "freezeClockAt": "2026-01-01T00:00:00Z",   // omit if the app shows no dates or timers
    "maskSelectors": [".relative-time"],        // regions that change every run
    "flakinessRetries": 2,
    "settleMs": 150
  }
}
```

A broken `visual-qa.json` stops the run on purpose; only a missing file falls back to defaults.

**`sharedPaths` is required.** Later runs re-capture only the states whose `sources` changed, and no state lists the root layout, global styles, the lockfile, the seed data or the capture harness. List them here, or a change to them is never seen. Patterns are shell-style, and `*` also crosses folders: `src/components/ui/*` covers everything under it. A path written out in full always matches itself, `[lang]` brackets included.

**The helper**: copy `references/snap.ts` to `e2e/visual/snap.ts`.

**`playwright.visual.config.ts`**: a separate config. It is the only thing that switches capture on: `snap()` and `prepareVisualPage()` do nothing in any other run, so normal e2e runs stay exactly as fast as before and keep the real clock.

```ts
import { readFileSync } from "node:fs";
import { defineConfig, devices, type Project } from "@playwright/test";

const desktop: Project = { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } };
const mobile: Project = { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } };
const tablet: Project = { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } };
const wide: Project = { name: "wide", use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } };
const dark = (p: Project): Project => ({ name: `${p.name}-dark`, use: { ...p.use, colorScheme: "dark" } });

// Turns snap() on. Ordinary e2e configs never set this, so their snap() lines stay silent.
process.env.VISUAL_QA = "1";

const PRESETS: Record<string, Project[]> = {
  desktop: [desktop],
  "desktop-mobile": [desktop, mobile],
  "desktop-mobile-dark": [desktop, mobile, dark(desktop), dark(mobile)],
  full: [mobile, tablet, desktop, wide],
};

const { viewportPreset } = JSON.parse(readFileSync("visual-qa.json", "utf8"));
const projects = PRESETS[viewportPreset];
if (!projects) throw new Error(`visual-qa.json: unknown viewportPreset "${viewportPreset}"`);

export default defineConfig({
  testDir: "./e2e",
  // Playwright only runs *.spec.ts / *.test.ts by default; tours would silently never run.
  testMatch: ["**/*.tour.ts"],
  workers: 1,
  use: {
    baseURL: "http://localhost:3000", // or the live URL in a standalone workspace
    // Without these, text antialiasing differs run to run and every shot looks changed.
    launchOptions: { args: ["--disable-lcd-text", "--font-render-hinting=none"] },
  },
  projects,
});
```

**Project with an existing e2e setup:** copy its `webServer`, `globalSetup` and auth setup project into this config. Make every viewport project depend on that setup project, e.g. `{ ...desktop, dependencies: ["setup"], use: { ...desktop.use, storageState: "playwright/.auth/admin.json" } }`. To also capture the `snap()` calls inside existing specs across the viewport matrix, add their pattern to `testMatch`.

**A visual-only file must not match the project's own test patterns.** If the visual run needs its own auth bootstrap, don't name it `*.setup.ts`, `*.spec.ts` or `*.test.ts` under the e2e folder: the normal e2e run picks it up. In LMS a `visual.setup.ts` joined the regular run's setup project, adding 2 steps that seed a database the e2e run does not have. Name it `visual.auth.ts` and match it by name here.

**`.gitignore`**: add `.visual-qa/`. Screenshots differ between machines, so the working archive is never shared. **Do not ignore `reportDir`** — the report and its copied images are meant to be read, and committed if the user wants them.

## Run

`npx playwright test --config playwright.visual.config.ts`. It runs once and exits; never use watch mode or `--ui` from an agent.

Next: [node-capture.md](./node-capture.md), which starts by listing the project's states in `e2e/visual/states.md`.
