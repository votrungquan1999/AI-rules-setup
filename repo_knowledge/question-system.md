# Question System

This document describes the question generation and refinement system.

**Related Documentation:**
- [Search & Selection](./search-selection.md) - How questions refine search
- [Data Types](./data-types.md) - Question type definitions

## Overview

The question system helps users refine rule selection through guided questions. Questions are generated using a local Ollama LLM and stored for reuse.

## Question Generation Command

**Command:** `npm run generate-questions`

**Location:** `src/cli/commands/generate-questions.ts`

### Usage

```bash
# Generate questions for a specific rule directory
npx tsx src/cli/commands/generate-questions.ts rules/cursor/brainstorming --model llama3.2

# With custom model
npx tsx src/cli/commands/generate-questions.ts rules/cursor/react --model llama3
```

### Process Flow

```
1. Read Rule Content
   ├─ Load rule directory
   ├─ Read manifest.json
   └─ Read all rule files

2. Build Prompt
   ├─ Construct system prompt with guidelines
   ├─ Include rule content
   └─ Add JSON schema requirements

3. Call Ollama LLM
   ├─ POST to /api/generate
   ├─ Temperature: 0.7
   ├─ Max tokens: 1500
   └─ Timeout: 3 minutes

4. Validate Response
   ├─ Extract JSON from response
   ├─ Validate with Zod schema
   └─ Handle validation errors

5. Write Output
   ├─ Save to suggested_questions/{rule-id}.json
   └─ Log success/failure
```

## Ollama Integration

**Location:** `src/cli/lib/ollama-client.ts`

### Configuration

```typescript
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || "180000"); // 3 minutes
```

### Key Functions

#### `checkOllamaHealth()`

Verifies Ollama server is running before generation:

```bash
# Check if server responds
GET http://localhost:11434/api/tags
```

#### `callOllama(prompt, model)`

Makes request to Ollama API:

```typescript
POST http://localhost:11434/api/generate
{
  "model": "llama3.2",
  "prompt": "...",
  "temperature": 0.7,
  "max_tokens": 1500,
  "stream": false
}
```

#### `extractJsonFromResponse(response)`

Robust JSON extraction handles multiple formats:

1. **Pure JSON** - Parse directly
2. **Markdown code blocks** - Extract from ```json ... ```
3. **Text wrapping** - Find JSON within explanatory text

## Question Schema

**Location:** `src/cli/lib/question-schema.ts`

### Question Types

#### 1. Yes/No Questions

```typescript
{
  id: "uses-typescript",
  text: "Are you using TypeScript?",
  type: "yes-no",
  tags: ["typescript", "language"],
  keywords: ["typescript", "ts", "type-safety"]
}
```

**Behavior:** If answered "yes", keywords are added to search context.

#### 2. Choice Questions

```typescript
{
  id: "css-framework",
  text: "Which CSS framework are you using?",
  type: "choice",
  tags: ["css", "styling"],
  options: [
    {
      text: "Tailwind CSS",
      keywords: ["tailwind", "utility-first", "tw"]
    },
    {
      text: "CSS Modules",
      keywords: ["css-modules", "scoped"]
    },
    {
      text: "Styled Components",
      keywords: ["styled-components", "css-in-js"]
    }
  ]
}
```

**Behavior:** Keywords from selected option are added to search context.

#### 3. Open-Ended Questions

```typescript
{
  id: "project-description",
  text: "Describe your project in a few words",
  type: "open-ended",
  tags: ["project", "overview"]
}
```

**Behavior:** Full answer text is tokenized and added to search context.

### Validation Rules

- **ID:** kebab-case, 1+ characters
- **Text:** 10-200 characters
- **Tags:** Minimum 1 tag per question
- **Keywords:** Minimum 1 keyword per yes-no question or choice option
- **Choice Options:** Minimum 2 options
- **Response:** 1-10 questions per rule

## Prompt Engineering

**Location:** `src/cli/lib/question-prompt.ts`

### System Prompt Strategy

The prompt emphasizes:

1. **High-level questions first** - Detect if user needs the technology
2. **Tech-specific detection** - First question must detect technology usage
3. **Clear decision making** - Questions should clearly lead to rule selection
4. **Contextual keywords** - Each answer provides keywords for search refinement

### Example Structure

```markdown
Your task is to generate 1-10 questions...

Guidelines:
- First question: detect if user's project uses this technology
- Focus on high-level needs, not implementation details
- Questions should be easy to answer (yes/no, multiple choice)
- Include relevant keywords for search refinement

Examples:
[Detailed examples for TypeScript, React, CSS frameworks, etc.]

Output Format:
{
  "questions": [
    {
      "id": "...",
      "text": "...",
      "type": "...",
      ...
    }
  ]
}
```

**~210 lines of detailed instructions and examples.**

## Question Storage

**Database:** MongoDB `questions` collection

**Location:** `src/server/questions-repository.ts`

### Document Structure

```typescript
interface QuestionDocument {
  id: string;              // Question ID
  text: string;           // Question text
  type: "yes-no" | "choice" | "open-ended";
  tags: string[];         // Search tags
  keywords?: string[];    // For yes-no
  options?: Array<{       // For choice
    text: string;
    keywords: string[];
  }>;
  sourceFile: string;     // Original rule file
  lastFetched: Date;      // Last sync from GitHub
  createdAt: Date;
  updatedAt: Date;
}
```

### Operations

- **`findAllStoredQuestions()`** - Fetch all questions from database
- **`fetchQuestionsFromGitHub()`** - Fetch from `/questions` folder in repo
- **`cacheQuestionsInDatabase()`** - Upsert questions by ID
- **`clearQuestionsCache()`** - Delete all questions

## Question Workflow in Web UI

See [Search & Selection](./search-selection.md) for how questions are used in the search flow.

**Basic Flow:**

```
1. User enters initial search query
   ↓
2. System searches questions by tags
   ↓
3. Display relevant questions to user
   ↓
4. User answers questions
   ↓
5. Build enriched context (query + answer keywords)
   ↓
6. Re-run search with enriched context
   ↓
7. Display refined results
```

## Future Enhancements

From system design docs:

- **Machine Learning** - Learn from user behavior to improve questions
- **Automatic generation** - Generate questions on-the-fly for new rules
- **A/B testing** - Test different question strategies
- **Personalization** - Remember user preferences across sessions
