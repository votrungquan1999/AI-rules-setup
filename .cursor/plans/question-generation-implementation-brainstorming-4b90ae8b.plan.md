<!-- 4b90ae8b-5c67-47d8-bb96-7748e745eefc 0e22e005-d2fb-432a-a720-ea4d9f686c1b -->
# Question Generation Implementation Brainstorming

## Overview

Create one brainstorming document: `docs/brainstorming/question-generation-implementation.md` (~250-300 lines) that explores how to build the LLM-assisted question generation script.

## Document Structure (~250-300 lines)

### Layer 0: The Widest View - What Are We Building?

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
9. Web UI reads only from `questions/` (curated)

### Layer 1: Script Architecture

**Command Interface**:

- Command: `npm run generate-questions <rule-id>`
- Alternative: `npm run generate-questions -- --rule-id=brainstorming-patterns`
- Input: Rule ID from `rules/cursor/<category>/`
- Output: JSON file in `suggested_questions/`

**Input Processing**:

- Read `manifest.json` for rule metadata
- Read all `.mdc` files listed in manifest
- Concatenate content into context string
- No tokenization needed - just raw content passed to LLM

**Output Structure**:

```json
{
  "ruleId": "brainstorming-patterns",
  "questions": [
    {
      "id": "uses-brainstorming",
      "text": "Do you need structured brainstorming patterns?",
      "type": "yes-no",
      "tags": ["brainstorming", "problem-solving", "documentation"],
      "keywords": ["brainstorming", "structured-thinking", "zoom-out"]
    }
  ]
}
```

### Layer 2: LLM Provider Abstraction

**Why Abstraction?**

- Support multiple LLM providers (remote and local)
- Allow authors to choose based on cost/preference
- Decouple prompt logic from provider-specific APIs

**Provider Interface**:

```typescript
interface LLMProvider {
  name: string
  generateQuestions(ruleContent: string, schema: QuestionSchema): Promise<QuestionResponse>
}
```

**Supported Providers**:

1. **OpenAI API** (remote)

   - GPT-4 or GPT-3.5-turbo
   - Requires API key in env
   - Best quality but costs money

2. **Anthropic API** (remote)

   - Claude models
   - Requires API key in env
   - Good quality, different pricing

3. **Ollama** (local)

   - Runs locally on author's machine
   - Free, no API costs
   - Models: llama2, mistral, etc.
   - HTTP API on localhost:11434

4. **LM Studio** (local)

   - Runs locally with GUI
   - Free, no API costs
   - OpenAI-compatible API
   - HTTP API on localhost:1234

**Configuration Approach**:

Option A: Environment variables

```bash
LLM_PROVIDER=openai  # or anthropic, ollama, lmstudio
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
OLLAMA_URL=http://localhost:11434
LMSTUDIO_URL=http://localhost:1234
```

Option B: Config file (`.llmconfig.json`)

```json
{
  "provider": "ollama",
  "ollama": {
    "url": "http://localhost:11434",
    "model": "mistral"
  }
}
```

**Recommendation**: Environment variables for simplicity. Config file adds complexity.

**Error Handling**:

- Network timeout: Retry 3 times with exponential backoff
- Rate limit: Wait and retry with delay
- Invalid API key: Clear error message with setup instructions
- Local LLM not running: Detect and suggest starting Ollama/LM Studio
- Invalid JSON response: Show LLM output, ask author to retry

### Layer 3: Prompt Engineering

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

Include exact JSON schema so LLM knows the structure:

```json
{
  "questions": [
    {
      "id": "string (kebab-case, unique)",
      "text": "string (the question)",
      "type": "yes-no | choice | open-ended",
      "tags": ["string", "..."],
      "keywords": ["string", "..."],  // for yes-no only
      "options": [  // for choice only
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

### Layer 4: Question Schema Validation

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
  keywords: string[]  // required for yes-no
}

// Choice question type
interface ChoiceQuestion extends BaseQuestion {
  type: 'choice'
  options: Array<{
    text: string
    keywords: string[]
  }>  // required for choice, min 2 options
}

// Open-ended question type
interface OpenEndedQuestion extends BaseQuestion {
  type: 'open-ended'
  // No additional fields
}

// Union type for all questions
type Question = YesNoQuestion | ChoiceQuestion | OpenEndedQuestion

interface QuestionResponse {
  ruleId: string
  questions: Question[]
}
```

**Zod Schema** (Discriminated Union):

```typescript
import { z } from 'zod'

// Base schema with common fields
const BaseQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),  // kebab-case
  text: z.string().min(10),
  tags: z.array(z.string()).min(1),
})

// Yes/No question schema
const YesNoQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('yes-no'),
  keywords: z.array(z.string()).min(1),  // required, non-empty
})

// Choice question schema
const ChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('choice'),
  options: z.array(z.object({
    text: z.string(),
    keywords: z.array(z.string())
  })).min(2),  // required, at least 2 options
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

const QuestionResponseSchema = z.object({
  ruleId: z.string(),
  questions: z.array(QuestionSchema).min(1).max(10)
})
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

### Layer 5: Integration Points

**File System Operations**:

- Read rule files from `rules/cursor/<category>/<rule-id>/`
- Create `suggested_questions/` directory if not exists
- Write output to `suggested_questions/<rule-id>.json`
- Pretty-print JSON with 2-space indent

**No Changes Needed**:

- ✅ No changes to existing API (`src/app/api/`)
- ✅ No changes to web UI (`src/app/`, `src/components/`)
- ✅ No changes to search implementation (`src/lib/search.ts`)
- ✅ No changes to database or rules repository

**New Files Required**:

1. `src/scripts/generate-questions.ts` - Main script
2. `src/scripts/lib/llm-providers.ts` - Provider abstraction
3. `src/scripts/lib/prompt-templates.ts` - Prompt engineering
4. `src/scripts/lib/schema-validation.ts` - Zod schemas
5. Add script to `package.json`: `"generate-questions": "tsx src/scripts/generate-questions.ts"`

**Dependencies to Add**:

- `zod` - Runtime schema validation
- `@anthropic-ai/sdk` (optional, only if using Anthropic)
- `openai` (optional, only if using OpenAI)
- No dependencies for Ollama/LM Studio (just fetch API)

### Layer 6: Trade-offs and Decisions

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

### Layer 7: Open Questions

**Question Grouping**:

- Should questions be grouped by rule ID or by technology?
- Current design: one file per rule in `suggested_questions/`
- Authors manually organize into `questions/` as they see fit

**Question Reuse**:

- Multiple rules might need similar questions (e.g., "Do you use TypeScript?")
- Should script detect and suggest reusing existing questions?
- v1: No deduplication, authors handle manually

**Version Control**:

- How to handle question updates when rules change?
- Should script support regenerating questions?
- v1: Manual process, no versioning

**Quality Metrics**:

- How to measure if generated questions are good?
- Need manual testing initially
- Future: e2e tests for web UI flow

### Navigation Links

- Back to: [Question Generation Approaches](./question-generation.md)
- Related: [Question Storage Strategies](./question-storage.md)
- Related: [Web UI Flow](./web-ui-flow.md)

## Implementation Priority

**Phase 1: MVP**

1. Basic script with OpenAI provider only
2. Simple prompt without few-shot examples
3. Basic schema validation with Zod
4. Write to `suggested_questions/`

**Phase 2: Multi-Provider**

1. Add provider abstraction
2. Support Ollama (local LLM)
3. Add configuration system

**Phase 3: Quality Improvements**

1. Improve prompts with few-shot examples
2. Better error handling and retry logic
3. Add validation for question quality (not just schema)

**Phase 4: Tooling Enhancements**

1. Interactive mode (review and edit questions in terminal)
2. Batch generation for multiple rules
3. Question deduplication suggestions

### To-dos

- [ ] Create docs/brainstorming/question-generation-implementation.md with LLM-assisted script implementation details
- [ ] Create docs/brainstorming/testing-strategy.md with unit and integration testing approach