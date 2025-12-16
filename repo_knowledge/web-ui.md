# Web UI Architecture

This document describes the web UI structure and flows.

**Related Documentation:**
- [Search & Selection](./search-selection.md) - Search and selection state
- [API Architecture](./api-architecture.md) - Data fetching
- [Data Types](./data-types.md) - UI types

## Overview

The web UI provides a visual interface for discovering and selecting rules. It generates CLI commands for users to copy and run, rather than directly installing rules.

## Architecture Pattern

### Server/Client Component Separation

**From `.cursor/rules/client-server-separation.mdc`:**

1. **Server Components** - Handle data fetching, static content, composition
2. **Client Components** - Handle interactivity, state, browser APIs
3. **Composition** - Server passes complete elements as children to client components
4. **Separation** - Don't mix data fetching with interactivity

## Main Pages

### Home Page

**Location:** `src/app/page.tsx`

Simple landing page with link to rule selection interface.

### Select Rules Page

**Location:** `src/app/select-rules/page.tsx`

**Server Component - Data Fetching:**

```typescript
export default async function SelectRulesPage() {
  // Fetch rules from MongoDB (or GitHub fallback)
  const rulesData = await fetchRulesData();

  // Fetch questions from MongoDB
  const questions = await fetchQuestionsData();

  // Extract unique agents and all manifests
  const agents = Object.keys(rulesData.agents);
  const manifests = extractAllManifests(rulesData);

  return (
    <SearchProvider initialManifests={manifests} initialQuestions={questions}>
      <SelectionProvider>
        <SelectRulesPageClient agents={agents} />
      </SelectionProvider>
    </SearchProvider>
  );
}
```

**Client Component - Interactivity:**

```typescript
'use client'

function SelectRulesPageClient({ agents }: { agents: string[] }) {
  const searchResults = useSearchResults();
  const { selectedIds } = useSelectionState();
  const command = useGeneratedCommand();

  return (
    <div className="layout">
      <SearchInput />
      <RulesList results={searchResults} />
      <Sidebar
        agents={agents}
        selectedCount={selectedIds.size}
        command={command}
      />
    </div>
  );
}
```

## Layout Structure

### Three-Column Layout

```
┌─────────────────────────────────────────────────┐
│ Header (Logo, Navigation)                      │
├─────────────────────────────────────────────────┤
│ Search Bar                                      │
├─────────────────┬───────────────────────────────┤
│                 │                               │
│  Rules List     │  Right Sidebar                │
│                 │                               │
│  □ Rule 1       │  Agent Selection              │
│  ☑ Rule 2       │  Selected Rules (2)           │
│  □ Rule 3       │  Strategy Selector            │
│  □ Rule 4       │  Generated Command            │
│  ...            │  Copy Button                  │
│                 │                               │
└─────────────────┴───────────────────────────────┘
```

## Key Components

### SearchInput

**Client Component** - Handles search query input

```typescript
'use client'

function SearchInput() {
  const setDescription = useSetDescription();
  const [localValue, setLocalValue] = useState('');

  // Debounce search to avoid excessive updates
  const debouncedSearch = useDebouncedCallback(
    (value: string) => setDescription(value),
    300
  );

  return (
    <Input
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        debouncedSearch(e.target.value);
      }}
      placeholder="Search rules (e.g., 'nextjs typescript server components')..."
    />
  );
}
```

### RulesList

**Client Component** - Displays search results with checkboxes

```typescript
'use client'

function RulesList({ results }: { results: SearchResult[] }) {
  const toggleSelection = useToggleSelection();
  const { selectedIds } = useSelectionState();

  return (
    <div className="space-y-2">
      {results.map(({ manifest, score }) => (
        <RuleCard
          key={manifest.id}
          manifest={manifest}
          score={score}
          isSelected={selectedIds.has(manifest.id)}
          onToggle={() => toggleSelection(manifest.id)}
        />
      ))}
    </div>
  );
}
```

### RuleCard

**Client Component** - Individual rule display with selection

```typescript
'use client'

function RuleCard({
  manifest,
  score,
  isSelected,
  onToggle
}: {
  manifest: Manifest;
  score: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded p-4">
      <div className="flex items-center gap-2">
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
        <div className="flex-1">
          <h3>{manifest.id}</h3>
          <p className="text-sm text-muted">{manifest.description}</p>
          <div className="flex gap-1 mt-1">
            {manifest.tags.slice(0, 3).map(tag => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
        <Badge variant="outline">{score}% match</Badge>
      </div>
    </div>
  );
}
```

### Sidebar

**Client Component** - Agent selection, strategy, and command display

```typescript
'use client'

function Sidebar({
  agents,
  selectedCount,
  command
}: {
  agents: string[];
  selectedCount: number;
  command: string;
}) {
  const { agent, overwriteStrategy } = useSelectionState();
  const setAgent = useSetAgent();
  const setStrategy = useSetStrategy();

  return (
    <div className="space-y-4">
      <AgentSelector agents={agents} value={agent} onChange={setAgent} />

      <div>
        <p className="text-sm">Selected Rules: {selectedCount}</p>
      </div>

      <StrategySelector value={overwriteStrategy} onChange={setStrategy} />

      <div>
        <Label>Generated Command</Label>
        <pre className="text-xs bg-muted p-2 rounded">{command}</pre>
        <Button onClick={() => navigator.clipboard.writeText(command)}>
          Copy Command
        </Button>
      </div>
    </div>
  );
}
```

## State Management

### Context Providers

Two context providers manage application state:

**SearchProvider** - Manages search query, questions, answers
- See [Search & Selection](./search-selection.md)

**SelectionProvider** - Manages agent, selected rules, strategy
- See [Search & Selection](./search-selection.md)

### Reducer Pattern

Both providers use the reducer pattern from `src/app/hooks/createReducerContext.tsx`:

```typescript
function createReducerContext<TState, TAction>() {
  // Creates context with state, dispatch, and action creators
  return { Provider, useContext, useDispatch, ...actionHooks };
}
```

## Command Generation Flow

```
1. User selects agent (e.g., "cursor")
   ↓
2. User searches and selects rules
   ↓
3. User selects overwrite strategy
   ↓
4. useGeneratedCommand() builds command:
   "npx @quanvo99/ai-rules@latest init --agent cursor --categories typescript,react --overwrite-strategy force"
   ↓
5. User copies command
   ↓
6. User runs command in their project
```

## Question Refinement Flow (Future)

Planned but not fully implemented:

```
1. User enters search query
   ↓
2. System finds relevant questions
   ↓
3. Display questions to user
   ↓
4. User answers questions
   ↓
5. Build enriched context (query + keywords)
   ↓
6. Re-run search with enriched context
   ↓
7. Display refined results
```

## Component Library

Uses **shadcn/ui** components:

- **Button** - Actions and triggers
- **Input** - Text input fields
- **Checkbox** - Rule selection
- **Label** - Form labels
- **Badge** - Tags and scores
- **Select** - Agent and strategy selection
- **Dialog** - Modals (future use)

## Styling

Uses **Tailwind CSS** with utility-first approach:

```tsx
<div className="flex items-center gap-2 p-4 border rounded">
  <Checkbox />
  <span className="text-sm text-muted-foreground">Rule description</span>
</div>
```

**From `.cursor/rules/tailwind-basics.mdc`:**
- Use utility classes for layout and spacing
- Use semantic color tokens (e.g., `text-muted-foreground`)
- Prefer composition over custom CSS

## Performance Optimizations

### Debouncing

Search input is debounced to reduce re-renders:

```typescript
const debouncedSearch = useDebouncedCallback(
  (value: string) => setDescription(value),
  300  // 300ms delay
);
```

### Memoization

Search results are memoized to avoid recalculation:

```typescript
const searchResults = useMemo(
  () => searchRules(enrichedContext.join(' '), manifests),
  [enrichedContext, manifests]
);
```

### Server-Side Rendering

Initial data is fetched on the server and passed as props, avoiding client-side loading states.

## Future Enhancements

From system design docs:

- **Question UI** - Interactive question answering for refinement
- **Preview Panel** - Show rule file contents before selection
- **Direct Installation** - Allow installing rules from web UI
- **User Accounts** - Save preferences and selections
- **Sharing** - Share rule combinations via URL
