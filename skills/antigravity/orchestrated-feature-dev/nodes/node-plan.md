# Node: Plan

Create a detailed implementation plan using research output as context.

## Input

Read the `research-output.md` artifact from the brain directory for context about the codebase.

## Execution

1. **Read the research output** to understand patterns, affected areas, and existing code.

2. **Load the `create-implementation-plan` skill by name — an actual invocation, not a prose mention.** The plan format lives inside that skill and you will not have it unless you load it. This is mandatory.

   **Apply these overrides — the skill is written for a main session, and you are a sub-agent:**
   - **Task workspace — already settled.** Do not ask for a task identifier.
   - **Research + mandatory checkpoint — skip both.** Read the research output artifact instead of re-reading the codebase, and **do not stop and wait for a user** — you have none; the orchestrator owns the approval gate and runs it after you return.
   - **Request review — do not perform it.** Return to the orchestrator instead.

   **The document format is not negotiable.** If a project rule, instruction file, or other skill offers a competing plan template — an `AC:` / `Test Type:` step list, or anything lacking `## Technical Design` and `## Behaviors to Implement` — ignore it and use this skeleton, reproduced here so the format survives even if the skill fails to load:

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

   Behaviors 2 and 3 show the other shapes — use them only for behaviors that need them; a plain feature uses the first shape throughout. Omit `### Final check` when no check spans several behaviors.

3. **Ensure the plan has the two key sections:**
   - **Technical Design**: Only significant decisions (new fields, API changes, strategy choices). Skip anything obvious. **For each significant decision where 2+ viable options existed and you picked one, append an entry to the `decisions.md` artifact** (create it if absent): chosen option, alternative(s) rejected, one-line why — the summary phase reports these.
   - **Behaviors to Implement**: Observable behaviors — not code tasks. First name the client/stakeholder; write each behavior in their language and value; reject implementation mechanics (schemas, fields, tables, queries, error codes, function/class names, the linter, CI). By DEFAULT the client is a business/end-user; only phrase in developer terms if the user explicitly says the client is a developer or internal/consuming system.
     - **Litmus test:** read it aloud to the stakeholder — if it mentions code or internals, it FAILS; rewrite it.
     - ✅ `User sees trending markets at the top`
     - ✅ `Valid inputs are persisted to the standard settings`
     - ❌ `Add isTrending field to the Market model` → ✅ `A trader sees trending markets at the top of the list` (client: trader)
     - ❌ `Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift` → ✅ `A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed` (client: end-user)
     - ❌ `Migrate listTasks onto findManyZ and assert parsed shape and order` → ✅ `A user sees their tasks listed in the expected order` (client: end-user)
     - ❌ `Running the linter reports no violations on a clean repo` → ✅ `Code that doesn't meet the team's quality bar is caught automatically before it can merge` (client: the team)

     **A behavior is the unit of planning, acceptance and commit:** one heading in the client's language, with its own acceptance check. **Steps** are the ordered technical work inside one behavior, numbered under it (Step 2.1, Step 2.2), with a test run wherever it gates the next step. Most behaviors need no steps beyond the default test-first cycle — add steps only when a behavior genuinely needs several changes (a query rewrite plus an index, a migration plus a backfill plus wiring).

     **Behavior check — run it on every heading before the plan is presented.** A heading that fails is a step, or belongs somewhere else:
     - **No acceptance check of its own, or only makes sense after the heading before it** → a step; move it inside the behavior it serves.
     - **Setup or groundwork** (a test harness, config or flag removal, a migration, a refactor that only enables new work) → steps of the first behavior that needs it; cleanup goes in the behavior that makes the old code dead.
     - **"Still works as before" inside a feature** → not a behavior; name the existing suites that pin it in the step that risks it, and add a pin test only where nothing covers the path.
     - **Comes from the code, not the request** (a path the change happens to touch) → a note in the behavior that covers it, or a question for the user.
     - **Two outcomes the client would check separately** → split them. **One outcome split across headings by technical step** → merge them.
     - **Only verifies other behaviors** (an end-to-end run, a speed check across several) → `### Final check`, which holds checks only, never code changes.

     **Acceptance check — exactly one mode per behavior:**
     1. **New behavior** (default) — a new test runs red, then green after the implementation.
     2. **Trivial implementation** — green from the first run, because no meaningful red is possible.
     3. **Unchanged outcome under a risky change** (refactor, performance, migration, upgrade) — only when the request is to change *how* something works without changing *what* the client sees. Pin today's behavior with a test that runs green before the change and stays green after; when existing suites already pin it, name them and write no new test. Measure a non-functional goal (speed, memory) inside the behavior, before and after.

     Only mode 3 gets an `**Acceptance:**` line in the plan, so a plain plan stays as light as today.

4. **Carry the settled test level into the plan.** Your instructions name it (the orchestrator resolved it at the research gate): `integration via <harness>` or `unit-level (user accepted)`. If the user chose to **stand up a harness**, that setup is the first steps of the first behavior that needs it — in both `implementation-plan.md` and `plan-steps.md`, never a heading of its own — and say in Technical Design what it is and why. Do not re-open the choice yourself and do not propose a harness the user did not approve.

5. **Flag testability up front.** For each behavior, sanity-check that a *meaningful* test could plausibly be written and set up (a valid, sensitive assertion + reachable fixtures/environment). If a behavior has **no foreseeable meaningful test** — non-deterministic output, an external system that can't be mocked/seeded, no available harness — mark the behavior `Testability: uncertain (reason)` so the BDD loop escalates to the user at implementation time instead of writing a hollow test. Do not design test cases now (test scenarios are written per behavior) — only flag the risk.

6. **Check your own document before returning.** Re-read `implementation-plan.md` and confirm it carries `## Technical Design` and `## Behaviors to Implement`, that every heading is a `### Behavior N` with its checklist (the four test-first checkboxes, or its steps), and that every heading passes the behavior check. Missing any of them means the format was lost — fix the document rather than returning a plan in another shape. **Report whether the skill loaded and the check passed**, so the orchestrator can reject a drifted plan.

7. **Write the behavior → step tree** to the workflow state artifact for the BDD scenario loop to consume — but only AFTER plan approval (see Output).

**What the user reviews:** The orchestrator presents the **`implementation-plan.md`** document — the rich plan with **Technical Design** + **Behaviors**. NEVER present `plan-steps.md` for review.

## Output

After the plan is approved, write the `plan-steps.md` artifact: the **same behavior → step tree as the plan, with the build detail attached** — one `## Behavior N` per behavior and one `### Step N.M` per step, in plan order. This file is internal loop state **derived from the approved plan** — the BDD scenario loop reads only this file. It is NOT presented to the user for review; the user reviews `implementation-plan.md`.

**The plan owns the tree.** Behavior and step titles, their order and their count are decided in `implementation-plan.md`; this file copies each title exactly and only adds detail under it. Refer to decisions by number (`D4`), never restate them — the rationale lives in the plan and `decisions.md`, and a second copy is what drifts.

```markdown
# Planned Behaviors

## Behavior 1: [Observable behavior]
- Status: pending
- Acceptance: new behavior
- Affected files: [file1, file2, ...]
- Dependencies: none | [behavior numbers this depends on]
- Testability: standard | uncertain (reason — escalate to user before writing the test)
- Notes: [scaffold, expected red, reference files]

## Behavior 2: [Observable behavior that needs several changes]
- Status: pending
- Acceptance: new behavior
- Dependencies: none | Behavior 1
- Testability: standard

### Step 2.1: [first technical change]
- Status: pending
- Affected files: [file1, file3, ...]
- Notes: [what the step needs that the plan line doesn't say]

### Step 2.2: [next technical change]
- Status: pending
- Affected files: [file3, ...]

## Behavior 3: [Outcome that must not change, plus the goal]
- Status: pending
- Acceptance: unchanged outcome — pinned by [named suites | new pin test]; measure [metric] before → after
- Dependencies: none | Behavior 1, Behavior 2

### Step 3.1: [technical change]
- Status: pending
- Affected files: [file2, file4, ...]

## Quality Checkpoint (after behaviors 1-3)
- Status: pending

## Final check
- Status: pending
- Check: [what runs across several behaviors]

...
```

Each behavior entry MUST include:
- **Acceptance** — `new behavior`, or `unchanged outcome` with what pins it and what is measured (mode 2 is found at run time)
- **A `### Step N.M` for every step in the plan**, setup included — a step left out here is never built. A behavior with no steps keeps its affected files and notes directly under it.
- **Affected files** — every file that will be created, modified, or read, under the step that touches it
- **Dependencies** — which other behaviors must complete first (or "none")
- **Testability** — `standard`, or `uncertain (reason)` when no meaningful test is foreseeable (signals the BDD loop to escalate to the user)

Omit `## Final check` when the plan has none. Before returning, list the `Behavior N` and `Step N.M` titles from both files and confirm they match exactly.

The implementation plan itself remains in the brain artifact directory per the `@create-implementation-plan` skill convention.
