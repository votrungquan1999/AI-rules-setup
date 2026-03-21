# Key Flows

This document describes the critical flows through the system.

**Related:** [Architecture](./architecture.md) · [Patterns](./patterns.md) · [Overview](./overview.md)

## CLI `init` Flow

**File:** `src/cli/commands/init.ts`

```mermaid
flowchart TD
    Start([ai-rules init]) --> A{--agent flag?}
    A -->|Yes| B[Use specified agent]
    A -->|No| C[Fetch available agents → prompt selection]
    B --> D{--no-categories?}
    C --> D
    D -->|Yes| SK[Skip categories]
    D -->|No| E{--categories flag?}
    E -->|Yes| F[Parse comma-separated IDs]
    E -->|No| G[Fetch manifests → prompt checkbox selection]
    F --> H[Install rules with conflict detection]
    G --> H
    SK --> I{--no-skills?}
    H --> I
    I -->|Yes| J[Skip skills]
    I -->|No| K{--skills flag?}
    K -->|Yes| L[Fetch matching skills]
    K -->|No & TTY| M[Prompt skill selection]
    K -->|No & not TTY| J
    L --> N[Install skills + supporting files]
    M --> N
    J --> O{--no-workflows?}
    N --> O
    O -->|Yes| P[Skip workflows]
    O -->|No| Q{--workflows flag?}
    Q -->|Yes| R[Fetch matching workflows]
    Q -->|No & TTY| S[Prompt workflow selection]
    Q -->|No & not TTY| P
    R --> T[Install workflows to .agents/workflows/]
    S --> T
    P --> U[Save .ai-rules.json]
    T --> U
    U --> End([Done])
```

## CLI `pull` Flow

**File:** `src/cli/commands/pull.ts`

Simpler than `init` — no interactive prompts:

1. Load `.ai-rules.json` config
2. For each category: find manifest → fetch files → write with naming convention
3. For each skill: find skill → write SKILL.md + supporting files
4. For each workflow: find workflow → write to `.agents/workflows/`
5. Report results

Default overwrite strategy is `force` (overwrite all).

## CLI `add` Flow

**File:** `src/cli/commands/add.ts`

Adds content to an already-initialized project (requires existing `.ai-rules.json`):

1. Verify `.ai-rules.json` exists and has agent configured
2. Parse `--categories`, `--skills`, `--workflows` flags
3. Support `all` keyword for any content type
4. Install with conflict detection per overwrite strategy
5. Update and save config

## API Data Fetch Flow

**File:** `src/app/api/lib/rules-data-fetcher.ts`

```mermaid
flowchart TD
    R[fetchAllRulesData] --> DB{MongoDB has data?}
    DB -->|Yes| RET[Return cached data]
    DB -->|No| CP[primeCache]
    CP --> LF[fetchAllRulesDataLocal]
    LF --> |Reads /rules| DR[Discover agents → categories → manifests → files]
    LF --> |Reads /skills| DS[Discover skills with supporting files]
    LF --> |Reads /workflows| DW[Discover workflows]
    DR --> ST[Store in MongoDB]
    DS --> ST
    DW --> ST
    ST --> DB2[findAllStoredRules]
    DB2 --> RET2[Return primed data]
```

## Local Fetcher Discovery Flow

**File:** `src/app/api/lib/local-fetcher.ts`

The local fetcher reads content from the repository's own filesystem:

1. **Discover agents:** List directories in `/rules`
2. **Per agent, discover categories:** List subdirectories in `/rules/{agent}`
3. **Per category:** Parse `manifest.json`, fetch all listed rule files in parallel
4. **Discover skills:** List subdirectories in `/skills/{agent}`, read `SKILL.md` from each, recursively collect supporting files
5. **Discover workflows:** List `.md` files in `/workflows/{agent}` (excluding README.md)

## Web UI Rule Selection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as Server Component
    participant C as Client Components
    participant CTX as Context Providers

    S->>S: fetchAllRulesData() with "use cache"
    S->>CTX: Compose providers (Selection → Manifests → Search)
    U->>C: Select agent
    C->>CTX: dispatch SET_AGENT
    CTX->>C: Re-render with agent's manifests/skills/workflows
    U->>C: Search rules
    C->>CTX: dispatch SET_QUERY
    CTX->>C: Filtered results via Fuse.js
    U->>C: Toggle selections (rules/skills/workflows)
    C->>CTX: dispatch TOGGLE_SELECTION / TOGGLE_SKILL / TOGGLE_WORKFLOW
    CTX->>C: Update sidebar with generated command
    U->>C: Copy CLI command or ChatGPT prompt
```

## Question Generation Flow

**File:** `src/cli/commands/generate-questions.ts`

Uses local Ollama LLM to generate refinement questions:

1. Read all `manifest.json` files from rule categories
2. Build prompt with all categories' tags and descriptions
3. Call Ollama API with structured output schema (Zod v4)
4. Parse response into typed questions (yes-no, choice, open-ended)
5. Write questions to `/questions` directory as JSON

## Skills Installation with Supporting Files

```mermaid
flowchart TD
    SK[Skill from API] --> |name, content| WR1[Write SKILL.md]
    SK --> |supportingFiles?| SF{Has supporting files?}
    SF -->|Yes| WR2[For each file: compute path → write]
    SF -->|No| Done
    WR1 --> Done
    WR2 --> Done
```

Supporting files path: `applySkillFileNamingConvention(agent, skillName, relativePath)` replaces `SKILL.md` suffix with the relative path.
