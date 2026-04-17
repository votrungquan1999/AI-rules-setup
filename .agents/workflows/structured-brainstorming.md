---
description: Facilitates structured brainstorming using zoom-out-first approach with clarifying questions and iterative thinking. Use when brainstorming solutions, designing systems, or exploring approaches.
---

# Structured Brainstorming Workflow

This workflow provides a structured approach to brainstorming and problem-solving using the zoom-out-first methodology with iterative refinement.

## Core Methodology

1. **Problem Definition** - Clearly state the problem at the top
2. **Clarification First, Always** - Ask questions before generating ANY ideas — never assume
3. **Zoom Out First** - Start with the widest view, then progressively zoom in
4. **Iterate** - Generate multiple alternatives, refine, and build upon ideas
5. **Document Everything** - Write to .md files for context preservation

> **Fundamental Rule: Ask, Don't Assume.**
> When requirements are unclear, scope is ambiguous, or constraints are unstated — **STOP and ask**.
> Wrong assumptions lead to wasted brainstorming. Every assumption that isn't confirmed is a risk.
> The user always knows more about the problem than you do.

---

## Steps

1. **Create a Brainstorming Document**

   Create a document (e.g., `brainstorm-[topic].md`) and include:
   - Clear problem statement at the top
   - Current state and context
   - Constraints and requirements
   - Stakeholders and impact areas

2. **Ask Clarifying Questions** *(mandatory gate — do NOT skip)*

   **MUST ask clarifying questions before generating ideas.** This is a hard gate.

   Ask about **every dimension you're unsure of**:
   - **Scope**: What's in scope? What's explicitly out of scope? Who decides scope boundaries?
   - **Constraints**: Technical, time, resource, budget limitations? Existing systems that must be preserved?
   - **Goals**: What defines success? Whose definition of success counts?
   - **Success Criteria**: How will we measure success? What does "done" look like?
   - **Context**: What's the current situation? What led to this problem? What has already been tried?
   - **Stakeholders**: Who is impacted? Who has decision-making authority?
   - **Assumptions you're tempted to make**: Surface these explicitly and ask the user to confirm or correct them.

   **Do NOT make assumptions to move faster.** A wrong brainstorm wastes more time than asking upfront.

   After asking, **wait for responses before generating ideas**. User can defer some questions to leave room for exploration, but you must acknowledge which questions remain open.

3. **Zoom Out First — Widest View**

   **ALWAYS start with the widest possible view.**

   - View the problem from the largest context
   - Consider the broader system, industry, or domain
   - Identify high-level approaches and alternatives
   - Document tradeoffs, principles, and priorities

4. **Zoom In One Level**

   - Break down chosen high-level approach
   - Generate at least 2-3 alternatives at this layer
   - Document pros/cons for each alternative
   - Review and refine before going deeper

5. **Continue Zooming In**

   - Progressively add implementation details
   - Validate assumptions at each layer
   - Allow for backtracking when needed
   - **Continue this pattern until reaching implementation details**

6. **Document Decisions**

   At each layer:
   - Generate at least 2-3 alternatives
   - Document the reasoning for each
   - Identify which alternative to pursue
   - Note why other alternatives were rejected

7. **Split if Needed**

   - Keep documents 200-300 lines for readability
   - Split into multiple files when exceeding 300 lines
   - Cross-reference with markdown links

---

## Documentation Format

```markdown
# Problem Statement
Clear, concise problem statement

## Context
Current situation, background, what led here

## Constraints
- Technical constraints
- Time/resource constraints
- Business constraints

## Zoom Level 1: [Highest Level View]
### Alternative 1: [Approach Name]
**Pros:**
- ...

**Cons:**
- ...

### Alternative 2: [Approach Name]
...

### Decision: Go with Alternative 1
**Reasoning:** ...

## Zoom Level 2: [One Level Deeper]
[Breaking down Alternative 1]
...
```

---

## Best Practices

- ✅ Ask clarifying questions before generating any ideas
- ✅ Surface your assumptions explicitly and ask the user to confirm or correct them
- ✅ Focus on quantity initially before quality
- ✅ Withhold criticism during idea generation
- ✅ Encourage wild and unconventional ideas
- ✅ Build on previous iterations
- ✅ Use tables for side-by-side comparisons
- ✅ Use mermaid diagrams for complex relationships
- ❌ Don't assume scope — ask if it's unclear
- ❌ Don't start generating ideas before clarifying questions are answered
- ❌ Don't guess at constraints or success criteria — ask

## When NOT to Use

- Quick code fixes (just do them directly)
- Well-defined tasks (use `feature-development` workflow instead)
- Simple questions with clear answers
