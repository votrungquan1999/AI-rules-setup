# Node: Plan

Create an execution-ready implementation plan from research findings.

> **Task workspace:** All state files live in the task working directory `<ws>` (`./tmp/<identifier>/`) given in your prompt. Every state-file path below is relative to `<ws>`.

## Input

- `<ws>/RESEARCH_OUTPUT.md`

## Workflow

1. Convert research into significant design decisions. For each decision where 2+ viable options existed and you picked one, append an entry to `<ws>/DECISIONS.md` (create it if absent): chosen option, alternative(s) rejected, one-line why — the summary phase reports these.
2. Define the behavior list (not code tasks). First name the client/stakeholder; write each behavior in their language and value; reject implementation mechanics (schemas, fields, error codes, function/method/class names, the linter, CI, HTTP status). Litmus test: would the stakeholder recognize this as something they asked for and care about? If it mentions code/internals, it FAILS — rewrite. (Escape hatch: only when the user explicitly states the client is a developer or internal/consuming system may you use developer terms.)

   **A behavior is the unit of planning, acceptance and commit:** one heading in the client's language, with its own acceptance check. **Steps** are the ordered technical work inside one behavior, numbered under it (`Step 2.1`, `Step 2.2`), with a test run wherever it gates the next step. Most behaviors need no steps beyond the default test-first cycle — add steps only when one needs several changes (a query rewrite plus an index, a migration plus a backfill).

   **Behavior check — run it on every heading before the plan is presented.** A heading that fails is a step, or belongs elsewhere:
   - **No acceptance check of its own, or only makes sense after the heading before it** → a step inside the behavior it serves.
   - **Setup or groundwork** (a test harness, config or flag removal, a migration, a refactor that only enables new work) → steps of the first behavior that needs it; cleanup goes in the behavior that makes the old code dead.
   - **"Still works as before" inside a feature** → not a behavior; name the existing suites that pin it in the step that risks it, and add a pin test only where nothing covers the path.
   - **Comes from the code, not the request** → a note in the behavior that covers it, or a question for the user.
   - **Two outcomes the client would check separately** → split them. **One outcome split across headings by technical step** → merge them.
   - **Only verifies other behaviors** (an end-to-end run, a speed check across several) → `### Final check`: checks only, never code changes.

   **Acceptance — exactly one mode per behavior:**
   1. **New behavior** (default) — a new test runs red, then green after the implementation.
   2. **Trivial** — green from the first run; no meaningful red is possible.
   3. **Unchanged outcome under a risky change** (refactor, performance, migration, upgrade) — only when the request changes *how* something works, not *what* the client sees. Pin today's behavior with a test green before the change and after; when existing suites already pin it, name them and write no new test. Measure a non-functional goal (speed, memory) before and after, inside the behavior.

   Only mode 3 gets an `**Acceptance:**` line in the plan.
3. **Carry the settled test level into the plan.** Your prompt names it (resolved at the Phase 1 gate): `integration via <harness>` or `unit-level (user accepted)`. If the user chose to stand up a harness, that setup is the first steps of the first behavior that needs it — in both `implementation-plan.md` and `PLAN_STEPS.md`, never a heading of its own — and say what it is in Technical Design. Don't re-open the choice or propose a harness the user didn't approve.
4. Include dependencies per behavior and likely touched files under the step that touches them. Also flag testability: if a behavior has no foreseeable meaningful test (non-deterministic output, unmockable external system, no harness), mark the behavior `Testability: uncertain (reason)` so the BDD loop escalates to the user instead of writing a hollow test. Don't design test cases now — only flag the risk.
5. Add quality checkpoint markers every 2-3 behaviors.
6. Load the `create-implementation-plan` skill **by name, as an actual invocation** — writing `@create-implementation-plan` in prose is a reference, not a load, and the plan format lives inside that skill. Apply these overrides, since the skill is written for a main session and you are a sub-agent: `<ws>` is already given (don't ask for an identifier); the research is done (read `<ws>/RESEARCH_OUTPUT.md`, skip the skill's research step **and its mandatory user checkpoint**); and **do not present for approval or wait for a user** — return to the orchestrator, which owns the gate and presents `<ws>/implementation-plan.md`, never `<ws>/PLAN_STEPS.md`.
7. Before returning, re-read `<ws>/implementation-plan.md` and confirm it carries `## Technical Design` and `## Behaviors to Implement`, that every heading is a `### Behavior N` with its checklist (the four test-first checkboxes, or its steps), and that every heading passes the behavior check. Report whether the skill loaded and the check passed.

### `<ws>/implementation-plan.md` — required format

Not negotiable. If a project rule or another skill offers a competing template — an `AC:` / `Test Type:` step list, or anything without the two sections below — ignore it. Reproduced here so the format survives even if the skill fails to load:

```markdown
# [Goal Description]

Brief description of the problem and what the change accomplishes.

## User Review Required
> [!IMPORTANT]
> [Critical decision or breaking change needing approval — omit the section if there is none]

## Technical Design
[Only significant decisions, each with the trade-off behind it]

## Behaviors to Implement

### Behavior 1: [Observable behavior]
- [ ] Write test
- [ ] Run test
- [ ] Implement (if needed)
- [ ] Run test (if implemented)

### Behavior 2: [Observable behavior that needs several changes]
- [ ] Write test
- [ ] Run test
- [ ] Step 2.1: [first technical change]
- [ ] Step 2.2: [next technical change]
- [ ] Run test

### Behavior 3: [Outcome that must not change, plus the goal — e.g. "… the same results, faster"]
**Acceptance:** unchanged outcome — pinned by [named suites | a new pin test]; [metric] before → after
- [ ] Pin: run it green on today's code; measure [metric]
- [ ] Step 3.1: [technical change] — run the pin, still green
- [ ] Measure [metric] again

### Quality Checkpoint (after every 2-3 behaviors)
- [ ] Review test quality
- [ ] Review code for refactoring

### Final check
- [ ] [A check that spans several behaviors — an end-to-end run, a speed check]
```

Behaviors 2-3 show the other shapes — use them only when needed; a plain feature uses the first shape throughout. Omit `### Final check` when no check spans several behaviors.

### Behaviors to Implement — reframing examples (client in parentheses)

- ❌ "Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift"
  ✅ "A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed" (client: end-user)
- ❌ "Migrate listTasks onto findManyZ and assert parsed shape and order"
  ✅ "A user sees their tasks listed in the expected order" (client: end-user)
- ❌ "Running the linter reports no violations on a clean repo"
  ✅ "Code that doesn't meet the team's quality bar is caught automatically before it can merge" (client: the team)
- ❌ "Add isTrending field to the Market model"
  ✅ "A trader sees trending markets at the top of the list" (client: trader)

## Output

Write:

- `<ws>/implementation-plan.md` (the review artifact)
- `<ws>/PLAN_STEPS.md` — internal loop state: the same behavior → step tree as the approved plan, with build detail attached; write it ONLY AFTER the plan is approved and never present it to the user for review

**The plan owns the tree.** Behavior and step titles, their order and count are decided in `implementation-plan.md`; `PLAN_STEPS.md` copies each title exactly and only adds detail under it. Cite decisions by number (`D4`), never restate them — a second copy is what drifts.

`<ws>/PLAN_STEPS.md` format:

```markdown
## Behavior 1: <observable behavior>
- Status: pending
- Acceptance: new behavior
- Depends on: none
- Testability: standard | uncertain (reason — escalate to user before writing the test)
- Likely files: ...
- Notes: <scaffold, expected red, reference files>

## Behavior 2: <observable behavior that needs several changes>
- Status: pending
- Acceptance: new behavior
- Depends on: Behavior 1
- Testability: standard

### Step 2.1: <first technical change>
- Status: pending
- Likely files: ...
- Notes: <what the step needs that the plan line doesn't say>

## Behavior 3: <outcome that must not change, plus the goal>
- Status: pending
- Acceptance: unchanged outcome — pinned by <named suites | new pin test>; <metric> before → after
- Depends on: none
- Testability: standard

### Step 3.1: <technical change>
- Status: pending
- Likely files: ...

## Final check
- Status: pending
- Check: <what runs across several behaviors>
```

Every plan step gets a `### Step N.M`, setup included — a step left out here is never built. A behavior with no steps keeps its files and notes directly under it. `Acceptance` is `new behavior` or `unchanged outcome` (mode 2 is found at run time). Omit `## Final check` when the plan has none. Before returning, list the `Behavior N` and `Step N.M` titles from both files and confirm they match exactly.
