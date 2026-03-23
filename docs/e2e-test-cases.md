# Playwright E2E Test Cases

End-to-end test cases for the AI Rules Setup web UI, organized as user flow scenarios following BDD style.

## Prerequisites

- Dev server running (`npm run dev:api`)
- Database seeded with test fixtures
- Base URL: `http://localhost:3000`

---

## Feature: First-Time User Sets Up AI Agent Rules

**As a** developer new to AI Rules
**I want** to browse and select rules for my AI agent
**So that** I can generate a CLI command to install them in my project

### Scenario: User discovers the tool, selects an agent, picks items, and generates a CLI command

1. **Setup**: User lands on the home page (`/`)
2. User sees "Open Rule Selector →" and clicks it
3. User is navigated to `/select-rules` and sees agent selection cards (Antigravity, Claude Code, Cursor) — no content tabs visible yet
4. User clicks the "Antigravity" card
5. Agent cards disappear; content area appears with Skills (active by default), Workflows, and Rules tabs showing correct item counts
6. User checks a skill checkbox (e.g., `tdd-design`) — sidebar shows the skill under "Skills" heading, selected count is 1
7. User switches to Workflows tab and checks a workflow — sidebar adds it under "Workflows" heading, count is 2
8. User switches to Rules tab and checks a rule — sidebar adds it under "Rules" heading, count is 3
9. Sidebar "Generated Command" section shows a valid `npx ai-rules init --agent antigravity ...` command with all selected items
10. User clicks the copy button on the command — command is copied to clipboard

---

## Feature: User Applies a Preset and Tweaks Selections

**As a** developer who knows their tech stack
**I want** to apply a preset that auto-selects relevant items and then fine-tune
**So that** I can quickly get started without manually picking each item

### Scenario: User applies a preset, switches to another, then makes manual adjustments

1. **Setup**: User has selected Antigravity agent and sees the "Not sure where to start?" banner
2. User clicks the preset dropdown ("Choose a preset…") and selects "Next.js Fullstack"
3. Dropdown label updates to show "Next.js Fullstack"; relevant skills, workflows, and rules are auto-checked; sidebar reflects all selected items; CLI command is generated
4. User opens the preset dropdown again and selects "React Client"
5. Selections update to match the new preset only (not a union of both); sidebar and command update accordingly
6. User unchecks one skill from the Skills tab and checks an additional rule from the Rules tab
7. Sidebar and CLI command reflect the manual adjustments on top of the preset

---

## Feature: User Manages Selections via Sidebar

**As a** developer reviewing my selections
**I want** to remove items or clear sections from the sidebar
**So that** I can fine-tune what gets installed without switching tabs

### Scenario: User removes items individually, clears a section, then clears everything

1. **Setup**: User has selected Antigravity agent with multiple skills, a workflow, and a rule checked
2. User clicks the ✕ button next to one skill in the sidebar — that skill is removed, its checkbox becomes unchecked, count decreases
3. User clicks "Clear Skills" in the sidebar — all remaining skills are deselected; workflows and rules remain selected; command updates
4. User clicks "Clear All" — sidebar shows "No items selected yet."; all checkboxes unchecked; command shows "Select rules to generate a command."

---

## Feature: User Switches Between Agents

**As a** developer who uses multiple AI agents
**I want** to switch agents and see relevant content for each
**So that** I can set up rules for each agent separately

### Scenario: User switches agents and sees content update accordingly

1. **Setup**: User has selected Antigravity agent with several items checked; three tabs visible (Skills, Workflows, Rules)
2. User changes the AI Agent dropdown to "cursor"
3. All previous selections are cleared; tabs update to show only Rules (Cursor has no skills/workflows); sidebar shows "No items selected yet."
4. User changes the AI Agent dropdown to "claude-code"
5. Tabs update to show Skills and Rules (no Workflows); sidebar still empty; user can now select Claude Code-specific items

---

## Feature: User Customizes Conflict Resolution Strategy

**As a** developer ready to install rules
**I want** to choose how file conflicts are handled
**So that** I don't accidentally overwrite existing configuration

### Scenario: User changes the conflict strategy and verifies the CLI command updates

1. **Setup**: User has selected an agent and picked some items; generated command shows default strategy ("prompt")
2. User selects "Force overwrite" in the Conflict Resolution section
3. Generated CLI command updates to include `--overwrite-strategy force`
4. User switches to "Skip existing"
5. Command updates to include `--overwrite-strategy skip`

---

## Feature: User Copies ChatGPT Prompt for Recommendations

**As a** developer unsure which rules to pick
**I want** to copy a ChatGPT prompt
**So that** I can get AI-powered recommendations for my project

### Scenario: User copies the prompt from the getting started banner

1. **Setup**: User has selected an agent and sees the "Not sure where to start?" banner with "Ask ChatGPT" section
2. User clicks "Copy Prompt"
3. Button text changes to "Copied!"; clipboard contains the generated prompt text

---

## Feature: User Selects All Items in a Category

**As a** developer who wants everything available
**I want** to select all items in one click
**So that** the CLI command uses the "all" shorthand for efficiency

### Scenario: User selects all skills and sees the "all" shorthand, then deselects

1. **Setup**: User has selected Antigravity agent, Skills tab is active
2. User clicks "Select All" — all skill checkboxes are checked; generated command includes `--skills all`
3. User clicks "Select All" again — all skill checkboxes are unchecked; skills section disappears from sidebar

---

## Feature: Edge Cases and Resilience

### Scenario: Page loads and auto-primes from filesystem when database is empty

1. **Setup**: Database is cleared
2. User navigates to `/select-rules`
3. Agent cards render normally (data auto-primes from local filesystem)

### Scenario: User rapidly switches agents without errors

1. **Setup**: User is on the content view
2. User quickly switches agents multiple times via the dropdown
3. UI settles on the last-selected agent with correct content; no console errors
