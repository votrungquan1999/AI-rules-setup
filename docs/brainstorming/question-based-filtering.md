# Question-Based Rule Filtering - Core Concept Exploration

> **Navigation**: [← Back to Problem Definition](./techstack-identification.md) | [Continue to Question Storage →](./question-storage.md)

This document explores the core concept of question-based filtering to identify relevant rules for a developer's techstack. See the [problem definition](./techstack-identification.md) for context.

---

## Layer 0: The Widest View - What Problem Are We Actually Solving?

At the highest level, we're solving a **guided selection problem** in the web UI: helping users efficiently identify which rules apply to their specific project context.

**Key Constraint**: We can't use runtime analysis (no file scanning, no real-time LLM calls) because:

- Projects may be newly initialized with no files
- Real-time LLM calls are too expensive
- Must work entirely offline in the web UI

**Core Insight**: The solution is [pre-generated questions stored separately](./question-storage.md), not runtime detection. The flow uses context-based fuzzy search:

1. User describes their app/project type → tokenized as base context
2. System fuzzy searches questions based on context → shows relevant questions
3. User answers questions → keywords/answers added to context
4. Final context fuzzy searches rules → ranked rule recommendations
5. User confirms their selections

Uses existing fuzzy search implementation from `src/lib/search.ts`

**Similar Patterns**:

- Online shopping filters (select category → filter by attributes)
- Yourselfy.com's selection flow (product discovery through questions)
- Form wizards with conditional questions

---

## Layer 1: Context-Based Question Flow in the Web UI

**Problem**: How do we help users find their Best Fit rules through the web UI interface?

**Current Approach**: Manual browsing/searching

- Pros: User has full control
- Cons: Requires knowledge of available rules, poor discoverability

**New Approach**: Context-based discovery flow

1. **Initial Description**: User describes project → tokenized as base context
2. **Question Discovery**: System fuzzy searches questions based on context
3. **Answer Collection**: User answers → keywords/answers added to context
4. **Rule Discovery**: Final context fuzzy searches rules
5. **Selection**: User reviews and confirms selections

**Key Requirements**:

- Questions must be pre-generated (no runtime LLM)
- Questions stored separately in `questions/` folder (see [question storage strategies](./question-storage.md))
- Web UI uses fuzzy search for both questions and rules
- One round of questions (not progressive in v1)

---

## Layer 2: Question Types and Context Building

**Core Concept**: Questions must have tags for fuzzy search and keywords for context building.

### Question Types

Questions stored in separate JSON files grouped by relevancy. Each question type builds context differently:

**Yes/No Questions**:

- Example: "Are you using TypeScript?"
- Has `keywords` array: `["typescript", "ts"]`
- If answer is "yes": Add keywords to context
- Must have `tags` for fuzzy search

**Choice Questions**:

- Example: "What CSS approach are you using?"
- Has `options` array with keywords per option
- Selected option's keywords added to context
- Must have `tags` for fuzzy search

**Open-ended Questions**:

- Example: "Describe your project briefly"
- Full user answer text added to context
- Must have `tags` for fuzzy search

### Storage Location

- Questions stored in `questions/` folder (author-curated)
- LLM generates questions to `suggested_questions/` folder for review
- Author manually moves/edits questions to `questions/` folder

For details on how questions are generated, see [question generation approaches](./question-generation.md).

For details on storage structure, see [question storage strategies](./question-storage.md).

---

**Continue reading:** [Question Storage Strategies →](./question-storage.md)
