---
description: Review code changes for quality, correctness, and best practices before merging
---

# Review Changes Workflow

This workflow provides a systematic approach to reviewing code changes, focusing on correctness, security, maintainability, and adherence to project standards.

## Usage

Use this workflow when:

- Reviewing a pull request
- Checking your own changes before committing
- Conducting pre-merge code review
- Validating implementation against requirements

## Steps

1. **Understand Context**:
   - Read PR/commit description
   - Identify the goal of the changes
   - Review related issues or requirements

2. **High-Level Review**:
   - Does the change solve the stated problem?
   - Is the approach reasonable?
   - Are there any obvious alternatives?

3. **Detailed Code Review** - Check for:
   - **Correctness**: Does the code do what it's supposed to?
   - **Security**: Any security vulnerabilities or data exposure?
   - **Edge Cases**: Are edge cases handled?
   - **Error Handling**: Proper error handling and user feedback?
   - **Performance**: Any obvious performance issues?
   - **Testing**: Are tests comprehensive and meaningful?

4. **Code Quality Review** - Check for:
   - **Naming**: Clear, descriptive names for variables/functions?
   - **Structure**: Logical organization and flow?
   - **Duplication**: Any code duplication that should be extracted?
   - **Comments**: Necessary comments for complex logic?
   - **TypeScript**: Proper typing, no `any` types?

5. **Standards Compliance** - Check for:
   - **Style Guide**: Follows project conventions?
   - **Patterns**: Uses established patterns?
   - **Dependencies**: New dependencies justified?
   - **Breaking Changes**: Any breaking changes documented?

6. **Testing Review**:
   - Tests cover main functionality?
   - Tests follow 4 Pillars (Reliability, Validity, Sensitivity, Resilience)?
   - Edge cases tested?
   - Tests actually fail when code is broken?

7. **Create Review Report**:

   ```markdown
   # Code Review Summary

   ## Changes Overview

   [Brief description of changes]

   ## Findings

   ### Critical Issues

   - [Issue 1]

   ### Suggestions

   - [Suggestion 1]

   ### Positive Notes

   - [What was done well]

   ## Recommendation

   ✅ **Approved** / ⚠️ **Approved with comments** / ❌ **Needs changes**
   ```

## Review Checklist

- [ ] Code solves the stated problem
- [ ] No security vulnerabilities
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] Tests comprehensive and meaningful
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Proper TypeScript typing
- [ ] Documentation updated if needed
- [ ] No breaking changes or well-documented

## Notes

- Focus on meaningful feedback, not nitpicks
- Explain the "why" behind suggestions
- Highlight good practices
- Be constructive and specific
- Prioritize issues (critical vs suggestions)
