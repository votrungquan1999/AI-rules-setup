---
description: Guides feature implementation using incremental development with planning, test-driven approach, and progress tracking. Use when implementing features, building functionality, or starting new development tasks.
---

# Feature Development Workflow

This workflow provides a structured approach for implementing features and tasks incrementally with a test-first approach and progress tracking.

## Core Principles

1. **Understand Context First** - Read as many relevant files as possible to understand the codebase before planning
2. **Plan High-Level** - Define steps and acceptance criteria, not implementation details
3. **Test During Implementation** - Define test scenarios when implementing each step, not during planning
4. **Track Progress** - Write progress to a file for context switching and interruptions
5. **Incremental Progress** - Complete one step fully before moving to the next
6. **Test Each Step** - Prove each step works before building on top of it
7. **Red-Green-Refactor** - Write exactly one test, see it fail (red), make it pass (green), then refactor before the next test

---

## Phase 1: Planning

**Goal:** Break down work into implementable steps with clear acceptance criteria.

**Step 1: Understand the Context**

Before creating your plan, read as many relevant files as possible to understand:

- Existing patterns and conventions in the codebase
- Related features or components that might be affected
- Architecture and structure of the area you'll be modifying
- Testing patterns and utilities already in place
- Types, interfaces, and data models

This context-gathering phase helps you create a more accurate plan and avoid surprises during implementation.

**Critical: Requirement Clarification First.** If anything is unclear or ambiguous, ask the user clarifying questions. Do not assume implementation details, architectural decisions, or requirements. You must proactively ask requirement-focused questions instead of assuming details.

**Mandatory Checkpoint Before Step 2:** Report how many files you read and ask the user whether to read more files, ask more questions, or continue. Do not create a plan until the user explicitly says "continue"; otherwise, follow their instructions and ask again.

**Step 2: Create the Plan**

Create plan based on the gathered information. MUST pause for user review and wait for user to say "implement it" before starting implementation phase.

**What to include:**

- List of implementation steps in logical order
- Acceptance criteria for each step (what "done" looks like)
- Test type for each step (unit, integration, e2e, etc.) — ONLY the test type, not test cases yet
- Dependencies between steps
- Any known blockers or risks

**What NOT to include:**

- Specific test scenarios or test code
- Detailed implementation approaches
- Exact function signatures or component structure
- Database schema details

**Create Progress File:**
Create a file (e.g., `IMPLEMENTATION_PROGRESS.md`) to track completed steps. Add steps ONLY as you work on them, not in advance.

---

## Phase 2: Implement Each Step

**Default approach: BDD (Behavior-Driven Design)**
- Use the `@bdd-design` skill for most feature steps — write Given/When/Then scenarios that describe behavior
- Use the `@tdd-design` skill only when implementing specific internal logic, algorithms, or utilities that need fine-grained unit tests

**The red-green-refactor cycle applies to ALL test-first work**, whether BDD or TDD:
1. **Red** — Write one failing test
2. **Green** — Write minimum code to make it pass
3. **Refactor** — Improve structure, run tests again

**For each step in your plan:**

1. **Add step to progress file** - When starting a new step, add it with 🔄 In Progress status
2. **Define test scenarios** - NOW figure out what tests are needed for THIS step (use Given/When/Then for behavior, unit tests only for internals)

**Then, for EACH test scenario, follow red-green-refactor:**

3. **Write ONE test** - Write exactly 1 test at a time
4. **Run the test** - Verify it fails (red)
5. **Implement code** - Write the minimum code needed to make this ONE test pass (green)
6. **Refactor** - Clean up while tests still pass
7. **Repeat** - Continue until all test scenarios for this step are written and passing

**After all tests are passing:**

8. **Run linting** - Check for code quality issues and fix any problems
9. **Verify** - All tests pass, acceptance criteria met
10. **Mark step as complete** - Update progress file with ✅ Done, test list, and notes
11. **Move to next step** - Only after current step is complete

### Periodic Quality Checkpoints

**After every 2-3 completed steps**, pause to run quality checks:

1. **Use `@test-quality-reviewer` skill** - Review all tests written so far against the 4 Pillars framework. Fix any issues before proceeding.
2. **Use `@code-refactoring` skill** - Review implementation code for refactoring opportunities. Apply Extract Function, simplify conditionals, remove duplication. Run tests after each refactoring.

These checkpoints prevent technical debt from accumulating during feature development.

### When Writing Tests

**IMPORTANT:** Before writing any tests, locate the "4 Pillars of Testing" document in the project (usually in `.cursor/rules/`, `docs/`, or `repo_knowledge/`). Use it to guide your test writing.

**If you cannot find the 4 Pillars document:** STOP and ask the user where it is located.

---

## Progress Tracking Format

```markdown
# Implementation Progress: [Task Name]

### Step 1: [Description]

**Status:** ✅ Done

**Tests Written (2 tests, all passing ✅):**

1. ✅ Test description
2. ✅ Test description

**Notes:** Brief summary of what was accomplished

### Step 2: [Description]

**Status:** 🔄 In Progress

**Tests Written (1 of 3 tests passing ✅):**

1. ✅ Test passing
2. ⏳ Test not written yet
3. ⏳ Test failing

**Quality Checkpoint:** [After step 2-3, note test-quality-reviewer and refactoring results]

**Notes:** Current work in progress
```

**Status indicators:**

- ✅ Done - Step complete, tests passing, AC met
- 🔄 In Progress - Currently working on this step

**Update frequency:**

- Add step when you start working on it (🔄 In Progress)
- Update tests list as you write them (⏳ → ✅)
- Mark complete when done (🔄 → ✅)
- Add quality checkpoint notes after every 2-3 steps

### What to Avoid During Implementation

- ❌ Skipping tests for any step
- ❌ Moving to next step with failing tests
- ❌ Not updating progress file
- ❌ Writing tests without consulting project testing guidelines
- ❌ Skipping quality checkpoints after 2-3 steps
- ❌ Accumulating more than 3 steps without running test-quality-reviewer
