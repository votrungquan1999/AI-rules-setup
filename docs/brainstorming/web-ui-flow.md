# Web UI Flow and User Experience

> **Navigation**: [← Back to Question Generation](./question-generation.md) | [Back to Problem Definition →](./techstack-identification.md)

This document outlines the user experience flow in the web UI where questions and answers build context to discover relevant rules.

---

## Overview

The guided selection flow transforms manual browsing into a context-based discovery system:

**Current State**: Users must know which rules exist and manually select categories.

**New State**: Users describe app → answer questions → system discovers relevant rules through fuzzy search.

---

## Step 1: Initial Description

### User Experience

```
User opens web UI → Sees text input: "Describe your app or project"
User types: "Building a Next.js web app with TypeScript and Tailwind CSS"
```

### Purpose

Gather initial context to start the question discovery process.

### Implementation

- Simple text input field
- User provides free-text description
- System tokenizes description using existing tokenization from `search.ts`
- Tokens stored as base context

### Tokenization Example

```typescript
// User input: "Next.js web app with TypeScript and Tailwind CSS"
// Tokenized context: ["next.js", "web", "app", "typescript", "tailwind", "css"]
```

---

## Step 2: Question Discovery via Fuzzy Search

### User Experience

```
Based on user's description, system shows relevant questions:
"Here are some questions to help us find your best rules"

Shows top 5-10 questions with highest matching scores
```

### Purpose

Discover relevant questions that match the user's context.

### Implementation

- System fuzzy searches questions based on context tokens
- Uses same Fuse.js approach as rule search from `search.ts`
- Matches against question `tags` field
- Presents top N relevant questions (e.g., 5-10)
- Only shows questions with non-zero matching score
- All questions shown at once (no progressive flow in v1)

---

## Step 3: Answer Collection and Context Building

### User Experience

```
User sees questions → Answers them one by one

Example questions and answers:
- "Are you using TypeScript?" → YES
- "What CSS approach are you using?" → "Tailwind CSS"
- "Describe your project briefly" → "E-commerce platform"
```

### Purpose

Collect answers and continuously build enriched context for rule discovery.

### Implementation

- User answers questions
- Context is updated based on question type:
  - **Yes/no questions**: If yes, add question's `keywords` to context
  - **Choice questions**: Add selected option's `keywords` to context
  - **Open-ended questions**: Add full answer text to context
- Context continuously enriched with each answer

### Context Building Example

```typescript
// Initial context: ["next.js", "web", "app", "typescript", "tailwind", "css"]

// User answers "Are you using TypeScript?" → YES
// Adds: ["typescript", "ts"]
// New context: ["next.js", "web", "app", "typescript", "tailwind", "css", "ts"]

// User answers "What CSS approach?" → "Tailwind CSS"
// Adds: ["tailwind", "tailwindcss"]
// New context: [...previous..., "tailwindcss"]
```

---

## Step 4: Rule Discovery via Fuzzy Search

### User Experience

```
Shows: "Based on your answers, we recommend:"

List of matched rules with relevance scores
User can review and select/deselect rules
```

### Purpose

Use enriched context to discover and rank relevant rules.

### Implementation

- Final enriched context used to fuzzy search rules
- Uses existing `searchRules()` function from `search.ts`
- Rules ranked by relevance score (0-100)
- User reviews and selects rules
- User can deselect rules they don't want

### Rule Discovery Logic

```typescript
// Enriched context from steps 1-3
const context = [...initialTokens, ...questionKeywords, ...answers]

// Use existing search implementation
const ruleResults = searchRules(context.join(' '), manifests)

// Show top-ranked rules
ruleResults.slice(0, 20) // Top 20 rules
```

---

## Key Implementation Details

### Existing Infrastructure

The system reuses the existing fuzzy search implementation from `src/lib/search.ts`:

- Tokenization with stopword removal
- Fuse.js configuration
- Score calculation and ranking
- Multi-token matching

### Question Filtering

- Questions with no matching score are not displayed
- Only questions that match context tokens are shown
- Reduces noise and improves UX

### Context Management

- Context continuously enriched through the flow
- Single context object accumulates all tokens
- Final context combines: description + question keywords + answer text

---

## User Experience Guidelines

### Clear Instructions

- Explain each step clearly
- Show progress if helpful
- Indicate why certain rules are recommended

### Feedback

- Show which rules are matching as user answers questions
- Display relevance scores
- Explain context building in tooltip/helper text

### Escape Hatch

Allow users to:

- Skip questions and browse all rules manually
- Change previous answers
- View all rules regardless of recommendations

---

## Future Enhancements

Consider for later iterations:

- Multiple rounds of questions based on previous answers
- Progressive disclosure of questions
- Complex conditional logic in questions
- Explainability: show why rules are recommended

---

**End of guided flow exploration. Return to [Problem Definition →](./techstack-identification.md)**
