# Plan: Playwright E2E for KB Review + Private Skills

Browser-level e2e for the two gated reviewer pages and their edit flows. Auth is setup
plumbing only (seed the `session` cookie); no auth/login/select-rules tests.

- **Server mode:** `next dev` (matches existing vitest e2e harness).
- **Assert depth:** UI list update **and** reload-to-confirm Mongo persistence.
- **DB:** local Mongo (docker-compose, :27017), dedicated test DB, seed per-spec, drop on teardown.

---

## Step 1: Playwright harness boots the app and reaches a gated page

**AC:** `npm run test:pw` starts the app (`next dev`) on a fixed test port with test env
(`AI_RULES_SECRET=test-secret`, dedicated `MONGODB_DB_NAME`), and a seeded `session` cookie
(via `storageState`) lets a spec open `/kb/review` and render (status 200, no redirect to `/login`).

**Test type:** e2e (Playwright) — one smoke spec.

Includes: `playwright.config.ts` (`webServer`, single project + setup project for storageState),
`"test:pw"` script, install `@playwright/test` + chromium, a Mongo seed/teardown helper reusing
the `insertKbDraft` / `storePrivateSkill` repo functions.

## Step 2: KB Review — edit a draft

**AC:** With a seeded draft, opening Edit pre-fills title/body/scopes; changing them and saving
updates the card text in place (draft stays listed), and **after page reload** the edited text
persists (PATCH round-trip hit Mongo).

**Test type:** e2e.

## Step 3: KB Review — approve a draft

**AC:** Approving a seeded draft removes it from the list; after reload it does not reappear
(it is now canonical, not a draft).

**Test type:** e2e.

## Step 4: KB Review — reject a draft

**AC:** Rejecting a seeded draft removes it from the list; after reload it does not reappear.

**Test type:** e2e.

## Step 5: KB Review — approve all

**AC:** With multiple seeded drafts, "Approve all (N)" → confirm dialog → list empties; after
reload the page shows no drafts.

**Test type:** e2e.

## Step 6: Private Skills — edit a skill

**AC:** With a seeded private skill, opening Edit pre-fills name/content/description/scopes;
changing them and saving re-renders the card with new values, and after reload the change
persists. Covers the clear-description case (empty description → cleared).

**Test type:** e2e.

---

## Notes / risks

- No `data-testid`s in these pages → use role/text/label selectors (`getByRole`, `getByText`,
  `getByLabel`). Add testids only if a selector proves ambiguous.
- `next dev` first-request compile is slow → generous `webServer.timeout` + health poll on
  `/api/health` (mirrors existing e2e setup).
- Keep this Playwright run separate from `test:e2e` (vitest) so they don't collide on port/DB.
- Optional follow-ups (not in scope unless asked): global-only filter, empty-state.
