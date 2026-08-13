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

   ### Step 1: [Observable behavior]
   - [ ] Write test
   - [ ] Run test
   - [ ] Implement (if needed)
   - [ ] Run test (if implemented)

   ### Quality Checkpoint (after every 2-3 steps)
   - [ ] Review test quality
   - [ ] Review code for refactoring
   ```

3. **Ensure the plan has the two key sections:**
   - **Technical Design**: Only significant decisions (new fields, API changes, strategy choices). Skip anything obvious. **For each significant decision where 2+ viable options existed and you picked one, append an entry to the `decisions.md` artifact** (create it if absent): chosen option, alternative(s) rejected, one-line why — the summary phase reports these.
   - **Behaviors to Implement**: Observable behaviors as BDD scenario steps — not code tasks. First name the client/stakeholder; write each behavior in their language and value; reject implementation mechanics (schemas, fields, tables, queries, error codes, function/class names, the linter, CI). By DEFAULT the client is a business/end-user; only phrase in developer terms if the user explicitly says the client is a developer or internal/consuming system.
     - **Litmus test:** read it aloud to the stakeholder — if it mentions code or internals, it FAILS; rewrite it.
     - ✅ `User sees trending markets at the top`
     - ✅ `Valid inputs are persisted to the standard settings`
     - ❌ `Add isTrending field to the Market model` → ✅ `A trader sees trending markets at the top of the list` (client: trader)
     - ❌ `Reading a card whose stored shape violates the schema throws ERR_SCHEMA_DRIFT and logs the drift` → ✅ `A user is never shown a corrupted card — a damaged card is blocked and surfaced as an error instead of displayed` (client: end-user)
     - ❌ `Migrate listTasks onto findManyZ and assert parsed shape and order` → ✅ `A user sees their tasks listed in the expected order` (client: end-user)
     - ❌ `Running the linter reports no violations on a clean repo` → ✅ `Code that doesn't meet the team's quality bar is caught automatically before it can merge` (client: the team)

4. **Flag testability up front.** For each behavior, sanity-check that a *meaningful* test could plausibly be written and set up (a valid, sensitive assertion + reachable fixtures/environment). If a behavior has **no foreseeable meaningful test** — non-deterministic output, an external system that can't be mocked/seeded, no available harness — mark the step `Testability: uncertain (reason)` so the BDD loop escalates to the user at implementation time instead of writing a hollow test. Do not design test cases now (test scenarios are written per-step) — only flag the risk.

5. **Check your own document before returning.** Re-read `implementation-plan.md` and confirm it carries `## Technical Design` and `## Behaviors to Implement`, and that every step is an observable behavior with the four test-first checkboxes. Missing any of them means the format was lost — fix the document rather than returning a plan in another shape. **Report whether the skill loaded and the check passed**, so the orchestrator can reject a drifted plan.

6. **Write the step list** to the workflow state artifact for the BDD scenario loop to consume — but only AFTER plan approval (see Output).

**What the user reviews:** The orchestrator presents the **`implementation-plan.md`** document — the rich plan with **Technical Design** + **Behaviors**. NEVER present `plan-steps.md` for review.

## Output

After the plan is approved, write the step list to the `plan-steps.md` artifact. This file is internal loop state **derived from the approved plan** and is consumed by the BDD scenario loop — it is NOT presented to the user for review:

```markdown
# Planned Steps

## Step 1: [Observable behavior]
- Status: pending
- Affected files: [file1, file2, ...]
- Dependencies: none | [step numbers this depends on]
- Testability: standard | uncertain (reason — escalate to user before writing the test)

## Step 2: [Observable behavior]
- Status: pending
- Affected files: [file1, file3, ...]
- Dependencies: none | Step 1
- Testability: standard | uncertain (reason — escalate to user before writing the test)

## Step 3: [Observable behavior]
- Status: pending
- Affected files: [file2, file4, ...]
- Dependencies: none | Step 1, Step 2

## Quality Checkpoint (after steps 1-3)
- Status: pending

## Step 4: [Observable behavior]
- Status: pending
- Affected files: [file5, ...]
- Dependencies: none | Step 2

...
```

Each step MUST include:
- **Affected files** — every file that will be created, modified, or read during implementation
- **Dependencies** — which other steps must complete first (or "none")
- **Testability** — `standard`, or `uncertain (reason)` when no meaningful test is foreseeable (signals the BDD loop to escalate to the user)

The implementation plan itself remains in the brain artifact directory per the `@create-implementation-plan` skill convention.
