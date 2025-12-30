---
description: 'Step-by-step feature development workflow with planning, incremental implementation, test-driven approach, and progress tracking'
---

# Feature Development Guide

This document outlines the recommended approach for implementing features and tasks in this codebase.

## Core Principles

1. **Understand Context First** - Read as many relevant files as possible to understand the codebase before planning
2. **Plan High-Level** - Define steps and acceptance criteria, not implementation details
3. **Test During Implementation** - Define test scenarios when implementing each step, not during planning
4. **Track Progress** - Write progress to a file for context switching and interruptions
5. **Incremental Progress** - Complete one step fully before moving to the next
6. **Test Each Step** - Prove each step works before building on top of it

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

**Step 2: Create the Plan**

**What to include:**

- List of implementation steps in logical order
- Acceptance criteria for each step (what "done" looks like)
- Dependencies between steps
- Any known blockers or risks

**What NOT to include:**

- Specific test scenarios or test code
- Detailed implementation approaches
- Exact function signatures or component structure
- Database schema details

**Example Plan:**

```markdown
## Task: [Task name]

### Step 1: [High-level description]

**AC:** [What must be true when this step is done]

### Step 2: [High-level description]

**AC:** [What must be true when this step is done]

### Step 3: [High-level description]

**AC:** [What must be true when this step is done]
```

**Create Progress File:**
Create a file (e.g., `IMPLEMENTATION_PROGRESS.md`) to track completed steps. Add steps ONLY as you work on them, not in advance.

```markdown
# Implementation Progress: [Task Name]

### Step 1: [Description]

**Status:** ✅ Done

**E2E Tests Written (7 tests, all passing ✅):**

1. ✅ Popover open/close behavior
2. ✅ Form inputs render correctly
3. ✅ Decimal auto-jump: "10.50"
4. ✅ Decimal separator only: "10."
5. ✅ Comma as separator: "10,75"
6. ✅ Validation: zero amount
7. ✅ Validation: empty email

**Notes:** Created form components, added client-side validation
```

---

## Phase 2: Implement Each Step

**For each step in your plan:**

1. **Add step to progress file** - When starting a new step, add it with 🔄 In Progress status
2. **Define test scenarios** - NOW figure out what tests are needed for THIS step
3. **Write tests** - Create tests following project testing guidelines
4. **Implement** - Write code to make tests pass
5. **Run linting** - Check for code quality issues and fix any problems
6. **Verify** - All tests pass, acceptance criteria met
7. **Mark step as complete** - Update progress file with ✅ Done, test list, and notes
8. **Move to next step** - Only after current step is complete

### When Writing Tests

**IMPORTANT:** Before writing any tests, locate the "4 Pillars of Testing" document in the project (usually in `.cursor/rules/`, `.claude/rules/`, `docs/`, or `repo_knowledge/`). Use it to guide your test writing.

**If you cannot find the 4 Pillars document:** STOP and ask the user where it is located.

Follow the guidelines in the 4 Pillars document when defining test scenarios and writing tests.

---

## Progress Tracking Format

```markdown
# Implementation Progress: [Task Name]

### Step 1: [Description]

**Status:** ✅ Done

**Tests Written (7 tests, all passing ✅):**

1. ✅ Test description
2. ✅ Test description
3. ✅ Test description

**Notes:** Brief summary of what was accomplished

### Step 2: [Description]

**Status:** 🔄 In Progress

**Tests Written (2 of 4 tests passing ✅):**

1. ✅ Test passing
2. ✅ Test passing
3. ⏳ Test not written yet
4. ⏳ Test failing

**Notes:** Current work in progress
```

**Status indicators:**

- ✅ Done - Step complete, tests passing, AC met
- 🔄 In Progress - Currently working on this step

**Test indicators:**

- ✅ Test passing
- ⏳ Test not written yet or failing

**Update frequency:**

- Add step to progress file when you start working on it (🔄 In Progress)
- Update tests list as you write them (⏳ → ✅)
- Mark step complete when done (🔄 In Progress → ✅ Done)
- Add notes about what was accomplished or issues encountered

**Important:** Don't pre-create steps in the progress file. The plan file already has all steps defined. Only add a step to progress when you actually start working on it.

### What to Avoid During Implementation

- ❌ Skipping tests for any step
- ❌ Moving to next step with failing tests
- ❌ Not updating progress file
- ❌ Writing tests without consulting project testing guidelines
- ❌ Pre-creating steps in progress file (only add when working on them)

