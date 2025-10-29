# Techstack Identification Challenge - Brainstorming Document

> **Navigation**: [Problem Definition](#problem-definition) | [Clarification Questions](#clarification-questions) | [Success Criteria](#success-criteria) | [Continue to Core Concept →](./question-based-filtering.md)

---

## Problem Definition

### Problem Statement

How can we programmatically generate context-appropriate questions to identify a developer's techstack and automatically recommend relevant AI agent rules, without requiring manual curation of question trees for every possible technology combination?

### Current State and Context

**What Works Now:**

- ✅ Web UI shows all available rules with search functionality
- ✅ CLI prompts allow manual category selection
- ✅ Rule metadata includes descriptions and tags
- ✅ Basic file-based conflict detection works

**What's Missing:**

- ❌ No automatic techstack detection
- ❌ No intelligent rule recommendations based on project context
- ❌ No programmatic question generation
- ❌ Manual category selection relies on developer knowledge of available rules

**Current User Flow:**

1. Developer runs `ai-rules init`
2. Manually selects relevant rule categories from a list
3. Rules are installed based on selection

**Desired User Flow:**

1. Developer runs `ai-rules init`
2. Tool automatically detects project techstack (or asks minimal questions)
3. Tool recommends specific rules based on detected technologies
4. Developer confirms or refines recommendations
5. Rules are installed

### Constraints and Requirements

**Must Have:**

- Questions must be generated dynamically (not manually curated)
- Solution must scale as rule library grows
- Must work with existing rule metadata structure
- Must provide value beyond simple search

**Should Have:**

- Fast response time (< few seconds)
- Works offline (all questions pre-generated)
- Minimal user interruption
- Seamless web UI experience

**Nice to Have:**

- Integrates with popular project analyzers
- Provides explanations for recommendations

**Constraints:**

- Cannot modify GitHub repository structure significantly
- Must maintain backward compatibility
- Limited to tools available in Node.js ecosystem
- No backend database initially

### Stakeholders and Impact Areas

**Primary Stakeholders:**

- **Developers**: New users adopting the tool for the first time
- **Power Users**: Experienced users wanting faster workflows
- **Maintainers**: Rule authors who want their rules discovered

**Impact Areas:**

- **Developer Experience**: Dramatically improves first-time setup experience
- **Rule Discovery**: Increases adoption of less-known rules
- **Maintenance**: Reduces need to manually maintain question trees
- **Product Viability**: Unblocks progress on Iterations 5-7 (roadmap)

### Success Criteria

**Primary Success Metrics:**

- **Question Relevance**: After user describes their app, questions are relevant and lead to correct rule selection
- **Scalable Generation**: Clear, maintainable process for generating future questions that doesn't require manual curation per rule
- **UX Quality**: Smooth, intuitive web UI flow that feels natural to developers

**Minimal Viable Solution:**

- User describes app → 3-5 relevant questions → accurate rule recommendations
- Question generation process is documented and repeatable for new rules
- Web UI provides clear, logical flow

**Excellent Solution:**

- User describes app → 2-3 highly targeted questions → precise recommendations
- Question generation is semi-automated (LLM-assisted in rule authoring)
- Scalable to 100+ rules without degradation

**Failure Conditions:**

- Questions feel random or irrelevant to user's described app
- No clear process for generating questions at scale
- Requires extensive manual work to add questions for each new rule
- Poor UX in the web UI selection flow

---

## Clarification Questions

Before exploring solutions, we need to clarify several aspects:

### Scope Questions

1. **What types of projects should be prioritized?**

   - [x] Web development (JavaScript/TypeScript) - **ANSWERED: Web projects (frontend and backend)**

2. **Should the solution support monorepos with multiple projects?**

   - [ ] Yes, must detect and recommend rules for each subproject
   - [x] No, focus on single-project detection - **ANSWERED: Single project focus**

3. **What's the acceptable false-positive rate for techstack detection?**

   - [ ] Very low (< 5%) - Better to ask than assume
   - [ ] Moderate (10-20%) - Can refine with questions
   - [x] Higher is OK (20-30%) - User can correct - **ANSWERED: Higher is OK. UX during rule selection is more important than detection accuracy**

### Technical Approach Questions

4. **SLM-based analysis approach?**

   - [x] Static analysis won't work - projects may be just initialized (no files yet) - **NOT VIABLE**
   - [x] LLM-based analysis too expensive - **NOT VIABLE**
   - [ ] Hybrid approach - **NOT VIABLE - no real-time LLM calls**
   - [x] Pre-generated questions stored with rules - **Viable. Can use LLM during rule authoring to generate questions, then store them**

5. **Should question generation use real-time LLM or pre-generated?**

   - [x] Pure real-time LLM - **NOT VIABLE - too expensive**
   - [x] Pre-generated questions, generated when rules are created - **Viable. LLM used during authoring, not runtime**
   - [ ] Pure rule-based templates - **Not scalable, prone to human error**

### Prioritization Questions

6. **What's most important to optimize?**

   - [ ] Accuracy of recommendations
   - [ ] Speed of detection
   - [x] Good UX for the web UI - **ANSWERED: UX first**
   - [x] Scalability to large rule sets - **ANSWERED: Second priority**

---

**Continue reading:** [Core Concept Exploration →](./question-based-filtering.md)
