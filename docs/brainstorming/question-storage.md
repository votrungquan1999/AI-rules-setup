# Question Storage and Contextual Matching

> **Navigation**: [← Back to Core Concept](./question-based-filtering.md) | [Continue to Question Generation →](./question-generation.md)

This document explores how and where questions are stored, and how user answers are used to build context for rule recommendations.

---

## Why Question Storage Matters

The choice of how to store questions directly impacts:

- **Maintainability**: How easy it is to update questions as rules evolve
- **Performance**: How quickly we can load and filter rules
- **Scalability**: How well the system handles growing numbers of rules and questions
- **Flexibility**: How easily we can adapt the matching algorithm

Since we've determined that [questions must be pre-generated](./question-based-filtering.md#layer-0-the-widest-view---what-problem-are-we-actually-solving) (not runtime detected), we need a storage strategy that supports this approach.

---

## Storage Strategy: Questions Stored Separately ✅ **CHOSEN**

### Approach

Questions are stored in separate JSON files, grouped by relevancy in the `questions/` folder. Authors manage the folder structure and naming as they see fit.

### Example Structure

**questions/frontend/react.json**:

```json
{
  "questions": [
    {
      "id": "uses-nextjs",
      "text": "Are you using Next.js?",
      "type": "yes-no",
      "tags": ["nextjs", "react", "framework"],
      "keywords": ["nextjs", "next.js", "vercel"]
    },
    {
      "id": "uses-typescript",
      "text": "Are you using TypeScript?",
      "type": "yes-no",
      "tags": ["typescript", "language", "type-system"],
      "keywords": ["typescript", "ts"]
    },
    {
      "id": "css-approach",
      "text": "What CSS approach are you using?",
      "type": "choice",
      "tags": ["styling", "css"],
      "options": [
        { "text": "Tailwind CSS", "keywords": ["tailwind", "tailwindcss"] },
        { "text": "styled-components", "keywords": ["styled-components"] },
        { "text": "CSS Modules", "keywords": ["css-modules"] }
      ]
    },
    {
      "id": "project-description",
      "text": "Describe your project briefly",
      "type": "open-ended",
      "tags": ["general", "description"]
    }
  ]
}
```

### Key Requirements

- Each file should be under 300 lines
- All questions must have `tags` array for fuzzy search matching
- Yes/no questions must have `keywords` array (added to context if user answers yes)
- Choice questions have `options` array (selected option's keywords added to context)
- Open-ended questions have full answer added to context
- UI reads only from `questions/` folder (author-curated)
- LLM-generated questions written to `suggested_questions/` folder for review

### When to Use

- When questions are commonly reused across multiple rules
- When you need centralized question management
- When questions and rules evolve independently
- For scalable, maintainable question storage

---

## Contextual Matching: How User Answers Map to Rules

The system uses context-based fuzzy search instead of relevance scoring. User answers build up a context object that is then used to fuzzy search both questions and rules.

### Context Building Flow

1. **Initial description**: User provides free-text description → tokenized and stored as base context
2. **Question discovery**: Context tokens fuzzy search questions (using same Fuse.js approach as rules)
3. **Answer collection**: User answers questions → keywords/choices added to context
4. **Rule discovery**: Enriched context fuzzy searches rules (using existing `search.ts` implementation)

### Question Type Context Building

**Yes/No Questions**:

- If answer is "yes": Add question's `keywords` array to context
- If answer is "no": Do nothing

**Choice Questions**:

- Add selected option's `keywords` array to context

**Open-ended Questions**:

- Add full user answer text to context

### Fuzzy Search Implementation

The system reuses the existing fuzzy search from `src/lib/search.ts`:

```typescript
// Search questions using context
function searchQuestions(context: string): QuestionResult[] {
  // Tokenize context
  const queryTokens = tokenize(context)

  // Use Fuse.js to search questions by tags field
  return fuse.search(queryTokens, { keys: ['tags'] })
}

// Search rules using enriched context
function searchRules(context: string): RuleResult[] {
  // Reuse existing searchRules() function
  return searchRules(context, manifests)
}
```

### Matching Rules (Not Filtering)

- Context is continuously built as user answers questions
- Final enriched context used to fuzzy search rules
- Rules ranked by relevance score (0-100)
- User sees top-matching rules and can refine selection

---

## Storage Strategy: Questions Stored With Rules (NOT CHOSEN)

### Approach

Questions embedded directly in each rule's `manifest.json` file. This approach was considered but not chosen.

### Cons

- ❌ Tight coupling: Can't easily reuse questions across rules
- ❌ Duplication: Similar questions repeated across rules
- ❌ Harder to evolve: Changing question structure affects all manifests
- ❌ No cross-rule analytics: Harder to see question patterns across rules
- ❌ Questions hard to discover independently of rules

---

**Continue reading:** [Question Generation Approaches →](./question-generation.md)
