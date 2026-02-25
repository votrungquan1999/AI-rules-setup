---
name: bdd-design
description: >
  Guides Behavior-Driven Development design using Given/When/Then scenarios with test-first
  approach. Use when writing behavior specifications, acceptance tests, feature-level
  tests, or when user says "use BDD", "behavior-driven", "write scenarios first",
  "Given When Then", or "acceptance criteria tests".
---

# BDD Design

Behavior-Driven Development: define behavior through scenarios first, then implement to make them pass.

## Core Principles

1. **Scenarios First** - Write Given/When/Then scenarios before any implementation
2. **One Scenario at a Time** - Write one scenario → run to see it fail → implement → pass → next
3. **User Behavior Focus** - Scenarios describe what the user/system does, not how it's coded
4. **Living Documentation** - Scenarios serve as both tests and documentation
5. **Ubiquitous Language** - Use domain language that stakeholders understand

---

## Phase 1: Define Feature and Scenarios

### Step 1: Describe the Feature

Write a feature description that captures the business value:

```gherkin
Feature: [Feature Name]
  As a [role/persona]
  I want [capability]
  So that [business value]
```

### Step 2: Write Scenarios

Write scenarios using Given/When/Then format:

```gherkin
Scenario: [Descriptive scenario name]
  Given [initial context/precondition]
  And [additional context if needed]
  When [action/event occurs]
  And [additional action if needed]
  Then [expected outcome]
  And [additional expected outcome]
```

**Guidelines for good scenarios:**
- Each scenario tests ONE specific behavior
- Scenario names should be descriptive and readable
- Use concrete examples, not abstract descriptions
- Cover happy path first, then edge cases and error cases

### Step 3: Review Scenarios Before Implementation

**MUST pause and verify scenarios are complete:**
- Happy path covered?
- Key edge cases identified?
- Error/failure scenarios included?
- Scenarios use domain language, not implementation language?

---

## Phase 2: Implement Scenarios (Test-First)

**For EACH scenario, follow this process:**

### Red: Write Failing Test

1. Write the test for ONE scenario
2. Use the Given/When/Then structure in your test:
   ```typescript
   describe("Feature: [name]", () => {
     describe("Scenario: [name]", () => {
       it("should [expected behavior]", async () => {
         // Given
         const context = setupContext();
         
         // When
         const result = performAction(context);
         
         // Then
         expect(result).toEqual(expectedOutcome);
       });
     });
   });
   ```
3. **MUST run the test** to verify it fails (not a syntax error, a genuine failure)

### Green: Make It Pass

1. Write the **minimum code** needed to make this ONE scenario pass
2. Focus on correctness, not elegance
3. Run the test to verify it passes
4. Run all previous scenarios to ensure nothing broke

### Refactor (Optional)

1. Only after the scenario passes
2. Improve code structure without changing behavior
3. Run all tests again to verify nothing broke

### Repeat

Continue the Red-Green-Refactor cycle for each remaining scenario.

---

## Phase 3: Verify Complete Behavior

After all scenarios pass:

1. Run the full test suite
2. Review scenarios as living documentation — do they clearly describe the feature?
3. Run linting
4. Verify all acceptance criteria are covered by scenarios

---

## Scenario Patterns

### Happy Path
```gherkin
Scenario: User successfully creates an account
  Given I am on the registration page
  When I fill in valid registration details
  Then my account is created
  And I am redirected to the dashboard
```

### Edge Case
```gherkin
Scenario: User tries to register with existing email
  Given a user with email "test@example.com" already exists
  When I try to register with email "test@example.com"
  Then I see an error "Email already registered"
  And no new account is created
```

### Error Handling
```gherkin
Scenario: User submits form with missing required fields
  Given I am on the registration page
  When I submit the form without filling in the email
  Then I see a validation error for the email field
  And the form is not submitted
```

### Data-Driven (Scenario Outline)
```gherkin
Scenario Outline: Validate password strength
  When I enter password "<password>"
  Then the strength indicator shows "<strength>"
  
  Examples:
    | password    | strength |
    | abc         | weak     |
    | abc123      | medium   |
    | Abc123!@#   | strong   |
```

---

## Best Practices

- ✅ Write scenarios in domain language, not code language
- ✅ One scenario = one behavior = one test
- ✅ Run tests after every implementation step
- ✅ Keep scenarios independent — no test ordering dependencies
- ✅ Use descriptive scenario names that read like sentences
- ❌ Don't write implementation-specific scenarios ("When the database query returns...")
- ❌ Don't write multiple scenarios before implementing any
- ❌ Don't skip the failing test step — always verify red before green

---

## BDD vs TDD: When to Use Which

| Aspect | BDD | TDD |
|--------|-----|-----|
| **Focus** | User behavior & acceptance criteria | Code units & implementation |
| **Language** | Domain/business language | Technical/code language |
| **Scope** | Feature-level, integration, E2E | Function-level, unit |
| **Best for** | User-facing features, API contracts | Algorithms, utilities, business logic |

**Use BDD when:** Implementing user stories, defining API behavior, writing acceptance tests.
**Use TDD when:** Implementing internal logic, algorithms, utilities, data transformations.
**Use both together:** BDD for outer loop (feature behavior), TDD for inner loop (implementation details).

## Related Skills

- `@tdd-design` - Use for inner-loop unit-level testing alongside BDD
- `@test-quality-reviewer` - Review BDD test quality using the 4 Pillars framework
- `@code-refactoring` - Refactor implementation code after scenarios pass
