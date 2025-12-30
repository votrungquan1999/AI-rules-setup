# Claude Code Skills

This directory contains procedural workflow skills for Claude Code. Skills are **model-invoked** workflows that Claude loads dynamically when needed, unlike rules which are always applied.

**Location in Repository**: `/skills/claude-code/` - Skills are organized separately from rules since they serve a different purpose (procedural workflows vs. standards/conventions).

## Rules vs Skills

| Aspect | Rules (`.claude/rules/`) | Skills (`.claude/skills/`) |
|--------|-------------------------|---------------------------|
| **Loading** | Always loaded into every conversation | Loaded dynamically when Claude determines they're needed |
| **Purpose** | Standards, patterns, conventions | Procedural workflows, systematic approaches |
| **Format** | Markdown with optional `paths` frontmatter | Markdown with required `name` and `description` frontmatter |
| **Example** | "Use TypeScript strict mode" | "Follow these steps to implement a feature" |

## Installation

**Using AI Rules CLI (Recommended)**: When you run `ai-rules init` and select Claude Code, all skills are automatically installed to `.claude/skills/` in your project.

**Manual Installation**: If you want to install skills manually, follow the instructions below.

### For Personal Use (All Projects)

Install skills globally in your home directory:

```bash
# Create skills directory structure
mkdir -p ~/.claude/skills/feature-development-workflow
mkdir -p ~/.claude/skills/structured-brainstorming
mkdir -p ~/.claude/skills/test-quality-reviewer

# Copy skill files (from repository)
cp feature-development-workflow.md ~/.claude/skills/feature-development-workflow/SKILL.md
cp structured-brainstorming.md ~/.claude/skills/structured-brainstorming/SKILL.md
cp test-quality-reviewer.md ~/.claude/skills/test-quality-reviewer/SKILL.md
```

Skills in `~/.claude/skills/` will be available to Claude Code across all your projects.

### For Project Use (Single Project)

Install skills in your project directory:

```bash
# Create skills directory structure
mkdir -p .claude/skills/feature-development-workflow
mkdir -p .claude/skills/structured-brainstorming
mkdir -p .claude/skills/test-quality-reviewer

# Copy skill files (from repository)
cp feature-development-workflow.md .claude/skills/feature-development-workflow/SKILL.md
cp structured-brainstorming.md .claude/skills/structured-brainstorming/SKILL.md
cp test-quality-reviewer.md .claude/skills/test-quality-reviewer/SKILL.md
```

Skills in `.claude/skills/` will only be available when working in that project.

## Available Skills

### 1. feature-development-workflow

**Purpose**: Guides feature implementation using incremental development with test-driven approach and progress tracking.

**When Claude Uses It**:
- When you say "implement feature", "build this", or "develop this functionality"
- When starting new development tasks
- When implementing features or building functionality

**What It Does**:
1. **Planning Phase**: Breaks down work into implementable steps with acceptance criteria
2. **Implementation Phase**: For each step:
   - Adds step to progress tracking file
   - Defines test scenarios
   - Writes tests following project guidelines
   - Implements code to pass tests
   - Marks step complete with test results
3. **Progress Tracking**: Maintains `IMPLEMENTATION_PROGRESS.md` with status indicators

**Example Usage**:
```
You: "Implement a user authentication feature with email/password"

Claude will:
1. Create a high-level plan with steps and acceptance criteria
2. Create IMPLEMENTATION_PROGRESS.md for tracking
3. For each step, define tests, implement, verify, and mark complete
4. Update progress file with test results and notes
```

**Output Format**:
```markdown
# Implementation Progress: User Authentication

### Step 1: Create authentication service
**Status**: ✅ Done
**Tests Written (5 tests, all passing ✅)**:
1. ✅ Valid email/password login succeeds
2. ✅ Invalid password returns error
3. ✅ Missing email returns validation error
4. ✅ Password hashing works correctly
5. ✅ JWT token generation succeeds

**Notes**: Implemented auth service with bcrypt hashing and JWT tokens
```

### 2. structured-brainstorming

**Purpose**: Facilitates structured brainstorming using zoom-out-first approach with clarifying questions and iterative thinking.

**When Claude Uses It**:
- When you say "help me think through", "design this", "brainstorm", or "explore options"
- When brainstorming solutions
- When designing systems
- When exploring different approaches

**What It Does**:
1. **Problem Definition**: Creates brainstorming document with clear problem statement
2. **Clarification**: Asks questions about scope, constraints, goals, success criteria
3. **Zoom Out First**: Starts with widest view, progressively zooms in
4. **Iterate**: Generates alternatives at each zoom level, documents tradeoffs
5. **Document**: Writes everything to `.md` files with markdown links

**Example Usage**:
```
You: "Help me design an authentication system for my app"

Claude will:
1. Create brainstorm-authentication.md
2. Ask clarifying questions (OAuth? Sessions? JWT? Scale requirements?)
3. Start at highest level (authentication approaches)
4. Generate alternatives with pros/cons
5. Zoom in progressively to implementation details
6. Keep documents under 300 lines, link between files
```

**Output Format**:
```markdown
# Problem Statement
Design authentication system for web application

## Zoom Level 1: Authentication Approach
### Alternative 1: OAuth 2.0 with Third-Party
**Pros**: Easy to implement, secure, trusted providers
**Cons**: External dependency, less control
**Principles**: Leverage existing secure infrastructure

### Alternative 2: Custom JWT-Based Auth
**Pros**: Full control, no external dependencies
**Cons**: More implementation work, security responsibility
**Principles**: Minimize dependencies, maintain control

### Decision: Go with Alternative 2
**Reasoning**: App requires offline capability and full data control
```

### 3. test-quality-reviewer

**Purpose**: Reviews test code quality using the 4 Pillars framework (Reliability, Validity, Sensitivity, Resilience).

**When Claude Uses It**:
- When you say "review these tests", "check test quality", or "analyze test coverage"
- When reviewing tests
- When analyzing test quality
- When checking test coverage

**What It Does**:
1. **Finds Test Files**: Uses Glob to locate `*.test.ts`, `*.spec.ts` files
2. **Reads Tests**: Uses Read to analyze test content
3. **Applies 4 Pillars**:
   - **Reliability**: Will tests give consistent results?
   - **Validity**: Do tests actually prove correctness?
   - **Sensitivity**: Will tests fail if bugs are introduced?
   - **Resilience**: Will tests survive legitimate refactoring?
4. **Provides Feedback**: Specific issues with line numbers, recommendations, priority fixes

**Example Usage**:
```
You: "Review the tests in src/auth/"

Claude will:
1. Find all test files in src/auth/
2. Read and analyze each test file
3. Evaluate against 4 Pillars framework
4. Provide detailed analysis with specific issues and recommendations
```

**Output Format**:
```markdown
## Test File: auth.service.test.ts

### Overall Assessment
- **Test Type**: Unit
- **Total Tests**: 12
- **Quality Score**: Good

### Pillar Analysis

#### ⚡ Reliability: Issues Found
- Line 45: Hardcoded timeout `setTimeout(2000)` - use `waitFor()` instead

#### ✓ Validity: Pass
All assertions execute unconditionally, edge cases covered

#### 🎯 Sensitivity: Issues Found
- Line 78: Using implementation constant `ERROR_MESSAGES.INVALID`
  - **Recommendation**: Use static literal "Invalid input provided"

#### 🛡️ Resilience: Pass
Tests focus on public API, avoid testing internal state

### Specific Issues
1. **"should handle login timeout"** (Line 45)
   - **Issue**: Hardcoded 2000ms timeout causes flaky tests
   - **Pillar Violated**: Reliability
   - **Recommendation**: Replace with `await waitFor(() => expect(...), {timeout: 5000})`
```

**Important Notes**:
- This skill has restricted tool access: `Read, Grep, Glob` only
- Different test types have different pillar priorities:
  - Unit tests: High sensitivity, moderate resilience (may test implementation)
  - Integration tests: High sensitivity, high resilience
  - E2E tests: Moderate sensitivity, critical resilience (test behavior only)

## Skill Structure

### In Repository
Skills are stored as flat `.md` files in the repository:

```
skills/claude-code/
├── feature-development-workflow.md
├── structured-brainstorming.md
├── test-quality-reviewer.md
└── README.md
```

### After Installation
When installed via CLI, skills are converted to the directory structure Claude expects:

```
.claude/skills/
├── feature-development-workflow/
│   └── SKILL.md
├── structured-brainstorming/
│   └── SKILL.md
└── test-quality-reviewer/
    └── SKILL.md
```

**SKILL.md frontmatter**:
```yaml
---
name: skill-name
description: Brief description with trigger phrases
allowed-tools: Read, Grep, Glob  # Optional: restrict tool access
---
```

## Creating Custom Skills

To create your own skill:

1. **Create directory**: `mkdir -p .claude/skills/your-skill-name`
2. **Create SKILL.md** with frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: When to use this skill with trigger phrases
   allowed-tools: Read, Write  # Optional
   ---

   # Your Skill Name

   [Procedural instructions go here]
   ```
3. **Write instructions** as step-by-step procedures
4. **Include trigger phrases** in description so Claude knows when to invoke

## Best Practices

### When to Create a Skill vs Rule

**Create a Skill when**:
- You have a multi-step procedure or workflow
- The content should only apply in specific contexts
- You want Claude to follow a systematic approach
- Examples: "how to implement features", "brainstorming methodology"

**Create a Rule when**:
- You have a standard or convention that always applies
- You want to define code quality patterns
- You have architectural principles
- Examples: "use TypeScript strict mode", "components should be under 300 lines"

### Skill Writing Tips

1. **Be Procedural**: Write clear step-by-step instructions
2. **Use Examples**: Show expected input/output formats
3. **Include Trigger Phrases**: Help Claude know when to invoke
4. **Keep Focused**: Each skill should do one thing well
5. **Document Tools**: If restricting tools, explain why in the skill

## Resources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skills Directory Mechanics](https://claudefa.st/blog/guide/mechanics/skills-directory)
- [Rules vs Skills Guide](https://claudefa.st/blog/guide/rules-vs-skills)

## Contributing

When adding new skills to this repository:

1. Follow the skill structure above
2. Include comprehensive documentation in SKILL.md
3. Add clear trigger phrases in description
4. Update this README with skill documentation
5. Test that Claude invokes the skill appropriately
