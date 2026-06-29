# Implementation Progress: Playwright E2E (KB Review + Private Skills)

### Step 1: Playwright harness boots the app and reaches a gated page

**Status:** ✅ Done

**Tests Written (1 test, passing ✅):**

1. ✅ Authenticated reviewer sees a seeded draft (smoke) — `/kb/review` renders, not bounced to `/login`

**Notes:** Installed `@playwright/test@1.61.1` + chromium. Added `playwright.config.ts` (`next dev`
on port 4300, dedicated `ai-rules-pw-test` DB, `storageState` auth), `tests/pw/global-setup.ts`
(authors the `session` cookie directly — auth is plumbing, not tested), `global-teardown.ts` (drops
test DB), `tests/pw/helpers/db.ts` (seed/clear via the app's repo functions). Added `test:pw` script
and gitignored Playwright artifacts. Harness is scaffolding — smoke test was green from the first run
(no behavior logic to red against); a failure here would mean a real wiring fault.

Gotcha recorded: dynamic `await import()` of `src/server/database` nests named exports under
`.default` (CJS interop); use static imports instead.

### Step 2: KB Review — edit a draft

**Status:** ✅ Done

**Tests Written (1 test, passing ✅):**

1. ✅ Editing a draft (title/body/scope swap) updates the card, keeps it listed, and persists across reload

### Step 3: KB Review — approve a draft

**Status:** ✅ Done

**Tests Written (1 test, passing ✅):**

1. ✅ Approving removes the draft; empty-state shows; stays gone after reload (promoted to canonical)

### Step 4: KB Review — reject a draft

**Status:** ✅ Done

**Tests Written (1 test, passing ✅):**

1. ✅ Rejecting removes the draft; empty-state shows; stays gone after reload

### Step 5: KB Review — approve all

**Status:** ✅ Done

**Tests Written (1 test, passing ✅):**

1. ✅ Approve all → confirm dialog → list empties; stays empty after reload

### Step 6: Private Skills — edit a skill

**Status:** ✅ Done

**Tests Written (2 tests, passing ✅):**

1. ✅ Editing name/content/description/scopes updates the card and persists (content re-checked via reopened dialog)
2. ✅ Clearing the description removes it from the card and persists in Mongo

---

**Final:** `npm run test:pw` → 7/7 passing. `npx biome check` clean. `npx tsc --noEmit` exit 0.
All behavior steps assert UI update **plus** a reload to prove the Mongo round-trip — the unique
value over the existing jsdom component tests. Auth stayed pure plumbing (no login/auth specs).
