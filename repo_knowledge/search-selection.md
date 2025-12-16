# Search & Selection System

This document describes the search algorithm and selection state management.

**Related Documentation:**
- [Question System](./question-system.md) - How questions refine search
- [Web UI](./web-ui.md) - How search is used in UI
- [Data Types](./data-types.md) - Search-related types

## Search Algorithm

**Location:** `src/lib/search.ts`

### Multi-Token Fuzzy Search

The search algorithm tokenizes queries and aggregates scores for better relevance.

#### Process Flow

```
1. Tokenization
   ├─ Split query by whitespace
   ├─ Remove stopwords (English: "the", "a", "is", etc.)
   └─ Filter tokens < 2 characters

2. Fuse.js Search (per token)
   ├─ Search fields:
   │  ├─ tags (weight: 0.4)
   │  ├─ descriptionTokens (weight: 0.4)
   │  └─ category (weight: 0.2)
   ├─ Threshold: 0.4 (moderate fuzziness)
   └─ ignoreLocation: true

3. Score Aggregation
   ├─ For each manifest:
   │  └─ Sum scores from matching tokens
   └─ Normalize: (aggregated score / max possible) * 100

4. Sorting
   └─ Sort by normalized score (descending)
```

### Key Functions

#### `searchRules(query, manifests)`

```typescript
function searchRules(
  query: string,
  manifests: Manifest[]
): SearchResult[]
```

**Returns:**
```typescript
interface SearchResult {
  manifest: Manifest;
  score: number;  // 0-100
}
```

#### `searchQuestions(contextTokens, questions)`

```typescript
function searchQuestions(
  contextTokens: string[],
  questions: Question[]
): Question[]
```

Searches questions by tags to find relevant refinement questions.

### Configuration

```typescript
const fuseOptions = {
  keys: [
    { name: 'tags', weight: 0.4 },
    { name: 'descriptionTokens', weight: 0.4 },
    { name: 'category', weight: 0.2 }
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true
};
```

## Search State

**Location:** `src/lib/search.state.tsx`

### State Structure

```typescript
interface SearchState {
  description: string;          // User's search query
  manifests: Manifest[];        // All available manifests
  questions: Question[];        // Available questions
  answers: Record<string, QuestionAnswer>;  // User's answers
  enrichedContext: string[];    // Tokenized context for search
}
```

### Actions

```typescript
type SearchAction =
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_ANSWER'; payload: { questionId: string; answer: QuestionAnswer } }
  | { type: 'CLEAR_ANSWERS' };
```

### Context Provider

```tsx
<SearchProvider initialManifests={manifests} initialQuestions={questions}>
  {children}
</SearchProvider>
```

### Hooks

#### `useSearchState()`

Access full search state:

```typescript
const { description, answers, enrichedContext } = useSearchState();
```

#### `useSetDescription(description)`

Update search query:

```typescript
const setDescription = useSetDescription();
setDescription("nextjs typescript server components");
```

#### `useSetAnswer(questionId, answer)`

Record question answer:

```typescript
const setAnswer = useSetAnswer();
setAnswer("uses-typescript", { type: "yes-no", answer: true });
```

#### `useSearchResults()`

Get search results with scores:

```typescript
const results = useSearchResults();
// Returns: Array<{ manifest: Manifest, score: number }>
```

## Enriched Context Building

The search context is enriched with keywords from question answers:

### From Description

```typescript
const tokens = tokenize(description);
// "nextjs typescript" → ["nextjs", "typescript"]
```

### From Yes/No Answers

If answered "yes", add keywords:

```typescript
{
  id: "uses-typescript",
  type: "yes-no",
  keywords: ["typescript", "ts", "type-safety"]
}

// If answered yes:
enrichedContext.push(...keywords);
```

### From Choice Answers

Add keywords from selected option:

```typescript
{
  id: "css-framework",
  type: "choice",
  options: [
    {
      text: "Tailwind CSS",
      keywords: ["tailwind", "utility-first", "tw"]
    }
  ]
}

// If selected "Tailwind CSS":
enrichedContext.push(...selectedOption.keywords);
```

### From Open-Ended Answers

Tokenize full answer text:

```typescript
const answerTokens = tokenize(answer);
enrichedContext.push(...answerTokens);
```

## Selection State

**Location:** `src/lib/selection.state.tsx`

### State Structure

```typescript
interface SelectionState {
  agent: string;                        // Selected AI agent
  selectedIds: Set<string>;             // Selected rule IDs
  overwriteStrategy: OverwriteStrategy; // "prompt" | "force" | "skip"
}
```

### Actions

```typescript
type SelectionAction =
  | { type: 'SET_AGENT'; payload: string }
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_OVERWRITE_STRATEGY'; payload: OverwriteStrategy };
```

### Hooks

#### `useSelectionState()`

Access selection state:

```typescript
const { agent, selectedIds, overwriteStrategy } = useSelectionState();
```

#### `useToggleSelection(ruleId)`

Toggle rule selection:

```typescript
const toggleSelection = useToggleSelection();
toggleSelection("typescript-strict");
```

#### `useSelectAll(manifests)`

Select all manifests:

```typescript
const selectAll = useSelectAll();
selectAll(manifests);
```

#### `useGeneratedCommand()`

Generate CLI command from selection:

```typescript
const command = useGeneratedCommand();
// Returns: "npx @quanvo99/ai-rules@latest init --agent cursor --categories typescript,react --overwrite-strategy force"
```

## Command Generation

**Location:** `src/lib/command-generator.ts`

### Logic

```typescript
function generateCommand(
  agent: string,
  selectedIds: string[],
  allManifestIds: string[],
  overwriteStrategy: OverwriteStrategy
): string {
  // If all categories selected, use "all" shorthand
  const categoriesArg = selectedIds.length === allManifestIds.length
    ? "all"
    : selectedIds.join(",");

  return `npx @quanvo99/ai-rules@latest init --agent ${agent} --categories ${categoriesArg} --overwrite-strategy ${overwriteStrategy}`;
}
```

### Input Sanitization

All inputs are sanitized to prevent command injection:

```typescript
function sanitizeInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_,]/g, '');
}
```

## Search Flow Example

```
1. User types: "nextjs server components"
   ↓
2. Tokenize: ["nextjs", "server", "components"]
   ↓
3. Search manifests with each token
   ↓
4. Display results with scores
   ↓
5. Show relevant questions (e.g., "Are you using App Router?")
   ↓
6. User answers: "Yes"
   ↓
7. Add keywords: ["app-router", "rsc", "server-actions"]
   ↓
8. Re-search with enriched context
   ↓
9. Display refined results
```

## Performance Considerations

### Debouncing

Search input should be debounced to avoid excessive re-renders:

```typescript
const debouncedSearch = useDebouncedCallback(
  (value: string) => setDescription(value),
  300  // 300ms delay
);
```

### Memoization

Search results are memoized in the reducer to avoid recalculation:

```typescript
const searchResults = useMemo(
  () => searchRules(enrichedContext.join(' '), manifests),
  [enrichedContext, manifests]
);
```

### Lazy Loading

Questions are loaded on-demand when user shows interest in refinement.
