# Data Types

This document defines key interfaces and type definitions used throughout the codebase.

**Related Documentation:**
- [CLI Flows](./cli-flows.md) - CLI types usage
- [Rule System](./rule-system.md) - Rule types usage
- [Skills & Workflows](./skills-workflows.md) - Skills/workflows types usage
- [Question System](./question-system.md) - Question types usage
- [Database Patterns](./database-patterns.md) - Database types usage

## Core Types

### Manifest

**Location:** `src/cli/lib/types.ts`, `src/server/types.ts`

The core metadata structure for rule categories:

```typescript
interface Manifest {
  id: string;                    // Unique identifier (kebab-case)
  category: string;              // Category name (typescript, react, etc.)
  tags: string[];               // Search keywords
  description: string;          // Human-readable description
  files: ManifestFile[];        // List of files to install
  dependencies?: string[];      // Optional dependency rule IDs
  conflicts?: string[];         // Optional conflicting rule IDs
}

interface ManifestFile {
  path: string;                 // Relative path in repository
  description: string;          // Purpose of the file
}
```

**Example:**
```json
{
  "id": "typescript-strict",
  "category": "typescript",
  "tags": ["typescript", "strict", "type-safety"],
  "description": "Strict TypeScript configuration and patterns",
  "files": [
    {
      "path": "strict-mode.md",
      "description": "Strict mode configuration"
    }
  ],
  "dependencies": ["javascript-basics"],
  "conflicts": ["typescript-flexible"]
}
```

## CLI Types

**Location:** `src/cli/lib/types.ts`

### Config

Project configuration stored in `.ai-rules.json`:

```typescript
interface Config {
  version: string;              // Config schema version
  agent: string;                // Selected AI agent
  categories: string[];         // Installed category IDs
  skills?: string[];            // Installed skill names
  workflows?: string[];         // Installed workflow names
}
```

### AIAgent

Enum of supported AI agents:

```typescript
enum AIAgent {
  CURSOR = "cursor",
  WINDSURF = "windsurf",
  AIDER = "aider",
  CONTINUE = "continue",
  CODY = "cody",
  CLAUDE_CODE = "claude-code",
  ANTIGRAVITY = "antigravity"
}
```

### ToolConventions

Configuration for each AI agent's file conventions:

```typescript
interface ToolConventions {
  baseDir: string;              // Base directory (e.g., ".cursor")
  extension: string;            // File extension
  renameFile: (source: string, category: string) => string;
}
```

**Example:**
```typescript
const cursorConventions: ToolConventions = {
  baseDir: ".cursor",
  extension: ".mdc",
  renameFile: (source) => source  // No renaming
};
```

### OverwriteStrategy

How to handle file conflicts:

```typescript
type OverwriteStrategy = "prompt" | "force" | "skip";
```

## Server Types

**Location:** `src/server/types.ts`

### RuleFile

Individual rule file with content:

```typescript
interface RuleFile {
  filename: string;
  content: string;
}
```

### RuleCategory

A category with manifest and files:

```typescript
interface RuleCategory {
  manifest: Manifest;
  files: RuleFile[];
}
```

### RuleAgent

All categories for an agent:

```typescript
interface RuleAgent {
  categories: {
    [categoryName: string]: RuleCategory;
  };
  skills?: Array<{ name: string; content: string }>;
  workflows?: Array<{ name: string; content: string }>;
}
```

### RulesData / RulesResponse

Top-level data structure for all rules, skills, and workflows:

```typescript
// Server-side (src/server/types.ts)
interface RulesData {
  agents: {
    [agentName: string]: RuleAgent;
  };
}

// Client-side (src/cli/lib/api-client.ts)
interface RulesResponse {
  agents: {
    [agentName: string]: {
      categories: { [categoryName: string]: { manifest: Manifest; files: Array<{ filename: string; content: string }> } };
      skills?: Array<{ name: string; content: string }>;
      workflows?: Array<{ name: string; content: string }>;
    };
  };
}
```

**Example:**
```typescript
{
  agents: {
    cursor: {
      categories: {
        typescript: {
          manifest: { ... },
          files: [
            { filename: "strict.md", content: "..." }
          ]
        }
      }
    }
  }
}
```

### RulesDataToStore

Data structure for storing individual category in database:

```typescript
interface RulesDataToStore {
  agent: string;
  category: string;
  manifest: Manifest;
  files: RuleFile[];
  githubCommitSha: string;
}
```

## Database Document Types

### StoredRulesDocument

MongoDB document for cached rules:

```typescript
interface StoredRulesDocument {
  _id?: unknown;            // MongoDB ObjectId
  agent: string;
  category: string;
  manifest: Manifest;
  files: RuleFile[];
  githubCommitSha: string;
  lastFetched: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### QuestionDocument

MongoDB document for questions:

```typescript
interface QuestionDocument {
  _id?: unknown;            // MongoDB ObjectId
  id: string;
  text: string;
  type: "yes-no" | "choice" | "open-ended";
  tags: string[];
  keywords?: string[];
  options?: Array<{
    text: string;
    keywords: string[];
  }>;
  sourceFile: string;
  lastFetched: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Question Types

**Location:** `src/cli/lib/question-types.ts`

### BaseQuestion

Common fields for all questions:

```typescript
interface BaseQuestion {
  id: string;          // kebab-case identifier
  text: string;        // Question text
  tags: string[];      // Search tags
}
```

### YesNoQuestion

Binary question with keywords:

```typescript
interface YesNoQuestion extends BaseQuestion {
  type: "yes-no";
  keywords: string[];  // Added to context if answered "yes"
}
```

### ChoiceQuestion

Multiple choice with keywords per option:

```typescript
interface ChoiceQuestion extends BaseQuestion {
  type: "choice";
  options: Array<{
    text: string;
    keywords: string[];
  }>;
}
```

### OpenEndedQuestion

Free-text question:

```typescript
interface OpenEndedQuestion extends BaseQuestion {
  type: "open-ended";
}
```

### Question Union

Discriminated union of all question types:

```typescript
type Question = YesNoQuestion | ChoiceQuestion | OpenEndedQuestion;
```

### QuestionResponse

Response from LLM question generation:

```typescript
interface QuestionResponse {
  questions: Question[];
}
```

### QuestionAnswer

User's answer to a question:

```typescript
type QuestionAnswer =
  | { type: "yes-no"; answer: boolean }
  | { type: "choice"; answer: number }  // Index of selected option
  | { type: "open-ended"; answer: string };
```

## Search Types

**Location:** `src/lib/search.ts`

### SearchResult

Search result with relevance score:

```typescript
interface SearchResult {
  manifest: Manifest;
  score: number;        // 0-100
}
```

## State Types

### SearchState

**Location:** `src/lib/search.state.tsx`

```typescript
interface SearchState {
  description: string;
  manifests: Manifest[];
  questions: Question[];
  answers: Record<string, QuestionAnswer>;
  enrichedContext: string[];
}
```

### SelectionState

**Location:** `src/lib/selection.state.tsx`

```typescript
interface SelectionState {
  agent: string;
  selectedIds: Set<string>;
  overwriteStrategy: OverwriteStrategy;
}
```

## Type Guards

Useful type guards for discriminated unions:

```typescript
function isYesNoQuestion(q: Question): q is YesNoQuestion {
  return q.type === "yes-no";
}

function isChoiceQuestion(q: Question): q is ChoiceQuestion {
  return q.type === "choice";
}

function isOpenEndedQuestion(q: Question): q is OpenEndedQuestion {
  return q.type === "open-ended";
}
```

## Validation

Types are validated at runtime using Zod schemas:

**Location:** `src/cli/lib/question-schema.ts`

```typescript
const QuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    text: z.string().min(10).max(200),
    type: z.literal("yes-no"),
    tags: z.array(z.string()).min(1),
    keywords: z.array(z.string()).min(1)
  }),
  z.object({
    id: z.string().min(1),
    text: z.string().min(10).max(200),
    type: z.literal("choice"),
    tags: z.array(z.string()).min(1),
    options: z.array(z.object({
      text: z.string().min(1),
      keywords: z.array(z.string()).min(1)
    })).min(2)
  }),
  z.object({
    id: z.string().min(1),
    text: z.string().min(10).max(200),
    type: z.literal("open-ended"),
    tags: z.array(z.string()).min(1)
  })
]);
```
