# API Architecture

This document describes the Next.js API server architecture and data flow.

**Related Documentation:**
- [Database Patterns](./database-patterns.md) - MongoDB operations
- [Rule System](./rule-system.md) - Rule structure and organization
- [Data Types](./data-types.md) - API type definitions

## Overview

The API server provides a caching layer between the CLI/Web UI and GitHub, reducing GitHub API rate limiting and improving performance.

## Caching Strategy

**Three-tier caching system:**

```
1. HTTP Cache (Browser/Client)
   └─ Cache-Control: public, max-age=300 (5 minutes)

2. In-Memory Cache (CLI)
   └─ 5-minute TTL in src/cli/lib/github.ts

3. MongoDB Cache (Server)
   └─ Persistent cache with GitHub fallback
```

## Main API Endpoint

**Endpoint:** `GET /api/rules`

**Location:** `src/app/api/rules/route.ts`

### Response Format

```typescript
{
  agents: {
    [agentName: string]: {
      categories: {
        [categoryName: string]: {
          manifest: Manifest,
          files: Array<{
            filename: string,
            content: string
          }>
        }
      }
    }
  }
}
```

### Response Headers

```
Cache-Control: public, max-age=300
Content-Type: application/json
```

### Error Responses

Returns 500 with error details if fetching fails:

```json
{
  "error": "Failed to fetch rules",
  "message": "Detailed error message"
}
```

## GitHub Fetcher

**Location:** `src/app/api/lib/github-fetcher.ts`

### MongoDB-First Architecture

```
Request → Try MongoDB → [Found] → Return cached data
                      ↓
                   [Not Found]
                      ↓
              Fetch from GitHub
                      ↓
              Cache in MongoDB
                      ↓
                 Return data
```

### Core Functions

#### `fetchRulesData()`

Main entry point that orchestrates the fetch-and-cache process.

```typescript
async function fetchRulesData(): Promise<RulesData>
```

**Flow:**
1. Call `findAllStoredRules()` from database
2. If data exists, return immediately
3. Otherwise, call `fetchFromGitHubAndCache()`
4. Return fetched and cached data

#### `fetchFromGitHubAndCache()`

Fetches from GitHub and stores in MongoDB.

**Process:**
1. **Discover Agents** - `GET /repos/{owner}/repos/contents/rules`
2. **For each agent:**
   - Discover categories (subdirectories)
3. **For each category:**
   - Fetch `manifest.json`
   - Fetch all files listed in manifest
4. **Store in MongoDB** - Upsert by `{agent, category}`
5. **Return aggregated data**

### GitHub API Integration

**Base URLs:**
- Directory listing: `https://api.github.com/repos/votrungquan1999/AI-rules-setup/contents/{path}`
- Raw file content: `https://raw.githubusercontent.com/votrungquan1999/AI-rules-setup/main/{path}`

**Authentication:**
Uses GitHub token if available via `GITHUB_TOKEN` environment variable.

### Error Handling

- Network errors: Throw with descriptive message
- 404 errors: Skip missing files, log warning
- Rate limiting: Respect GitHub rate limit headers
- Parse errors: Log and skip malformed manifests

## Data Transformation

### From GitHub to Storage

```typescript
// GitHub response (per agent/category)
{
  agent: "cursor",
  category: "typescript",
  manifest: { ... },
  files: [
    { filename: "strict-mode.md", content: "..." }
  ],
  githubCommitSha: "abc123"
}
```

### From Storage to API Response

```typescript
// API response structure (nested)
{
  agents: {
    cursor: {
      categories: {
        typescript: {
          manifest: { ... },
          files: [ ... ]
        }
      }
    }
  }
}
```

See [Database Patterns](./database-patterns.md) for storage details.

## Performance Considerations

### Parallel Fetching

GitHub fetcher uses `Promise.all()` to fetch multiple resources in parallel:
- All agents discovered in parallel
- All categories per agent fetched in parallel
- All files per category fetched in parallel

### Memory Management

- Stream large files instead of loading into memory
- Clear references after caching
- Use MongoDB connection pooling (max 10 connections)

### Rate Limiting

- Respects GitHub API rate limits (5000/hour for authenticated)
- Falls back to MongoDB cache when rate limited
- Logs rate limit status in responses
