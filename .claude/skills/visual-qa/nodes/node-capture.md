# Node: Capture

Get every UI state that could hurt a user onto disk as screenshots. The project must already be wired up; if `visual-qa.json` or `playwright.visual.config.ts` is missing, do [node-setup.md](./node-setup.md) first.

## Step 1: List the states, ranked by harm

Don't try to capture every branch in the code; that's too much on any real app. Rank states by **how likely they are to hurt someone**, and capture from the top down.

**Build the list from the code.** For each screen, read its component and note every condition that changes what's shown: empty checks (`items.length === 0`), loading and error flags, disabled conditions, limits ("too many"), saved-data parsing.

**Decide whether each state is reachable.** Ask: *can a user get here through the screen or through their own saved data?*
- **Yes, or you can't prove otherwise** → it's a real state. "Nobody would do that" is not a reason to skip. In the first trial, *Start with zero players* and *a name with no spaces* sounded unlikely, and they were where the worst bugs were.
- **No, and you can point at the code that makes it impossible** → skip it, and write down that line. Example: a "too few cards" warning that can never show because cards auto-fill to the player count.

**Rank what's reachable with two questions.** How easily does a user land here? How bad is it if it's broken?

- **Tier 1: capture on every run.** Anything reachable through normal use:
  - every screen with the stress inputs: **empty, one item, many items, a long name with spaces, one unbroken string** (an email, URL or handle; unbroken strings are what push layouts off the screen)
  - anything one wrong tap away: acting too early, submitting an empty form, going back mid-flow
- **Tier 2: capture once tier 1 is done.** Rare, but the user could get stuck:
  - bad or old saved data, failed load, failed submit, loading, permission denied
- **Tier 3: when there's room.** Rare, and only looks wrong:
  - pseudolocale, count extremes beyond "many", cosmetic-only variants
- **Skip.** Proven unreachable, with the proof written down.

**Write the list to `e2e/visual/states.md`.** State names are the `snap()` names, so each line maps to one capture:

```md
## setup (src/components/setup/setup.ui.tsx)
- [T1] setup/empty: no players added yet
- [T1] setup/unbroken-name: a player named with a pasted email
- [T1] setup/start-with-no-players: Start tapped before adding anyone
- [T2] setup/old-saved-game: saved data from an older app version
- [skip] setup/too-few-cards: unreachable, cards auto-fill (setup.ts:48)
```

**Budget.** If tier 1 alone is more than one run can review, split it by feature across runs. Never skip part of tier 1 to reach tier 2. The report must say which tiers this run covered.

## Step 2: Write tour files

`e2e/visual/<feature>.tour.ts`: one per feature, driving to each state on the list, waiting, snapping.

**Brief the tour writers once, before spawning them.** Write one short project brief (e.g. `e2e/visual/BRIEF.md`) and point every tour agent at it: the running server and database, the seeded rows and their ids, how to sign in as each role, the stress values, and every [known pitfall](#known-pitfalls) that applies to this app. Whatever an agent has to discover, it pays for on every later turn, because each turn re-reads everything before it. In the LMS run the student tour spent 41 of its 70 tool calls reading code before writing a line, and three agents separately rediscovered the same validation trick.

**Each tour agent writes its results to files and returns one line.** Its tour, its state list, and a "Noticed while driving" section go to `e2e/visual/states/<feature>.md`; its reply is one line (states captured, states skipped, things noticed). Long replies land in your context and are re-read on every later turn. Read the notes when you write the report, not before: in the LMS run they held the three most consequential defects.

```ts
import { expect, test } from "@playwright/test";
import { prepareVisualPage, snap } from "./snap";

const SOURCES = ["src/components/setup/setup.ui.tsx"];

// Before any page.goto(): a clock frozen after the app loads shows nonsense timers.
test.beforeEach(async ({ page }) => {
  await prepareVisualPage(page);
});

test("setup: empty and unbroken name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
  await snap(page, "setup/empty", { sources: SOURCES });

  await page.getByPlaceholder("Player name").fill("nguyenthiphuongthao.masoi@example.com");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("@example.com")).toBeVisible();
  await snap(page, "setup/unbroken-name", { sources: SOURCES });
});
```

**Rules for every `snap()` call:**
- **Name is `"<feature>/<state>"`, kebab-case**, matching `states.md`. The helper rejects anything else.
- **Wait for proof the state arrived, then snap.** Snapping before it renders produces a false defect. Tours make no pass/fail claims about behaviour, but they always wait.
- **Pass `sources`**, so findings can cite `file:line`.

`snap()` captures the whole page as screen-sized tiles, including anything below the fold and anything spilling past the right edge. No scrolling is needed. It throws if a clock freeze is configured and `prepareVisualPage` was skipped.

## Reaching a state

- **Browser storage**: seed it before the app's first script runs:
  ```ts
  await page.addInitScript((state) => localStorage.setItem("game", JSON.stringify(state)), oldSave);
  await page.goto("/");
  ```
- **API data**: fake the response the screen renders from:
  ```ts
  await page.route("**/api/questions", (route) => route.fulfill({ json: [] }));
  ```
- **Server-rendered data**: use the project's own seed scripts or e2e fixtures. Never write to a shared or production database.

## Recipe: the loading state

Hold the request the screen is waiting on so it never arrives, and **prove the hold matched** before snapping. If the pattern matches nothing, the "loading" shot is silently the loaded page.

```ts
test("app loading", async ({ page }) => {
  let held = 0;
  // Client-rendered apps: hold the JS bundle. Data-driven screens: hold the API call instead.
  await page.route("**/_next/static/**/*.js", () => { held++; }); // never fulfilled
  await page.goto("/", { waitUntil: "commit" }); // "load" would wait forever
  await expect.poll(() => held).toBeGreaterThan(0);
  await snap(page, "app/loading");
});
```

The capture records `fontsSettled: false`. Fonts can't finish on a page that never finishes loading, so a fallback font there is expected, not a defect.

## Known pitfalls

Each of these cost a tour agent a failed run or a long hunt. Put the ones that apply into the brief.

- **A click before React loads does nothing.** A server-rendered page shows its buttons before React has attached to them. If a form's action is a client-side function — `useActionState(async (prev, data) => …)`, not a server action passed straight through — a click that lands first is dropped: the text stays in the box, nothing is saved, and the tour times out. It is intermittent on a dev server, so it looks like flakiness. Wait for React before the first interaction on such a form:
  ```ts
  async function hydrated(locator: Locator): Promise<Locator> {
    await expect.poll(() => locator.evaluate((node) =>
      Object.keys(node).some((key) => key.startsWith("__reactFiber$")))).toBe(true);
    return locator;
  }
  await (await hydrated(page.getByRole("button", { name: "Submit Answer" }))).click();
  ```
- **A `required` field hides the app's own error.** Submitted empty, it shows the browser's validation bubble instead of the app's message, and the bubble makes the capture unstable. Fill it with a single space: that passes the browser's check and fails the app's.
- **One-way actions go last, on a scratch entity.** Submitting a test or releasing grades cannot be undone. Capture every state that comes before it first, and do it to an entity the tour creates for itself, never to seeded data other tours photograph.
- **Tours clean up what they create.** Prefix everything a tour creates with its feature name, and delete that prefix at the start of the run. Otherwise the second run hits "already exists" where the first showed success, and leftovers pile up in the lists other tours photograph.
- **Freezing the browser clock does not freeze the server.** A countdown computed from a server-stamped start time, or "released 3 hours ago", reads nonsense against the frozen clock. Capture it anyway, and tell the reviewer that only its format can be judged, not its value.

## Pseudolocale (tier 3)

Only through the app's own translation layer: add a locale whose strings are the real ones made ~40% longer with accented characters. If there's no translation layer, skip it; the tier 1 long-name states catch most of the same bugs. Never rewrite page text with a script. That mangles user data and misses placeholders and labels.

## Snaps inside existing e2e specs (optional extra)

If the project has e2e specs, a `snap()` line after a step they already reach is a cheap bonus for everyday screens. It is **not** tier 1 coverage: those specs walk the happy path, and in the first trial 11 of 16 findings, including every blocking one, were in states a happy-path test never visits. These lines do nothing during normal `npm run test:e2e` runs; they only capture under the visual config.

## Run and check the archive

Run only the tours whose code changed since the last run. From the project root:

```bash
tours=$(python3 <skill dir>/references/select-states.py)
[ -n "$tours" ] && npx playwright test --config playwright.visual.config.ts $tours
```

- **No tours listed means capture nothing.** Never call Playwright with an empty list: with no files it runs every tour.
- **A first run, or a change to a shared path, lists every tour**, and the summary on stderr says which file forced it. The rules: [manifest-format.md](../references/manifest-format.md#choosing-what-to-re-run).
- **Don't edit code while it captures.** The run is recorded against the code as it stood when the script ran.

Before reviewing, check the `*.meta.json` files:
- `stable: false`: the screen kept changing across every re-shoot. Mask the moving region in `visual-qa.json`, or accept it and tell the reviewer.
- More than one entry in `images`: the page was taller than the screen; every tile gets reviewed.
- Every `[T1]` line in `states.md` has a capture. Anything missing goes in the report as not covered, with the reason.

Next: [node-review.md](./node-review.md).
