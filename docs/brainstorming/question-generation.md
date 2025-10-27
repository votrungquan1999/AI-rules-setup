# Question Generation During Rule Authoring

> **Navigation**: [← Back to Question Storage](./question-storage.md) | [Continue to Web UI Flow →](./web-ui-flow.md)

This document explores different approaches for generating questions that help users identify if a rule is relevant to their techstack. Questions are generated **during rule authoring**, not at runtime.

---

## Introduction: Why Generate Questions During Authoring?

Based on our [constraints](./techstack-identification.md#technical-approach-questions), we've determined that:

- Questions must be **pre-generated** (not runtime detected)
- Real-time LLM calls during UI interaction are too expensive
- We need a scalable approach that works as the rule library grows

The solution: Generate questions when rules are created, then store them (see [question storage strategies](./question-storage.md)).

---

## LLM-Assisted Question Generation ✅ **CHOSEN**

### Approach

LLM generates question suggestions during rule authoring with human review:

1. Rule author provides rule content and context
2. LLM generates question suggestions with proper schema
3. Questions written to `suggested_questions/` folder
4. Author reviews and manually moves/edits to `questions/` folder
5. UI reads only from `questions/` folder (author-curated)

### Workflow

```bash
# Author runs generation script manually
npm run generate-questions <rule-id>

# Script:
# 1. Reads rule content from rules/cursor/...
# 2. Calls LLM with context and requirements
# 3. Generates questions with schema (type, text, tags, keywords)
# 4. Writes to suggested_questions/ folder
# 5. Author reviews and moves to questions/ folder
```

### Question Schema Requirements

- **Yes/no questions**: Must have `keywords` array (added to context if yes)
- **Choice questions**: Must have `options` array (selected option added to context)
- **Open-ended questions**: Full answer added to context
- **All questions**: Must have `tags` array for fuzzy search matching

### Local LLM Support

Script supports both remote APIs (OpenAI, Anthropic) and local LLMs:

- **Remote**: OpenAI API, Anthropic API (via config)
- **Local**: Ollama, LM Studio (via config)
- Authors configure their preferred LLM provider

### Pros

- ✅ Scalable to large numbers of rules
- ✅ Consistent quality across authors
- ✅ Semi-automated: LLM generates, author refines
- ✅ One-time cost per rule (during authoring, not runtime)
- ✅ No runtime cost in the web UI
- ✅ High quality questions with less author effort
- ✅ Local LLM support for cost-effective generation

### Cons

- ⚠️ Requires LLM during authoring (acceptable cost - one-time per rule)
- ⚠️ Needs tooling to integrate LLM into author workflow
- ⚠️ Authors must review and refine LLM output

### When to Use

- **Primary solution for production**
- Any scale (works from 10 to 1000+ rules)
- When you want consistent, high-quality questions
- When you want to reduce burden on rule authors

---

## Other Approaches Considered (NOT CHOSEN)

### Manual Question Authoring

Rule authors manually write questions. Not chosen because:

- ❌ Inconsistent quality across different authors
- ❌ Requires effort from authors who may not be trained writers
- ❌ Doesn't scale well with large numbers of rules
- ❌ Human error in creating effective questions
- ❌ Time-consuming for rule authors

### Template-Based Question System

Pre-defined question templates where authors select and customize. Not chosen because:

- ❌ Not flexible enough for complex rule contexts
- ❌ May miss use cases of rules that don't fit standard templates
- ❌ Rigid question structure
- ❌ Limited to what templates cover
- ❌ Can't adapt to unique rule requirements

---

## Recommendation

**Use LLM-Assisted Generation** as the primary solution:

- One-time cost when rule is created (acceptable)
- No runtime cost in UI (meets performance requirements)
- High quality, scalable approach
- Balances automation with author control

Authors can review LLM-generated questions and refine them in the `suggested_questions/` folder before moving to the `questions/` folder, giving the best of both worlds: AI efficiency with human oversight.

---

**For implementation details**, see [Question Generation Implementation →](./question-generation-implementation.md)

**Continue reading:** [Web UI Flow Implementation →](./web-ui-flow.md)
