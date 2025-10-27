# Question Generation Implementation Details

> **Navigation**: [← Back to Question Generation Approaches](./question-generation.md) | [Related: Question Storage →](./question-storage.md) | [Related: Web UI Flow →](./web-ui-flow.md)

This document explores implementation details for building the LLM-assisted question generation script for rule authors.

---

## Layer 0: The Widest View - What Are We Building?

**Problem**: Rule authors need a simple tool to generate relevant questions for their rules

**Goal**: Script that takes rule content → sends to LLM → outputs valid question JSON

**Core principle**:

- Questions generated at authoring time (not runtime)
- LLM does the heavy lifting (understanding rule context, generating relevant questions)
- Author reviews and curates the output

**Workflow**:

1. Author creates/updates a rule
2. Author runs: `npm run generate-questions <rule-id>`
3. Script reads rule files (manifest.json, .mdc files)
4. Script injects rule content into LLM prompt with schema instructions
5. LLM returns questions with proper structure (tags, keywords, etc.)
6. Script validates JSON schema
7. Script writes to `suggested_questions/<rule-id>.json`
8. Author reviews, edits, moves to `questions/` folder
9. Web UI reads only from `questions/` (curated) - see [Question Storage](./question-storage.md#storage-strategy-questions-stored-separately--chosen) for details

---

## Layer 1: Script Architecture

**Command Interface**:

- Command: `npm run generate-questions <rule-id>`
- Alternative: `npm run generate-questions -- --rule-id=brainstorming-patterns`
- Input: Rule ID from `rules/cursor/<category>/`
- Output: JSON file in `suggested_questions/` containing all questions for that rule

**Input Processing**:

- Read `manifest.json` for rule metadata
- Read all `.mdc` files listed in manifest
- Concatenate content into context string
- No tokenization needed - just raw content passed to LLM

**Output Structure**:

The script generates 3-5 questions per rule and writes them all to a single file. Each script run produces one file with multiple questions.

For complete question schema details and examples, see [Question Storage](./question-storage.md#example-structure) and [Question Types](./question-based-filtering.md#question-types).

```json
{
  "questions": [
    {
      "id": "uses-brainstorming",
      "text": "Do you need structured brainstorming patterns?",
      "type": "yes-no",
      "tags": ["brainstorming", "problem-solving", "documentation"],
      "keywords": ["brainstorming", "structured-thinking", "zoom-out"]
    },
    {
      "id": "needs-problem-definition",
      "text": "Do you document problem definitions before solving?",
      "type": "yes-no",
      "tags": ["problem-solving", "documentation"],
      "keywords": ["problem-definition", "documentation", "requirements"]
    }
  ]
}
```

---

## Layer 2: Prompt Engineering

**The Critical Part**: Prompt quality determines output quality

**Context Construction**:

```typescript
const context = `
Rule ID: ${manifest.id}
Category: ${manifest.category}
Tags: ${manifest.tags.join(', ')}
Description: ${manifest.description}

Rule Content:
${ruleFileContents.join('\n\n---\n\n')}
`
```

**System Prompt Design**:

For context on how questions are used in the web UI flow, see [Web UI Flow](./web-ui-flow.md).

```
You are a question generation assistant for an AI rules library.

Your task: Generate 3-5 questions that help developers determine if this rule is relevant to their project.

Question Types:
1. yes-no: Binary questions. Must include "keywords" array (added to search context if user answers yes)
2. choice: Multiple choice. Must include "options" array with text and keywords for each
3. open-ended: Free text. Full answer added to search context.

All questions MUST include:
- "tags": Array of relevant search tags (technology names, concepts, patterns)
- "text": Clear, concise question text
- "type": One of: yes-no, choice, open-ended

Requirements:
- Questions should help identify if developer needs this rule
- Tags should match common terms developers use
- Keywords should include aliases and variations
- Keep questions clear and unambiguous
- Focus on technology stack, patterns, and use cases

Return valid JSON matching this schema:
{schema}
```

**Schema in Prompt**:

Include exact JSON schema so LLM knows the structure. For detailed examples of each question type, see [Question Storage Examples](./question-storage.md#example-structure).

```json
{
  "questions": [
    {
      "id": "string (kebab-case, unique)",
      "text": "string (the question)",
      "type": "yes-no | choice | open-ended",
      "tags": ["string", "..."],
      "keywords": ["string", "..."], // for yes-no only
      "options": [
        // for choice only
        { "text": "string", "keywords": ["string", "..."] }
      ]
    }
  ]
}
```

**Few-Shot Examples**:

Include 1-2 examples in the prompt for better results:

```
Example for a React hooks rule:
{
  "id": "uses-react-hooks",
  "text": "Are you using React hooks in your project?",
  "type": "yes-no",
  "tags": ["react", "hooks", "frontend"],
  "keywords": ["react", "hooks", "useState", "useEffect"]
}
```

**Parameter Tuning**:

- **Temperature**: 0.7 (balance creativity and consistency)
- **Max tokens**: 1500 (enough for 3-5 questions)
- **Top P**: 0.9 (nucleus sampling for quality)
- **Frequency penalty**: 0.5 (reduce repetition)

---

## Layer 3: Question Schema Validation

**Why Validation?**

LLMs can hallucinate or return malformed JSON. Validation catches errors before author review.

**TypeScript Types** (Discriminated Union):

```typescript
// Base fields common to all question types
interface BaseQuestion {
  id: string
  text: string
  tags: string[]
}

// Yes/No question type
interface YesNoQuestion extends BaseQuestion {
  type: 'yes-no'
  keywords: string[] // required for yes-no
}

// Choice question type
interface ChoiceQuestion extends BaseQuestion {
  type: 'choice'
  options: Array<{
    text: string
    keywords: string[]
  }> // required for choice, min 2 options
}

// Open-ended question type
interface OpenEndedQuestion extends BaseQuestion {
  type: 'open-ended'
  // No additional fields
}

// Union type for all questions
type Question = YesNoQuestion | ChoiceQuestion | OpenEndedQuestion

// Response contains array of questions only, no ruleId needed
type QuestionResponse = Question[]
```

**Zod Schema** (Discriminated Union):

```typescript
import { z } from 'zod'

// Base schema with common fields
const BaseQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), // kebab-case
  text: z.string().min(10),
  tags: z.array(z.string()).min(1),
})

// Yes/No question schema
const YesNoQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('yes-no'),
  keywords: z.array(z.string()).min(1), // required, non-empty
})

// Choice question schema
const ChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('choice'),
  options: z
    .array(
      z.object({
        text: z.string(),
        keywords: z.array(z.string()),
      })
    )
    .min(2), // required, at least 2 options
})

// Open-ended question schema
const OpenEndedQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('open-ended'),
})

// Discriminated union
const QuestionSchema = z.discriminatedUnion('type', [
  YesNoQuestionSchema,
  ChoiceQuestionSchema,
  OpenEndedQuestionSchema,
])

// Response is just an array of questions, no wrapper object needed
const QuestionResponseSchema = z.array(QuestionSchema).min(1).max(10)
```

**Benefits of Discriminated Union**:

- ✅ Type-safe: TypeScript knows which fields are available based on `type`
- ✅ No optional fields: Each type has exactly the fields it needs
- ✅ Better validation: Zod enforces required fields per type automatically
- ✅ Clearer intent: Schema explicitly shows what each type requires

**Validation Errors**:

- Invalid JSON: Show raw LLM output, suggest retry
- Schema mismatch: Show validation errors, suggest manual fix
- Missing required fields: List missing fields clearly
- Success: Confirm file written to `suggested_questions/`

---

## Layer 4: Trade-offs and Decisions

**Why Not Real-Time Generation?**

- ❌ Too expensive at runtime
- ❌ Adds latency to web UI
- ✅ Authoring-time generation: one-time cost, infinite reuse

**Why Manual Review Step?**

- LLMs can generate irrelevant questions
- Authors know their rules best
- Quality control before users see questions
- `suggested_questions/` → `questions/` provides clear workflow

**Why Support Local LLMs?**

- Free for authors (no API costs)
- Privacy (rule content doesn't leave machine)
- Fast iteration during authoring
- Democratizes access (anyone can generate questions)

**Why Simple Provider Abstraction?**

- Keep implementation straightforward
- Easy to add new providers later
- Don't over-engineer for unknown future needs
