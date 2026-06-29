# Plan: Button Pending States & Page Loading States

## Goal

Every button that triggers async work gives the user immediate feedback (and can't be
double-clicked), and every route shows a loading state while its data fetches or while
navigation is in flight.

## Current State (audit results)

**Buttons already covered (✅):** login "Sign in", "Approve all" (header + confirm dialog),
all Copy buttons (`CopyButton`). All other buttons are synchronous (toggles, dialog
open/close, context updates) and need nothing.

**Buttons missing a pending state (⚠️ async, no feedback):**

| # | Location | File | Action |
|---|----------|------|--------|
| 1 | `/kb/review` per-draft **Approve** | `KbReviewPageClient.tsx:102` | POST `/api/kb/{id}/approve` |
| 2 | `/kb/review` per-draft **Reject** | `KbReviewPageClient.tsx:106` | POST `/api/kb/{id}/reject` |
| 3 | `/kb/review` edit dialog **Save** | `KbReviewPageClient.tsx:158` | PATCH `/api/kb/{id}` |
| 4 | `/kb` edit dialog **Save** | `KbPageClient.tsx:111` | PATCH `/api/kb/{id}` |
| 5 | `/private-skills` edit dialog **Save** | `PrivateSkillsPageClient.tsx:119` | PATCH `/api/skills/{id}` |

**Page loading:** Zero `loading.tsx` files. Async server pages (`/kb`, `/kb/review`,
`/private-skills`, `/select-rules`) currently show **nothing** while data loads
(Suspense `fallback={null}`). No per-link navigation feedback.

## Approach (confirmed)

- **Pending button:** New shared **behavioral** client component (wraps `ui/button`,
  accepts `asChild` + Radix `Slot` per context-patterns rule, plus a `pending` prop). The
  **label/content is composed by the parent** (server-composed where applicable); the
  component owns only the interaction — show a `Loader2` spinner and disable while pending.
- **Page loading:** Add a shadcn **`Skeleton`** primitive and one `loading.tsx` per async
  route, each mirroring that page's real layout (header + card list, etc.).
- **Navigation:** A behavioral nav-link wrapper using **`useLinkStatus`** (Next 16) placed
  inside each `<Link>` to show a pending indicator on click, applied to `AuthNav` and the
  home-page links — on top of `loading.tsx`.
- **Granular Suspense:** `loading.tsx` is the whole-route fallback (shown only until the
  page's *fastest* shell can render). Any independently-slow section must be wrapped in its
  **own `<Suspense>`** with a local skeleton so it streams in on its own and never blocks the
  rest of the page behind a single full-page loader. Fast shell (header, static chrome)
  renders immediately; each slow data region fills in independently.

## Constraints / rules in play

- Server/client separation: content & composition stay in server components; pending/spinner
  interaction lives in client behavioral components (`*.ui.tsx` / `*.state.tsx`).
- shadcn primitives only (`npx shadcn add skeleton`); tokenized colors; `size-*` utilities.
- Per-draft pending must be tracked **per id** (the list renders many Approve/Reject
  buttons) — acting on one draft must not disable the others.
- One test at a time, meaningful-red gate. Consult the 4 Pillars before writing tests.
- Checkpoint with the user after ~5 files per meta-rules.

---

## Phase A — Shared primitives (enablers)

### Step 1: Shared pending-aware button
**AC:** A button can be marked pending; while pending it shows a spinner, is not clickable,
and does not fire its action again. Its label is supplied by the caller (composition stays
with the parent). Works with `asChild`.
**Test Type:** unit (component)

### Step 2: Skeleton primitive
**AC:** A reusable skeleton block is available from `components/ui` and renders an animated
placeholder. (shadcn add — expect green from first run; no meaningful red.)
**Test Type:** none / trivial

### Step 3: Navigation link with pending indicator
**AC:** While clicking a link whose destination is still loading, that link shows a visible
pending indicator; once the destination renders, the indicator clears. Other links are
unaffected.
**Test Type:** unit (component, mock `useLinkStatus`)
**Depends on:** Step 1 primitives optional (own spinner)

---

## Phase B — Apply button pending states

### Step 4: Approving/rejecting a draft shows feedback
**AC:** On `/kb/review`, clicking Approve (or Reject) on a draft immediately shows that
draft's button as pending and disables both its Approve and Reject until the request
resolves; the draft is removed on success. Other drafts' buttons stay usable. A second
click cannot fire while pending.
**Test Type:** integration (component + mocked API)
**Depends on:** Step 1

### Step 5: Saving an edited draft shows feedback
**AC:** On `/kb/review`, clicking Save in the edit dialog shows the Save button pending and
disabled until the PATCH resolves; the dialog closes on success.
**Test Type:** integration
**Depends on:** Step 1

### Step 6: Saving an edited KB entry shows feedback
**AC:** On `/kb`, clicking Save in the edit dialog shows the Save button pending and disabled
until the PATCH resolves; the dialog closes on success.
**Test Type:** integration
**Depends on:** Step 1

### Step 7: Saving an edited private skill shows feedback
**AC:** On `/private-skills`, clicking Save in the edit dialog shows the Save button pending
and disabled until the PATCH resolves; the dialog closes on success.
**Test Type:** integration
**Depends on:** Step 1

### Step 8 (optional cleanup): Adopt shared button in existing flows
**AC:** Login "Sign in" and "Approve all" use the shared pending button with identical
observable behavior (spinner + disabled), removing the ad-hoc inline pattern.
**Test Type:** existing tests stay green
**Depends on:** Step 1

---

## Phase C — Page loading states (navigation)

### Step 9: `/kb` loading state
**AC:** Navigating to `/kb` shows a skeleton matching the entry-list layout until data
renders.
**Test Type:** integration / visual

### Step 10: `/kb/review` loading state
**AC:** Navigating to `/kb/review` shows a skeleton matching the draft-card layout until
data renders.
**Test Type:** integration / visual

### Step 11: `/private-skills` loading state
**AC:** Navigating to `/private-skills` shows a skeleton matching the skill-list layout
until data renders.
**Test Type:** integration / visual

### Step 12: `/select-rules` loading state
**AC:** Navigating to `/select-rules` shows a skeleton matching the rule-selector layout
until data renders.
**Test Type:** integration / visual

### Step 13: Wire pending indicator into navigation
**AC:** The `AuthNav` links and the home-page links show the Step 3 pending indicator while
their destination loads.
**Test Type:** integration
**Depends on:** Step 3

### Step 14: Split slow regions into their own Suspense boundaries
**AC:** On each data page, the static shell (header/nav) renders immediately on navigation;
each independently-slow data region (e.g. the draft list, the rule groups) is wrapped in its
own `<Suspense>` with a local skeleton, so a slow region fills in on its own without holding
back the rest of the page behind one full-page loader. The route `loading.tsx` only covers
the brief gap before the shell renders.
**Test Type:** integration / visual
**Depends on:** Steps 2, 9–12
**Notes:** Reuse the per-route skeletons from Steps 9–12 as the local Suspense fallbacks.
Audit each page for sections that fetch independently and could be parallelized rather than
awaited serially in the shell.

---

## Risks / open notes

- **Per-draft pending** (Step 4): needs id-keyed pending tracking in `KbReviewPageClient`
  (or its `.state` file), not a single boolean — verify the acted card disables but siblings
  don't.
- **`asChild` + `pending`**: Radix `Slot` requires a single child; a spinner + label needs
  care (e.g. render spinner inside the slotted child or gate `asChild` when pending). Resolve
  during Step 1.
- **`loading.tsx` vs in-page Suspense**: `/kb`, `/kb/review`, `/private-skills` already wrap
  content in Suspense with `null` fallback. A route `loading.tsx` covers the initial
  navigation; confirm it isn't shadowed by the inner Suspense (may want to give the inner
  boundaries the same skeleton or drop the inner `null` fallback).
- `/select-rules` uses `"use cache"` — confirm `loading.tsx` still shows on cold navigation.
